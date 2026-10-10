import type { Session } from '@/types'
import { CryptoUtility } from '@/utilities/CryptoUtility'
import type { CookieJar, CookieOptions } from '../CookieJar'
import type { PendingSignIn } from '../SessionRequests'

export const SESSION_COOKIE = 'mc_session'
export const PENDING_COOKIE = 'mc_signin'

const SESSION_MAX_AGE = 60 * 60 * 24 * 30   // 30 days
const PENDING_MAX_AGE = 60 * 10             // 10 minutes

export interface SessionCookieConfig {
  key: () => Promise<CryptoKey>
  secure: boolean
}

/** Shared by the session handlers: sealing, unsealing and validating cookie payloads. */
export class SessionCookies {
  constructor(private readonly jar: CookieJar, private readonly config: SessionCookieConfig) {}

  async readSession(): Promise<Session | null> {
    const value = await this.read(SESSION_COOKIE)
    return isSession(value) ? value : null
  }

  async writeSession(session: Session): Promise<void> {
    await this.write(SESSION_COOKIE, session, SESSION_MAX_AGE)
  }

  async readPending(): Promise<PendingSignIn | null> {
    const value = await this.read(PENDING_COOKIE)
    return isPendingSignIn(value) ? value : null
  }

  async writePending(pending: PendingSignIn): Promise<void> {
    await this.write(PENDING_COOKIE, pending, PENDING_MAX_AGE)
  }

  delete(name: typeof SESSION_COOKIE | typeof PENDING_COOKIE): void {
    this.jar.delete(name)
  }

  private async read(name: string): Promise<unknown> {
    const token = this.jar.get(name)
    if (!token) return null
    return CryptoUtility.unseal(token, await this.config.key())
  }

  private async write(name: string, value: unknown, maxAge: number): Promise<void> {
    const options: CookieOptions = { maxAge, httpOnly: true, secure: this.config.secure, sameSite: 'lax', path: '/' }
    this.jar.set(name, await CryptoUtility.seal(value, await this.config.key()), options)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSession(value: unknown): value is Session {
  if (!isRecord(value) || !isRecord(value.account) || !isRecord(value.credentials)) return false
  const { account, credentials } = value
  return typeof account.email === 'string'
    && typeof credentials.accessToken === 'string'
    && typeof credentials.refreshToken === 'string'
    && typeof credentials.expiresAt === 'number'
}

function isPendingSignIn(value: unknown): value is PendingSignIn {
  return isRecord(value)
    && typeof value.state === 'string'
    && typeof value.codeVerifier === 'string'
    && typeof value.returnTo === 'string'
}
