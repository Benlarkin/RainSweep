import { describe, expect, it } from 'vitest'
import { MailtoUtility } from '@/utilities/MailtoUtility'

describe('MailtoUtility', () => {
  it('parses recipients, subject and body', () => {
    const parsed = MailtoUtility.parse('mailto:a@x.com,b@y.com?cc=c@z.com&subject=Hello%20there&body=Line%201%0ALine%202')
    expect(parsed?.to.map(a => a.address)).toEqual(['a@x.com', 'b@y.com'])
    expect(parsed?.cc.map(a => a.address)).toEqual(['c@z.com'])
    expect(parsed?.subject).toBe('Hello there')
    expect(parsed?.body).toBe('Line 1\nLine 2')
  })

  it('returns null for non-mailto input', () => {
    expect(MailtoUtility.parse('new')).toBeNull()
  })
})
