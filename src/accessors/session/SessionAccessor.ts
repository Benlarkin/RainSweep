import type { RequestBase, ResponseOf } from '@/common/RequestBase'
import { HandlerResolver } from '@/common/resolver/HandlerResolver'
import type { ISessionAccessor } from './ISessionAccessor'

export class SessionAccessor implements ISessionAccessor {
  constructor(
    private readonly loadResolver: HandlerResolver,
    private readonly storeResolver: HandlerResolver,
    private readonly removeResolver: HandlerResolver,
  ) {}

  async load<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>> {
    return this.loadResolver.resolve(request)
  }

  async store<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>> {
    return this.storeResolver.resolve(request)
  }

  async remove<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>> {
    return this.removeResolver.resolve(request)
  }
}
