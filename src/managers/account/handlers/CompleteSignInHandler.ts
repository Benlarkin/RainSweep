import type { IHandler } from '@/common/resolver/IHandler'
import { failure } from '@/common/ResponseBase'
import type { ISessionAccessor } from '@/accessors/session/ISessionAccessor'
import type { IIdentityAccessor } from '@/accessors/identity/IIdentityAccessor'
import { RemovePendingSignInRequest, StoreSessionRequest } from '@/accessors/session/SessionRequests'
import { ExchangeAuthorizationCodeRequest } from '@/accessors/identity/IdentityRequests'
import { CryptoUtility } from '@/utilities/CryptoUtility'
import { CompleteSignInRequest } from '../AccountRequests'
import { CompleteSignInResponse } from '../AccountResponses'

export class CompleteSignInHandler implements IHandler<CompleteSignInRequest> {
  constructor(
    private readonly sessionAccessor: ISessionAccessor,
    private readonly identityAccessor: IIdentityAccessor,
  ) {}

  async handle(request: CompleteSignInRequest): Promise<CompleteSignInResponse> {
    const { pending } = await this.sessionAccessor.remove(new RemovePendingSignInRequest())
    if (!pending || !CryptoUtility.safeEqual(pending.state, request.state)) {
      return new CompleteSignInResponse(request.correlationId, null, '/',
        failure('invalid_request', 'Sign-in expired or was started in another browser. Try again.'))
    }

    const exchanged = await this.identityAccessor.authorize(
      new ExchangeAuthorizationCodeRequest(request.code, pending.codeVerifier),
    )
    if (!exchanged.session) {
      return new CompleteSignInResponse(request.correlationId, null, '/', exchanged.error)
    }

    await this.sessionAccessor.store(new StoreSessionRequest(exchanged.session))
    return new CompleteSignInResponse(request.correlationId, exchanged.session.account, pending.returnTo)
  }
}
