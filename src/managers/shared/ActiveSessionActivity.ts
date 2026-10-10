import { failure, type Failure } from '@/common/ResponseBase'
import type { ISessionAccessor } from '@/accessors/session/ISessionAccessor'
import type { IIdentityAccessor } from '@/accessors/identity/IIdentityAccessor'
import { LoadSessionRequest, StoreSessionRequest, ClearSessionRequest } from '@/accessors/session/SessionRequests'
import { RefreshCredentialsRequest } from '@/accessors/identity/IdentityRequests'
import type { Session } from '@/types'

/** Refresh this long before Google's stated expiry to absorb clock skew and request latency. */
const REFRESH_MARGIN_MS = 60_000

export type ActiveSession = { ok: true; session: Session } | { ok: false; failure: Failure }

/**
 * A manager-side activity shared by every use case that talks to the mailbox:
 * load the session and, if its access token is about to expire, refresh it
 * through the identity provider and persist the result. Lives in the Manager
 * layer because it orchestrates two Accessors, which Accessors may not do.
 */
export class ActiveSessionActivity {
  constructor(
    private readonly sessionAccessor: ISessionAccessor,
    private readonly identityAccessor: IIdentityAccessor,
    private readonly now: () => number = Date.now,
  ) {}

  async resolve(): Promise<ActiveSession> {
    const loaded = await this.sessionAccessor.load(new LoadSessionRequest())
    if (!loaded.session) {
      return { ok: false, failure: failure('unauthenticated', 'Sign in to continue.') }
    }

    const { session } = loaded
    if (session.credentials.expiresAt - REFRESH_MARGIN_MS > this.now()) {
      return { ok: true, session }
    }

    const refreshed = await this.identityAccessor.authorize(new RefreshCredentialsRequest(session.credentials.refreshToken))
    if (!refreshed.credentials) {
      const reason = refreshed.error ?? failure('unauthenticated', 'Sign in again.')
      if (reason.code === 'unauthenticated') {
        await this.sessionAccessor.remove(new ClearSessionRequest())
      }
      return { ok: false, failure: reason }
    }

    const next: Session = { account: session.account, credentials: refreshed.credentials }
    await this.sessionAccessor.store(new StoreSessionRequest(next))
    return { ok: true, session: next }
  }
}
