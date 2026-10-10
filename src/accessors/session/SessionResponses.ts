import { ResponseBase, type Failure } from '@/common/ResponseBase'
import type { Session } from '@/types'
import type { PendingSignIn } from './SessionRequests'

export class LoadSessionResponse extends ResponseBase {
  constructor(correlationId: string, public readonly session: Session | null, error: Failure | null = null) {
    super(correlationId, error)
  }
}

export class StoreSessionResponse extends ResponseBase {
  constructor(correlationId: string, error: Failure | null = null) { super(correlationId, error) }
}

export class ClearSessionResponse extends ResponseBase {
  constructor(correlationId: string, error: Failure | null = null) { super(correlationId, error) }
}

export class StorePendingSignInResponse extends ResponseBase {
  constructor(correlationId: string, error: Failure | null = null) { super(correlationId, error) }
}

export class RemovePendingSignInResponse extends ResponseBase {
  constructor(correlationId: string, public readonly pending: PendingSignIn | null, error: Failure | null = null) {
    super(correlationId, error)
  }
}
