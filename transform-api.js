const fs = require('fs');

const path = 'apps/frontend/src/app/core/services/api/backend-api.service.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Add BaseResponse interface
const baseResponseInterface = `
export interface BaseResponse<T> {
  id: string;
  result: T;
  duration: number;
}
`;

if (!content.includes('BaseResponse')) {
  content = content.replace(/(import .* from '@angular\/core';)/, `$1\n${baseResponseInterface}`);
}

// 2. Add map to rxjs/operators imports
if (!content.includes('map,') && !content.includes(', map') && !content.match(/import \{.*map.*\} from 'rxjs\/operators'/)) {
  content = content.replace(/import \{ ([^}]+) \} from 'rxjs\/operators';/, "import { $1, map } from 'rxjs/operators';");
}
if (!content.includes('map') && !content.match(/import \{.*map.*\} from 'rxjs\/operators'/)) {
    content = content.replace(/import \{ ([^}]+) \} from 'rxjs\/operators';/, "import { $1, map } from 'rxjs/operators';");
}

// Helper to replace this.http.xxx<T>(...) with BaseResponse and map
// It's tricky with regex because of nested parenthesis. I'll just write targeted replacements for each method.

const replacements = [
  {
    from: /return this\.http\s*\.post\(\`\$\{ENV\.BACKEND_URL\}\/api\/v1\/auth\/login\`, credentials, \{\s*\.\.\.skipSpinnerOptions\(\),\s*\}\)\s*\.pipe\(\s*tap\(\(response: any\) => \{/g,
    to: `return this.http\n      .post<BaseResponse<any>>(\`\${ENV.BACKEND_URL}/api/v1/auth/login\`, credentials, {\n        ...skipSpinnerOptions(),\n      })\n      .pipe(\n        map(res => res.result),\n        tap((response: any) => {`
  },
  {
    from: /this\.http\s*\.post\(\s*\`\$\{ENV\.BACKEND_URL\}\/api\/v1\/auth\/logout\`,/,
    to: `this.http\n        .post<BaseResponse<any>>(\n          \`\${ENV.BACKEND_URL}/api/v1/auth/logout\`,`
  },
  {
    from: /this\.http\s*\.get\(\`\$\{ENV\.BACKEND_URL\}\/api\/v1\/auth\/check\`,/g,
    to: `this.http\n        .get<BaseResponse<any>>(\`\${ENV.BACKEND_URL}/api/v1/auth/check\`, `
  },
  {
    from: /return this\.http\s*\.get<UserProfile>\(\`\$\{ENV\.BACKEND_URL\}\/api\/v1\/users\/me\`, \{\s*\.\.\.this\.useAuth\(\),\s*\.\.\.skipSpinnerOptions\(\),\s*\}\)\s*\.pipe\(\s*map\(\(user\)/g,
    to: `return this.http\n      .get<BaseResponse<UserProfile>>(\`\${ENV.BACKEND_URL}/api/v1/users/me\`, {\n        ...this.useAuth(),\n        ...skipSpinnerOptions(),\n      })\n      .pipe(\n        map((res) => res.result),\n        map((user)`
  },
  {
    from: /return this\.http\.post\(\`\$\{ENV\.BACKEND_URL\}\/api\/v1\/auth\/sign-up\`, data, \{\s*\.\.\.skipSpinnerOptions\(\),\s*\}\);/g,
    to: `return this.http.post<BaseResponse<any>>(\`\${ENV.BACKEND_URL}/api/v1/auth/sign-up\`, data, {\n      ...skipSpinnerOptions(),\n    }).pipe(map(res => res.result));`
  },
  {
    from: /return this\.http\.post\(\s*\`\$\{ENV\.BACKEND_URL\}\/api\/v1\/auth\/reset-password\`,/,
    to: `return this.http.post<BaseResponse<any>>(\n      \`\${ENV.BACKEND_URL}/api/v1/auth/reset-password\`, `
  },
  {
    from: /this\.useAuth\(\), \.\.\.skipSpinnerOptions\(\) \},\s*\);/g,
    to: `this.useAuth(), ...skipSpinnerOptions() },\n    ).pipe(map(res => res.result));`
  },
  {
    from: /return this\.http\.patch\(\`\$\{ENV\.BACKEND_URL\}\/api\/v1\/users\`, data, \{\s*\.\.\.this\.useAuth\(\),\s*\.\.\.skipSpinnerOptions\(\),\s*\}\);/g,
    to: `return this.http.patch<BaseResponse<any>>(\`\${ENV.BACKEND_URL}/api/v1/users\`, data, {\n      ...this.useAuth(),\n      ...skipSpinnerOptions(),\n    }).pipe(map(res => res.result));`
  },
  {
    from: /return this\.http\.get\(\`\$\{ENV\.BACKEND_URL\}\/api\/v1\/settings\`, \{\s*\.\.\.this\.useAuth\(\),\s*\.\.\.skipSpinnerOptions\(\),\s*\}\);/g,
    to: `return this.http.get<BaseResponse<any>>(\`\${ENV.BACKEND_URL}/api/v1/settings\`, {\n      ...this.useAuth(),\n      ...skipSpinnerOptions(),\n    }).pipe(map(res => res.result));`
  },
  {
    from: /return this\.http\.patch\(\`\$\{ENV\.BACKEND_URL\}\/api\/v1\/settings\`, config, \{\s*\.\.\.this\.useAuth\(\),\s*\.\.\.skipSpinnerOptions\(\),\s*\}\);/g,
    to: `return this.http.patch<BaseResponse<any>>(\`\${ENV.BACKEND_URL}/api/v1/settings\`, config, {\n      ...this.useAuth(),\n      ...skipSpinnerOptions(),\n    }).pipe(map(res => res.result));`
  },
  {
    from: /return this\.http\.post\(\s*\`\$\{ENV\.BACKEND_URL\}\/api\/v1\/binance-credentials\/check\`,/g,
    to: `return this.http.post<BaseResponse<any>>(\n      \`\${ENV.BACKEND_URL}/api/v1/binance-credentials/check\`,`
  },
  {
    from: /return this\.http\.post<\{ token: string \}>\(\s*\`\$\{ENV\.BACKEND_URL\}\/api\/v1\/binance-credentials\/save\`,/g,
    to: `return this.http.post<BaseResponse<{ token: string }>>(\n      \`\${ENV.BACKEND_URL}/api/v1/binance-credentials/save\`,`
  },
  {
    from: /return this\.http\.post\(\s*\`\$\{ENV\.BACKEND_URL\}\/api\/v1\/binance-credentials\/check-token\`,/g,
    to: `return this.http.post<BaseResponse<any>>(\n      \`\${ENV.BACKEND_URL}/api/v1/binance-credentials/check-token\`,`
  },
  {
    from: /return this\.http\.get<TokenSuggestionDto\[\]>\(\s*\`\$\{ENV\.BACKEND_URL\}\/api\/v1\/suggestions\/futures\?limit=\$\{limit\}\`,/g,
    to: `return this.http.get<BaseResponse<TokenSuggestionDto[]>>(\n      \`\${ENV.BACKEND_URL}/api/v1/suggestions/futures?limit=\${limit}\`,`
  },
  {
    from: /return this\.http\.get<any>\(\s*\`\$\{ENV\.BACKEND_URL\}\/api\/v1\/suggestions\/ai-check\?symbol=\$\{symbol\}&timeFrame=\$\{timeFrame\}\`,/g,
    to: `return this.http.get<BaseResponse<any>>(\n      \`\${ENV.BACKEND_URL}/api/v1/suggestions/ai-check?symbol=\${symbol}&timeFrame=\${timeFrame}\`,`
  },
  {
    from: /return this\.http\.post<\{ ok: boolean; balance: number \}>\(\s*\`\$\{ENV\.BACKEND_URL\}\/api\/v1\/binance-credentials\/futures\/balance\`,\s*\{\s*\.\.\.this\.useAuth\(true\)\s*\},/g,
    to: `return this.http.post<BaseResponse<{ ok: boolean; balance: number }>>(\n      \`\${ENV.BACKEND_URL}/api/v1/binance-credentials/futures/balance\`,\n      { ...this.useAuth(true) },`
  },
  {
    from: /\{ \.\.\.this\.useAuth\(true\) \},\s*\);/g,
    to: `{ ...this.useAuth(true) },\n    ).pipe(map(res => res.result));`
  },
  {
    from: /return this\.http\.post<SuggestionPositionResponseDto>\(\s*\`\$\{ENV\.BACKEND_URL\}\/api\/v1\/suggestions\/position\`,\s*payload,/g,
    to: `return this.http.post<BaseResponse<SuggestionPositionResponseDto>>(\n      \`\${ENV.BACKEND_URL}/api/v1/suggestions/position\`,\n      payload,`
  },
  {
    from: /return this\.http\.post<any>\(\s*\`\$\{ENV\.BACKEND_URL\}\/api\/v1\/binance-credentials\/place-position\`,\s*setup,/g,
    to: `return this.http.post<BaseResponse<any>>(\n      \`\${ENV.BACKEND_URL}/api/v1/binance-credentials/place-position\`,\n      setup,`
  },
  {
    from: /return this\.http\.get<FollowedSymbolDto\[\]>\(\s*\`\$\{ENV\.BACKEND_URL\}\/api\/v1\/followed-symbols\`,/g,
    to: `return this.http.get<BaseResponse<FollowedSymbolDto[]>>(\n      \`\${ENV.BACKEND_URL}/api/v1/followed-symbols\`,`
  },
  {
    from: /\{ \.\.\.this\.useAuth\(\) \},\s*\);/g,
    to: `{ ...this.useAuth() },\n    ).pipe(map(res => res.result));`
  },
  {
    from: /return this\.http\.post<FollowedSymbolDto>\(\s*\`\$\{ENV\.BACKEND_URL\}\/api\/v1\/followed-symbols\`,/g,
    to: `return this.http.post<BaseResponse<FollowedSymbolDto>>(\n      \`\${ENV.BACKEND_URL}/api/v1/followed-symbols\`,`
  },
  {
    from: /return this\.http\.delete<void>\(\s*\`\$\{ENV\.BACKEND_URL\}\/api\/v1\/followed-symbols\/\$\{id\}\`,/g,
    to: `return this.http.delete<BaseResponse<void>>(\n      \`\${ENV.BACKEND_URL}/api/v1/followed-symbols/\${id}\`,`
  },
  {
    from: /return this\.http\.get<TokenSuggestionDto\[\]>\(\s*\`\$\{ENV\.BACKEND_URL\}\/api\/v1\/followed-symbols\/data\`,/g,
    to: `return this.http.get<BaseResponse<TokenSuggestionDto[]>>(\n      \`\${ENV.BACKEND_URL}/api/v1/followed-symbols/data\`,`
  },
  {
    from: /return this\.http\.patch<void>\(\s*\`\$\{ENV\.BACKEND_URL\}\/api\/v1\/followed-symbols\/reorder\`,/g,
    to: `return this.http.patch<BaseResponse<void>>(\n      \`\${ENV.BACKEND_URL}/api/v1/followed-symbols/reorder\`,`
  }
];

replacements.forEach(r => {
  content = content.replace(r.from, r.to);
});

fs.writeFileSync(path, content, 'utf8');
