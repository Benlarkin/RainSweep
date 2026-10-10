import type { IHandler } from '@/common/resolver/IHandler'
import { failure } from '@/common/ResponseBase'
import { ExchangeAuthorizationCodeRequest } from '../IdentityRequests'
import { ExchangeAuthorizationCodeResponse } from '../IdentityResponses'
import { GMAIL_SCOPE, GOOGLE_TOKEN_ENDPOINT, GOOGLE_USERINFO_ENDPOINT, type GoogleOAuthConfig } from './GoogleOAuthConfig'
import { postTokenEndpoint } from './tokenResponse'

export class ExchangeAuthorizationCodeHandler implements IHandler<ExchangeAuthorizationCodeRequest> {
  constructor(
    private readonly config: GoogleOAuthConfig,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async handle(request: ExchangeAuthorizationCodeRequest): Promise<ExchangeAuthorizationCodeResponse> {
    const fail = (code: Parameters<typeof failure>[0], message: string): ExchangeAuthorizationCodeResponse =>
      new ExchangeAuthorizationCodeResponse(request.correlationId, null, failure(code, message))

    const result = await postTokenEndpoint(this.fetchFn, GOOGLE_TOKEN_ENDPOINT, {
      code: request.code,
      code_verifier: request.codeVerifier,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      grant_type: 'authorization_code',
    })
    if (!result.ok) return new ExchangeAuthorizationCodeResponse(request.correlationId, null, result.failure)

    const { token } = result
    // Google's consent screen lets people untick individual scopes.
    if (!token.scope.split(' ').includes(GMAIL_SCOPE)) {
      return fail('unauthenticated', 'Gmail access was not granted. Sign in again and allow access to your mail.')
    }
    if (!token.refreshToken) {
      return fail('upstream_failure', 'Google did not return a refresh token. Remove the app from your Google account permissions and sign in again.')
    }

    let profile: unknown
    try {
      const response = await this.fetchFn(GOOGLE_USERINFO_ENDPOINT, {
        headers: { Authorization: `Bearer ${token.accessToken}` },
        cache: 'no-store',
      })
      if (!response.ok) return fail('upstream_failure', 'Could not read your Google profile.')
      profile = await response.json()
    } catch (err) {
      return fail('upstream_failure', `Could not read your Google profile: ${String(err)}`)
    }

    const p = typeof profile === 'object' && profile !== null ? (profile as Record<string, unknown>) : {}
    if (typeof p.email !== 'string') return fail('upstream_failure', 'Your Google profile has no email address.')

    return new ExchangeAuthorizationCodeResponse(request.correlationId, {
      account: {
        email: p.email,
        name: typeof p.name === 'string' ? p.name : null,
        pictureUrl: typeof p.picture === 'string' ? p.picture : null,
      },
      credentials: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: Date.now() + token.expiresIn * 1000,
      },
    })
  }
}
