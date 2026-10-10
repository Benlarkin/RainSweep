import type { RequestBase, ResponseOf } from '@/common/RequestBase'
import { HandlerResolver } from '@/common/resolver/HandlerResolver'
import type { IMailAccessor } from './IMailAccessor'

export class MailAccessor implements IMailAccessor {
  constructor(
    private readonly loadResolver: HandlerResolver,
    private readonly storeResolver: HandlerResolver,
  ) {}

  async load<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>> {
    return this.loadResolver.resolve(request)
  }

  async store<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>> {
    return this.storeResolver.resolve(request)
  }
}
