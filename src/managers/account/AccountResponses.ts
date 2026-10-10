import { ResponseBase, type Failure } from '@/common/ResponseBase'
import type { Account } from '@/types'

export class BeginSignInResponse extends ResponseBase {
  constructor(correlationId: string, public readonly authorizationUrl: string | null, error: Failure | null = null) {
    super(correlationId, error)
  }
}

export class CompleteSignInResponse extends ResponseBase {
  constructor(
    correlationId: string,
    public readonly account: Account | null,
    public readonly returnTo: string,
    error: Failure | null = null,
  ) {
    super(correlationId, error)
  }
}

export class SignOutResponse extends ResponseBase {
  constructor(correlationId: string, error: Failure | null = null) { super(correlationId, error) }
}

export class GetAccountResponse extends ResponseBase {
  constructor(correlationId: string, public readonly account: Account | null, error: Failure | null = null) {
    super(correlationId, error)
  }
}
