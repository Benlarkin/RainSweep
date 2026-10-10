import type { RequestBase, ResponseOf } from '@/common/RequestBase'

export interface IGroupingEngine {
  evaluate<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>>
}
