export class Base64UrlUtility {
  static encode(input: Uint8Array | string): string {
    const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
    return Base64UrlUtility.toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  static decode(input: string): Uint8Array<ArrayBuffer> {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    return Base64UrlUtility.fromBase64(padded)
  }

  static decodeToString(input: string): string {
    return new TextDecoder().decode(Base64UrlUtility.decode(input))
  }

  static toBase64(bytes: Uint8Array): string {
    let binary = ''
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    return btoa(binary)
  }

  static fromBase64(base64: string): Uint8Array<ArrayBuffer> {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }
}
