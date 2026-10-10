import type { IHandler } from '@/common/resolver/IHandler'
import { failure } from '@/common/ResponseBase'
import { RevokeCredentialsRequest } from '../IdentityRequests'
import { RevokeCredentialsResponse } from '../IdentityResponses'
import { GOOGLE_REVOKE_ENDPOINT } from './GoogleOAuthConfig'

export class RevokeCredentialsHandler implements IHandler<RevokeCredentialsRequest> {
  constructor(private readonly fetchFn: typeof fetch = fetch) {}

  async handle(request: RevokeCredentialsRequest): Promise<RevokeCredentialsResponse> {
    try {
      const response = await this.fetchFn(GOOGLE_REVOKE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: request.token }).toString(),
        cache: 'no-store',
      })
      // 400 means the token was already invalid, which is the outcome we wanted.
      if (response.ok || response.status === 400) return new RevokeCredentialsResponse(request.correlationId)
      return new RevokeCredentialsResponse(request.correlationId, failure('upstream_failure', `Revoke failed: ${response.status}`))
    } catch (err) {
      return new RevokeCredentialsResponse(request.correlationId, failure('upstream_failure', String(err)))
    }
  }
}
