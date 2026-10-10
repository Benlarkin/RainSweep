import type { IHandler } from '@/common/resolver/IHandler'
import { BuildAuthorizationUrlRequest } from '../IdentityRequests'
import { BuildAuthorizationUrlResponse } from '../IdentityResponses'
import { GOOGLE_AUTH_ENDPOINT, SCOPES, type GoogleOAuthConfig } from './GoogleOAuthConfig'

export class BuildAuthorizationUrlHandler implements IHandler<BuildAuthorizationUrlRequest> {
  constructor(private readonly config: GoogleOAuthConfig) {}

  async handle(request: BuildAuthorizationUrlRequest): Promise<BuildAuthorizationUrlResponse> {
    const url = new URL(GOOGLE_AUTH_ENDPOINT)
    url.search = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: SCOPES.join(' '),
      state: request.state,
      code_challenge: request.codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline',             // we need a refresh token
      include_granted_scopes: 'true',
      prompt: 'consent',
      ...(request.loginHint ? { login_hint: request.loginHint } : {}),
    }).toString()
    return new BuildAuthorizationUrlResponse(request.correlationId, url.toString())
  }
}
