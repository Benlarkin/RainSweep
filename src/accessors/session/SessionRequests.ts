import { RequestBase } from '@/common/RequestBase'
import type { Session } from '@/types'
import type {
  LoadSessionResponse,
  StoreSessionResponse,
  ClearSessionResponse,
  StorePendingSignInResponse,
  RemovePendingSignInResponse,
} from './SessionResponses'

export interface PendingSignIn {
  state: string
  codeVerifier: string
  returnTo: string
}

export class LoadSessionRequest extends RequestBase<LoadSessionResponse> {}

export class StoreSessionRequest extends RequestBase<StoreSessionResponse> {
  constructor(public readonly session: Session) { super() }
}

export class ClearSessionRequest extends RequestBase<ClearSessionResponse> {}

export class StorePendingSignInRequest extends RequestBase<StorePendingSignInResponse> {
  constructor(public readonly pending: PendingSignIn) { super() }
}

/** Removes the pending sign-in and returns it: each OAuth state is single-use. */
export class RemovePendingSignInRequest extends RequestBase<RemovePendingSignInResponse> {}
