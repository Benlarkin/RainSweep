import type { RequestBase, ResponseOf } from '../RequestBase'

export interface IHandler<TRequest extends RequestBase> {
  handle(request: TRequest): Promise<ResponseOf<TRequest>>
}
