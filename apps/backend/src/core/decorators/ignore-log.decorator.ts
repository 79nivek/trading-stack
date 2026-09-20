import { SetMetadata } from '@nestjs/common';

export interface IgnoreLogOptions {
  ignoreLog?: boolean;
  ignoreBody?: boolean;
}

export const IGNORE_LOG_KEY = 'ignoreLog';

export const IgnoreLog = (options?: IgnoreLogOptions) => {
  // If no options provided, default to completely ignoring log
  const metadataValue = options ?? { ignoreLog: true };
  return SetMetadata(IGNORE_LOG_KEY, metadataValue);
};
