import * as crypto from 'crypto';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { IGNORE_LOG_KEY, IgnoreLogOptions } from '../decorators/ignore-log.decorator';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body } = req;
    
    const ignoreOptions = this.reflector.getAllAndOverride<IgnoreLogOptions>(
      IGNORE_LOG_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (ignoreOptions?.ignoreLog) {
      return next.handle();
    }

    // Ensure id and startTime exist
    if (!req.id) req.id = crypto.randomUUID();
    if (!req.startTime) req.startTime = Date.now();

    const id = req.id;
    
    const bodyLog = ignoreOptions?.ignoreBody ? '** ignored **' : JSON.stringify(body || {});

    this.logger.log(`HTTP » Start ${id} » path: '${url}' » method: '${method}' input: ${bodyLog}`);

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - req.startTime;
        this.logger.log(`HTTP » End ${id} » method: '${method}' » after: '${durationMs}ms'`);
      }),
      catchError((err) => {
        const durationMs = Date.now() - req.startTime;
        this.logger.error(`HTTP » Error ${id} » method: '${method}' » after: '${durationMs}ms' » input: ${JSON.stringify(err)}`);
        return throwError(() => err);
      }),
    );
  }
}
