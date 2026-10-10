import type { IHandler } from '@/common/resolver/IHandler'
import { RefreshCredentialsRequest } from '../IdentityRequests'
import { RefreshCredentialsResponse } from '../IdentityResponses'
import { GOOGLE_TOKEN_ENDPOINT, type GoogleOAuthConfig } from './GoogleOAuthConfig'
import { postTokenEndpoint } from './tokenResponse'

export class RefreshCredentialsHandler implements IHandler<RefreshCredentialsRequest> {
  constructor(
    private readonly config: GoogleOAuthConfig,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async handle(request: RefreshCredentialsRequest): Promise<RefreshCredentialsResponse> {
    const result = await postTokenEndpoint(this.fetchFn, GOOGLE_TOKEN_ENDPOINT, {
      refresh_token: request.refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'refresh_token',
    })
    if (!result.ok) return new RefreshCredentialsResponse(request.correlationId, null, result.failure)

    return new RefreshCredentialsResponse(request.correlationId, {
      accessToken: result.token.accessToken,
      // Google usually omits a new refresh token on refresh; keep the old one.
      refreshToken: result.token.refreshToken ?? request.refreshToken,
      expiresAt: Date.now() + result.token.expiresIn * 1000,
    })
  }
}
