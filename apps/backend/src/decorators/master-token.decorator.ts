import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const MasterToken = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const authHeader = request.headers['x-master-token'];
    if (authHeader) {
      return authHeader;
    }
    return null;
  },
);
