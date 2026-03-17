import type { HttpService } from '@nestjs/axios';
import type { Observable } from 'rxjs';

export type HttpPostReturn = ReturnType<HttpService['post']>;

export function asHttpPostReturn<T>(obs: Observable<T>): HttpPostReturn {
  return obs as HttpPostReturn;
}
