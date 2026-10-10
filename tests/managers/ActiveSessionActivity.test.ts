import { describe, expect, it } from 'vitest'
import { ActiveSessionActivity } from '@/managers/shared/ActiveSessionActivity'
import type { ISessionAccessor } from '@/accessors/session/ISessionAccessor'
import type { IIdentityAccessor } from '@/accessors/identity/IIdentityAccessor'
import { LoadSessionResponse, StoreSessionResponse, ClearSessionResponse } from '@/accessors/session/SessionResponses'
import { RefreshCredentialsResponse } from '@/accessors/identity/IdentityResponses'
import { LoadSessionRequest, StoreSessionRequest, ClearSessionRequest } from '@/accessors/session/SessionRequests'
import { failure } from '@/common/ResponseBase'
import type { RequestBase, ResponseOf } from '@/common/RequestBase'
import type { Credentials, Session } from '@/types'

const NOW = 1_000_000_000_000

function session(expiresAt: number): Session {
  return { account: { email: 'ben@example.com', name: 'Ben', pictureUrl: null }, credentials: { accessToken: 'old', refreshToken: 'refresh', expiresAt } }
}

function fakes(stored: Session | null, refresh: Credentials | 'revoked' | 'down') {
  const log: string[] = []
  let current = stored
  const sessionAccessor: ISessionAccessor = {
    load: async <T extends RequestBase>(r: T) => {
      log.push('load')
      if (!(r instanceof LoadSessionRequest)) throw new Error('unexpected')
      return new LoadSessionResponse(r.correlationId, current) as unknown as ResponseOf<T>
    },
    store: async <T extends RequestBase>(r: T) => {
      if (r instanceof StoreSessionRequest) { log.push('store'); current = r.session }
      return new StoreSessionResponse(r.correlationId) as unknown as ResponseOf<T>
    },
    remove: async <T extends RequestBase>(r: T) => {
      if (r instanceof ClearSessionRequest) { log.push('clear'); current = null }
      return new ClearSessionResponse(r.correlationId) as unknown as ResponseOf<T>
    },
  }
  const identityAccessor: IIdentityAccessor = {
    authorize: async <T extends RequestBase>(r: T) => {
      log.push('refresh')
      if (refresh === 'revoked') return new RefreshCredentialsResponse(r.correlationId, null, failure('unauthenticated', 'revoked')) as unknown as ResponseOf<T>
      if (refresh === 'down') return new RefreshCredentialsResponse(r.correlationId, null, failure('upstream_failure', 'down')) as unknown as ResponseOf<T>
      return new RefreshCredentialsResponse(r.correlationId, refresh) as unknown as ResponseOf<T>
    },
    revoke: async () => { throw new Error('unexpected') },
  }
  return { activity: new ActiveSessionActivity(sessionAccessor, identityAccessor, () => NOW), log, current: () => current }
}

describe('ActiveSessionActivity', () => {
  it('uses a still-valid token without refreshing', async () => {
    const { activity, log } = fakes(session(NOW + 10 * 60_000), 'down')
    const result = await activity.resolve()
    expect(result.ok && result.session.credentials.accessToken).toBe('old')
    expect(log).toEqual(['load'])
  })

  it('refreshes a token about to expire and persists it', async () => {
    const fresh = { accessToken: 'new', refreshToken: 'refresh', expiresAt: NOW + 3_600_000 }
    const { activity, log, current } = fakes(session(NOW + 30_000), fresh)
    const result = await activity.resolve()
    expect(result.ok && result.session.credentials.accessToken).toBe('new')
    expect(log).toEqual(['load', 'refresh', 'store'])
    expect(current()?.credentials.accessToken).toBe('new')
  })

  it('signs the user out when Google revokes the refresh token', async () => {
    const { activity, log } = fakes(session(NOW - 1), 'revoked')
    const result = await activity.resolve()
    expect(result.ok).toBe(false)
    expect(!result.ok && result.failure.code).toBe('unauthenticated')
    expect(log).toEqual(['load', 'refresh', 'clear'])
  })

  it('keeps the session through a transient Google outage', async () => {
    const { activity, log } = fakes(session(NOW - 1), 'down')
    const result = await activity.resolve()
    expect(!result.ok && result.failure.code).toBe('upstream_failure')
    expect(log).not.toContain('clear')
  })

  it('reports unauthenticated when there is no session', async () => {
    const { activity } = fakes(null, 'down')
    const result = await activity.resolve()
    expect(!result.ok && result.failure.code).toBe('unauthenticated')
  })
})
