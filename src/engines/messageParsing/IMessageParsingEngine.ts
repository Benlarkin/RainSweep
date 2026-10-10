import type { RequestBase, ResponseOf } from '@/common/RequestBase'

export interface IMessageParsingEngine {
  evaluate<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>>
}
