import { failure, type Failure } from '@/common/ResponseBase'

export interface TokenPayload {
  accessToken: string
  expiresIn: number
  refreshToken: string | null
  scope: string
}

export type TokenResult = { ok: true; token: TokenPayload } | { ok: false; failure: Failure }

export async function postTokenEndpoint(fetchFn: typeof fetch, endpoint: string, form: Record<string, string>): Promise<TokenResult> {
  let response: Response
  try {
    response = await fetchFn(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form).toString(),
      cache: 'no-store',
    })
  } catch (err) {
    return { ok: false, failure: failure('upstream_failure', `Could not reach Google: ${String(err)}`) }
  }

  let body: unknown = null
  try { body = await response.json() } catch { /* handled below */ }
  const data = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}

  if (!response.ok) {
    // invalid_grant: the refresh token was revoked or expired; the user must sign in again.
    const code = data.error === 'invalid_grant' ? 'unauthenticated' : 'upstream_failure'
    const description = typeof data.error_description === 'string' ? data.error_description : response.statusText
    return { ok: false, failure: failure(code, `Google sign-in failed: ${description}`) }
  }

  if (typeof data.access_token !== 'string' || typeof data.expires_in !== 'number') {
    return { ok: false, failure: failure('upstream_failure', 'Google returned an unexpected token response.') }
  }

  return {
    ok: true,
    token: {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      refreshToken: typeof data.refresh_token === 'string' ? data.refresh_token : null,
      scope: typeof data.scope === 'string' ? data.scope : '',
    },
  }
}
