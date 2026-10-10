export type ErrorCode =
  | 'unauthenticated'
  | 'invalid_request'
  | 'not_found'
  | 'rate_limited'
  | 'upstream_failure'

export interface Failure {
  readonly code: ErrorCode
  readonly message: string
}

export function failure(code: ErrorCode, message: string): Failure {
  return { code, message }
}

export abstract class ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly error: Failure | null

  protected constructor(correlationId: string, error: Failure | null) {
    this.correlationId = correlationId
    this.error = error
    this.success = error === null
  }

  get errorMessage(): string | null {
    return this.error?.message ?? null
  }
}
