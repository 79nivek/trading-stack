import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as crypto from 'crypto';

export interface Response<T> {
  id: string;
  duration: number;
  result: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const req = context.switchToHttp().getRequest();
    
    // Create id and startTime if not already set
    if (!req.id) {
      req.id = crypto.randomUUID();
    }
    if (!req.startTime) {
      req.startTime = Date.now();
    }

    return next.handle().pipe(
      map((result) => {
        const duration = Date.now() - req.startTime;
        return {
          id: req.id,
          duration,
          result,
        };
      }),
    );
  }
}
