import { Base64UrlUtility } from './Base64UrlUtility'

const IV_BYTES = 12

/**
 * Authenticated encryption (AES-256-GCM) for small JSON payloads such as the
 * session cookie, plus the random-token and hashing helpers OAuth PKCE needs.
 * Uses WebCrypto so it runs in Node, the Edge runtime and the browser alike.
 */
export class CryptoUtility {
  static randomToken(byteLength = 32): string {
    return Base64UrlUtility.encode(crypto.getRandomValues(new Uint8Array(byteLength)))
  }

  static async sha256Base64Url(input: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
    return Base64UrlUtility.encode(new Uint8Array(digest))
  }

  /** Constant-time string comparison for secrets such as OAuth state. */
  static safeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
    return diff === 0
  }

  static async importKey(base64Secret: string): Promise<CryptoKey> {
    const raw = Base64UrlUtility.fromBase64(base64Secret)
    if (raw.length !== 32) {
      throw new Error('SESSION_SECRET must be 32 bytes, base64-encoded')
    }
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
  }

  static async seal(value: unknown, key: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
    const plaintext = new TextEncoder().encode(JSON.stringify(value))
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext))
    const sealed = new Uint8Array(iv.length + ciphertext.length)
    sealed.set(iv)
    sealed.set(ciphertext, iv.length)
    return Base64UrlUtility.encode(sealed)
  }

  /** Returns null when the token was tampered with, truncated or sealed with another key. */
  static async unseal(token: string, key: CryptoKey): Promise<unknown> {
    try {
      const sealed = Base64UrlUtility.decode(token)
      const iv = sealed.subarray(0, IV_BYTES)
      const ciphertext = sealed.subarray(IV_BYTES)
      const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
      const parsed: unknown = JSON.parse(new TextDecoder().decode(plaintext))
      return parsed
    } catch {
      return null
    }
  }
}
