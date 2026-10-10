import type { IHandler } from '@/common/resolver/IHandler'
import type { ISessionAccessor } from '@/accessors/session/ISessionAccessor'
import type { IIdentityAccessor } from '@/accessors/identity/IIdentityAccessor'
import { ClearSessionRequest, LoadSessionRequest } from '@/accessors/session/SessionRequests'
import { RevokeCredentialsRequest } from '@/accessors/identity/IdentityRequests'
import { SignOutRequest } from '../AccountRequests'
import { SignOutResponse } from '../AccountResponses'

export class SignOutHandler implements IHandler<SignOutRequest> {
  constructor(
    private readonly sessionAccessor: ISessionAccessor,
    private readonly identityAccessor: IIdentityAccessor,
  ) {}

  async handle(request: SignOutRequest): Promise<SignOutResponse> {
    const { session } = await this.sessionAccessor.load(new LoadSessionRequest())
    // Revoking the refresh token also invalidates its access tokens. Best
    // effort: the local session is cleared whether or not Google answers.
    if (session) {
      await this.identityAccessor.revoke(new RevokeCredentialsRequest(session.credentials.refreshToken))
    }
    await this.sessionAccessor.remove(new ClearSessionRequest())
    return new SignOutResponse(request.correlationId)
  }
}
