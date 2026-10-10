import type { RequestBase, ResponseOf } from '@/common/RequestBase'
import { HandlerResolver } from '@/common/resolver/HandlerResolver'
import type { IAccountManager } from './IAccountManager'

export class AccountManager implements IAccountManager {
  constructor(
    private readonly executeResolver: HandlerResolver,
    private readonly queryResolver: HandlerResolver,
  ) {}

  async execute<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>> {
    return this.executeResolver.resolve(request)
  }

  async query<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>> {
    return this.queryResolver.resolve(request)
  }
}
