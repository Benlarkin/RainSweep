import type { RequestBase, ResponseOf } from '@/common/RequestBase'
import { HandlerResolver } from '@/common/resolver/HandlerResolver'
import type { IMessageParsingEngine } from './IMessageParsingEngine'

export class MessageParsingEngine implements IMessageParsingEngine {
  constructor(private readonly evaluateResolver: HandlerResolver) {}

  async evaluate<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>> {
    return this.evaluateResolver.resolve(request)
  }
}
