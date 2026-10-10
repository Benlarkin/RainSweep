import type { RequestBase, ResponseOf } from '@/common/RequestBase'

/** Where the signed-in session lives (an encrypted cookie today; a database tomorrow). */
export interface ISessionAccessor {
  load<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>>
  store<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>>
  remove<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>>
}
