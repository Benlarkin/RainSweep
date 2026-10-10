/**
 * Thrown when a request reaches a resolver that has no handler registered for
 * it. This is a wiring bug in the DependencyContainer, not a runtime condition,
 * so it fails loudly instead of returning a response.
 */
export class UnhandledRequestError extends Error {
  constructor(requestType: string) {
    super(`No handler registered for request type: ${requestType}`)
    this.name = 'UnhandledRequestError'
  }
}
