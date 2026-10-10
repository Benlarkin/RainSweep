import type { RequestBase, ResponseOf } from '@/common/RequestBase'
import { HandlerResolver } from '@/common/resolver/HandlerResolver'
import type { ISubscriptionAccessor } from './ISubscriptionAccessor'

export class SubscriptionAccessor implements ISubscriptionAccessor {
  constructor(private readonly unsubscribeResolver: HandlerResolver) {}

  async unsubscribe<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>> {
    return this.unsubscribeResolver.resolve(request)
  }
}
