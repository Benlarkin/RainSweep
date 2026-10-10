import type { RequestBase, ResponseOf } from '@/common/RequestBase'
import { HandlerResolver } from '@/common/resolver/HandlerResolver'
import type { IIdentityAccessor } from './IIdentityAccessor'

export class IdentityAccessor implements IIdentityAccessor {
  constructor(
    private readonly authorizeResolver: HandlerResolver,
    private readonly revokeResolver: HandlerResolver,
  ) {}

  async authorize<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>> {
    return this.authorizeResolver.resolve(request)
  }

  async revoke<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>> {
    return this.revokeResolver.resolve(request)
  }
}
