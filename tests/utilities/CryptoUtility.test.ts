import { describe, expect, it } from 'vitest'
import { CryptoUtility } from '@/utilities/CryptoUtility'
import { Base64UrlUtility } from '@/utilities/Base64UrlUtility'

const secret = Base64UrlUtility.toBase64(new Uint8Array(32).fill(7))
const otherSecret = Base64UrlUtility.toBase64(new Uint8Array(32).fill(9))

describe('CryptoUtility', () => {
  it('round-trips a sealed value', async () => {
    const key = await CryptoUtility.importKey(secret)
    const token = await CryptoUtility.seal({ hello: 'world', n: 1 }, key)
    expect(await CryptoUtility.unseal(token, key)).toEqual({ hello: 'world', n: 1 })
  })

  it('rejects tampered tokens and the wrong key', async () => {
    const key = await CryptoUtility.importKey(secret)
    const token = await CryptoUtility.seal({ a: 1 }, key)
    const tampered = token.slice(0, -2) + (token.endsWith('A') ? 'BB' : 'AA')
    expect(await CryptoUtility.unseal(tampered, key)).toBeNull()
    expect(await CryptoUtility.unseal(token, await CryptoUtility.importKey(otherSecret))).toBeNull()
  })

  it('requires a 32-byte key', async () => {
    await expect(CryptoUtility.importKey(Base64UrlUtility.toBase64(new Uint8Array(16)))).rejects.toThrow(/32 bytes/)
  })

  it('produces a PKCE S256 challenge', async () => {
    // RFC 7636 appendix B test vector.
    expect(await CryptoUtility.sha256Base64Url('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'))
      .toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })
})
