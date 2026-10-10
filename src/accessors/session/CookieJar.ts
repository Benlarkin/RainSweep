export interface CookieOptions {
  maxAge: number          // seconds
  httpOnly: boolean
  secure: boolean
  sameSite: 'lax' | 'strict'
  path: string
}

/** The request/response cookie store, abstracted so the accessor is testable outside Next.js. */
export interface CookieJar {
  get(name: string): string | undefined
  set(name: string, value: string, options: CookieOptions): void
  delete(name: string): void
}
