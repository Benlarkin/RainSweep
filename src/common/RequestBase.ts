import type { ResponseBase } from './ResponseBase'

export abstract class RequestBase<TResponse extends ResponseBase = ResponseBase> {
  readonly correlationId: string = crypto.randomUUID()
  readonly timestamp: Date = new Date()

  /**
   * Phantom marker tying a request to the response type its handler returns,
   * so `manager.query(new GetThreadRequest(...))` is typed without a cast.
   * Never assigned at runtime.
   */
  declare readonly __response?: TResponse
}

/** The response type a given request resolves to. */
export type ResponseOf<TRequest> = TRequest extends RequestBase<infer TResponse> ? TResponse : never
