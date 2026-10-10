import type { RequestBase, ResponseOf } from '../RequestBase'
import type { IHandler } from './IHandler'
import { UnhandledRequestError } from './UnhandledRequestError'

export type RequestType = abstract new (...args: never[]) => RequestBase

export class HandlerResolver {
  constructor(private readonly handlers: ReadonlyMap<unknown, IHandler<RequestBase>>) {}

  handles(requestType: RequestType): boolean {
    return this.handlers.has(requestType)
  }

  // Keyed by the request's constructor itself rather than its name, so the
  // lookup survives minification of server bundles.
  async resolve<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>> {
    const handler = this.handlers.get(request.constructor)
    if (!handler) {
      throw new UnhandledRequestError(request.constructor.name)
    }
    const response: unknown = await handler.handle(request)
    return response as ResponseOf<TRequest>
  }
}
