import { RequestBase } from '@/common/RequestBase'
import type { BeginSignInResponse, CompleteSignInResponse, SignOutResponse, GetAccountResponse } from './AccountResponses'

export class BeginSignInRequest extends RequestBase<BeginSignInResponse> {
  constructor(public readonly returnTo: string = '/mail') { super() }
}

export class CompleteSignInRequest extends RequestBase<CompleteSignInResponse> {
  constructor(
    public readonly code: string,
    public readonly state: string,
  ) { super() }
}

export class SignOutRequest extends RequestBase<SignOutResponse> {}

export class GetAccountRequest extends RequestBase<GetAccountResponse> {}
