import type { CookieJar } from '@/accessors/session/CookieJar'

export interface RecordedCall { url: string; method: string; body: string | null }

/** A fetch stand-in that answers by URL pattern and records every call. */
export function fakeFetch(routes: Array<[RegExp, (call: RecordedCall) => Response | unknown]>) {
  const calls: RecordedCall[] = []
  const fn: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const call = { url, method: init?.method ?? 'GET', body: typeof init?.body === 'string' ? init.body : null }
    calls.push(call)
    const route = routes.find(([pattern]) => pattern.test(url))
    if (!route) return new Response(JSON.stringify({ error: { message: `no route for ${url}` } }), { status: 404 })
    const result = route[1](call)
    return result instanceof Response ? result : new Response(JSON.stringify(result), { status: 200 })
  }
  return { fn, calls }
}

export function memoryCookieJar(): CookieJar & { values: Map<string, string> } {
  const values = new Map<string, string>()
  return {
    values,
    get: name => values.get(name),
    set: (name, value) => { values.set(name, value) },
    delete: name => { values.delete(name) },
  }
}
