import { RequestBase } from '@/common/RequestBase'
import type {
  BuildAuthorizationUrlResponse,
  ExchangeAuthorizationCodeResponse,
  RefreshCredentialsResponse,
  RevokeCredentialsResponse,
} from './IdentityResponses'

export class BuildAuthorizationUrlRequest extends RequestBase<BuildAuthorizationUrlResponse> {
  constructor(
    public readonly state: string,
    public readonly codeChallenge: string,
    public readonly loginHint: string | null = null,
  ) { super() }
}

export class ExchangeAuthorizationCodeRequest extends RequestBase<ExchangeAuthorizationCodeResponse> {
  constructor(
    public readonly code: string,
    public readonly codeVerifier: string,
  ) { super() }
}

export class RefreshCredentialsRequest extends RequestBase<RefreshCredentialsResponse> {
  constructor(public readonly refreshToken: string) { super() }
}

export class RevokeCredentialsRequest extends RequestBase<RevokeCredentialsResponse> {
  constructor(public readonly token: string) { super() }
}
