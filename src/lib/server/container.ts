import 'server-only'
import { cookies } from 'next/headers'
import type { CookieJar } from '@/accessors/session/CookieJar'
import { createContainer, type Container } from '@/container/DependencyContainer'
import { getConfig } from '@/lib/config'

/**
 * Builds the container for the current request. The cookie jar is bound to
 * Next's request-scoped cookie store, so sessions read and written by
 * SessionAccessor flow through the response automatically.
 */
export async function getContainer(): Promise<Container> {
  const store = await cookies()
  const jar: CookieJar = {
    get: name => store.get(name)?.value,
    set: (name, value, options) => { store.set(name, value, options) },
    delete: name => { store.delete(name) },
  }
  return createContainer({ config: getConfig(), cookies: jar })
}
