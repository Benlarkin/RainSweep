import type { RequestBase, ResponseOf } from '@/common/RequestBase'

export interface ICompositionEngine {
  evaluate<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>>
}
