import type { RequestBase, ResponseOf } from '@/common/RequestBase'

export interface ICleanupManager {
  execute<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>>
  query<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>>
}
