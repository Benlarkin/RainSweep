import { failure, type Failure } from '@/common/ResponseBase'

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

export type GmailResult<T> = { ok: true; data: T } | { ok: false; failure: Failure }

type Query = Record<string, string | number | boolean | string[] | null | undefined>

/** Thin, typed-at-the-edge wrapper over the Gmail REST API. Accessor-internal. */
export class GmailClient {
  constructor(
    private readonly fetchFn: typeof fetch = fetch,
    private readonly maxRetries = 3,
    private readonly sleep: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms)),
  ) {}

  get(accessToken: string, path: string, query: Query = {}): Promise<GmailResult<unknown>> {
    return this.send(accessToken, 'GET', `${path}${toQueryString(query)}`)
  }

  post(accessToken: string, path: string, body: unknown = {}): Promise<GmailResult<unknown>> {
    return this.send(accessToken, 'POST', path, body)
  }

  private async send(accessToken: string, method: 'GET' | 'POST', path: string, body?: unknown): Promise<GmailResult<unknown>> {
    let response: Response
    let attempt = 0
    for (;;) {
      try {
        response = await this.fetchFn(`${GMAIL_BASE}${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          cache: 'no-store',
        })
      } catch (err) {
        return { ok: false, failure: failure('upstream_failure', `Could not reach Gmail: ${String(err)}`) }
      }
      // Bulk scans brush against Gmail's per-user quota; back off and retry.
      if ((response.status === 429 || response.status >= 500) && attempt < this.maxRetries) {
        const retryAfter = Number(response.headers.get('retry-after'))
        await this.sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 400 * 2 ** attempt)
        attempt++
        continue
      }
      break
    }

    if (response.ok) {
      try {
        const text = await response.text()
        const data: unknown = text ? JSON.parse(text) : {}
        return { ok: true, data }
      } catch (err) {
        return { ok: false, failure: failure('upstream_failure', `Unreadable Gmail response: ${String(err)}`) }
      }
    }

    const detail = await readErrorMessage(response)
    switch (response.status) {
      case 401: return { ok: false, failure: failure('unauthenticated', 'Your Google session expired. Sign in again.') }
      case 403: return { ok: false, failure: failure('unauthenticated', `Gmail refused access: ${detail}`) }
      case 404: return { ok: false, failure: failure('not_found', 'That conversation no longer exists.') }
      case 429: return { ok: false, failure: failure('rate_limited', 'Gmail is rate limiting requests. Try again shortly.') }
      default:  return { ok: false, failure: failure('upstream_failure', `Gmail error ${response.status}: ${detail}`) }
    }
  }
}

function toQueryString(query: Query): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue
    if (Array.isArray(value)) value.forEach(v => params.append(key, v))
    else params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (isRecord(body) && isRecord(body.error) && typeof body.error.message === 'string') return body.error.message
  } catch {
    // fall through
  }
  return response.statusText
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
