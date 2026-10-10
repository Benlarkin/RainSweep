import type { IHandler } from '@/common/resolver/IHandler'
import { failure } from '@/common/ResponseBase'
import { OneClickUnsubscribeRequest } from '../SubscriptionRequests'
import { OneClickUnsubscribeResponse } from '../SubscriptionResponses'

const TIMEOUT_MS = 10_000

/**
 * Sends the RFC 8058 one-click POST. The URL comes from an email header, so
 * it is untrusted: https only, public hostnames only, no redirects followed,
 * no cookies or credentials, and a short timeout.
 */
export class OneClickUnsubscribeHandler implements IHandler<OneClickUnsubscribeRequest> {
  constructor(private readonly fetchFn: typeof fetch = fetch) {}

  async handle(request: OneClickUnsubscribeRequest): Promise<OneClickUnsubscribeResponse> {
    const fail = (message: string) => new OneClickUnsubscribeResponse(request.correlationId, failure('invalid_request', message))

    let url: URL
    try { url = new URL(request.url) } catch { return fail('The unsubscribe link is not a valid URL.') }
    if (url.protocol !== 'https:') return fail('One-click unsubscribe requires an https link.')
    if (!isPublicHostname(url.hostname)) return fail('The unsubscribe link points to a private address.')

    try {
      const response = await this.fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'List-Unsubscribe=One-Click',
        redirect: 'manual',
        credentials: 'omit',
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      // RFC 8058 senders answer 2xx; some redirect to a confirmation page, which also means it worked.
      if (response.ok || (response.status >= 300 && response.status < 400)) {
        return new OneClickUnsubscribeResponse(request.correlationId)
      }
      return new OneClickUnsubscribeResponse(request.correlationId,
        failure('upstream_failure', `The sender's unsubscribe service answered ${response.status}.`))
    } catch (err) {
      return new OneClickUnsubscribeResponse(request.correlationId,
        failure('upstream_failure', `Could not reach the sender's unsubscribe service: ${String(err)}`))
    }
  }
}

export function isPublicHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return false
  if (!host.includes('.') && !host.includes(':')) return false
  // IPv4 literals in private, loopback, link-local or CGNAT ranges.
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])]
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224) return false
    return true
  }
  // IPv6 literals: refuse loopback, unique-local and link-local.
  if (host.includes(':')) return !(host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80') || host.startsWith('::'))
  return true
}
