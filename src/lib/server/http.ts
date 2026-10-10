import 'server-only'
import { NextResponse } from 'next/server'
import type { ErrorCode, ResponseBase } from '@/common/ResponseBase'
import { getConfig } from '@/lib/config'

const STATUS: Record<ErrorCode, number> = {
  unauthenticated: 401,
  invalid_request: 400,
  not_found: 404,
  rate_limited: 429,
  upstream_failure: 502,
}

export function errorJson(response: ResponseBase): NextResponse {
  const code = response.error?.code ?? 'upstream_failure'
  return NextResponse.json(
    { error: { code, message: response.errorMessage ?? 'Something went wrong.' } },
    { status: STATUS[code], headers: { 'Cache-Control': 'no-store' } },
  )
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: { code: 'invalid_request', message } }, { status: 400 })
}

export function okJson(body: unknown, status = 200): NextResponse {
  // Mail is private: never let a shared cache keep it. The service worker
  // keeps its own per-device copy for offline reading.
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

/**
 * CSRF guard for state-changing routes. The session cookie is SameSite=Lax,
 * and this additionally rejects cross-site requests outright.
 */
export function rejectCrossSite(request: Request): NextResponse | null {
  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return NextResponse.json({ error: { code: 'invalid_request', message: 'Cross-site request rejected.' } }, { status: 403 })
  }
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(getConfig().appUrl).origin) {
    return NextResponse.json({ error: { code: 'invalid_request', message: 'Cross-site request rejected.' } }, { status: 403 })
  }
  return null
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    const body: unknown = await request.json()
    return body
  } catch {
    return null
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
