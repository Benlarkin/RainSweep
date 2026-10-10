import type { RequestBase } from '../RequestBase'
import type { IHandler } from './IHandler'
import { HandlerResolver } from './HandlerResolver'

export class HandlerResolverBuilder {
  private readonly handlers: Map<unknown, IHandler<RequestBase>> = new Map()

  register<TRequest extends RequestBase>(
    requestType: new (...args: never[]) => TRequest,
    handler: IHandler<TRequest>,
  ): this {
    if (this.handlers.has(requestType)) {
      throw new Error(`Handler already registered for ${requestType.name}`)
    }
    // The map is heterogeneous; register() is the only way in, and it pairs
    // each request type with a handler for exactly that type.
    this.handlers.set(requestType, handler as unknown as IHandler<RequestBase>)
    return this
  }

  build(): HandlerResolver {
    return new HandlerResolver(new Map(this.handlers))
  }
}
