import type { IHandler } from '@/common/resolver/IHandler'
import type { ISessionAccessor } from '@/accessors/session/ISessionAccessor'
import type { IIdentityAccessor } from '@/accessors/identity/IIdentityAccessor'
import { StorePendingSignInRequest } from '@/accessors/session/SessionRequests'
import { BuildAuthorizationUrlRequest } from '@/accessors/identity/IdentityRequests'
import { CryptoUtility } from '@/utilities/CryptoUtility'
import { BeginSignInRequest } from '../AccountRequests'
import { BeginSignInResponse } from '../AccountResponses'

export class BeginSignInHandler implements IHandler<BeginSignInRequest> {
  constructor(
    private readonly sessionAccessor: ISessionAccessor,
    private readonly identityAccessor: IIdentityAccessor,
  ) {}

  async handle(request: BeginSignInRequest): Promise<BeginSignInResponse> {
    const state = CryptoUtility.randomToken()
    const codeVerifier = CryptoUtility.randomToken(48)
    const codeChallenge = await CryptoUtility.sha256Base64Url(codeVerifier)

    await this.sessionAccessor.store(new StorePendingSignInRequest({
      state,
      codeVerifier,
      returnTo: safeReturnPath(request.returnTo),
    }))

    const built = await this.identityAccessor.authorize(new BuildAuthorizationUrlRequest(state, codeChallenge))
    return new BeginSignInResponse(request.correlationId, built.url, built.error)
  }
}

/** Only same-origin paths, so the sign-in flow can't be used as an open redirect. */
export function safeReturnPath(path: string): string {
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\') ? path : '/mail'
}
