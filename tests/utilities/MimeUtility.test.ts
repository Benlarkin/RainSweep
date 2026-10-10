import { describe, expect, it } from 'vitest'
import PostalMime from 'postal-mime'
import { MimeUtility } from '@/utilities/MimeUtility'
import type { OutgoingMessage } from '@/types'

const base: OutgoingMessage = {
  from: { name: 'Zoë Example', address: 'zoe@example.com' },
  to: [{ name: 'Doe, Jane', address: 'jane@example.org' }],
  cc: [],
  bcc: [{ name: null, address: 'secret@example.net' }],
  subject: 'Café plans ☕',
  textBody: 'Hi Jane,\r\n\r\nSee you there.',
  htmlBody: null,
  attachments: [],
  inReplyTo: '<orig@example.org>',
  references: ['<root@example.org>', '<orig@example.org>'],
  date: new Date('2026-10-10T12:00:00Z'),
  messageId: '<new@example.com>',
}

describe('MimeUtility', () => {
  it('produces a message that a MIME parser reads back faithfully', async () => {
    const parsed = await PostalMime.parse(MimeUtility.build(base))
    expect(parsed.subject).toBe('Café plans ☕')
    expect(parsed.from).toEqual({ name: 'Zoë Example', address: 'zoe@example.com' })
    expect(parsed.to).toEqual([{ name: 'Doe, Jane', address: 'jane@example.org' }])
    expect(parsed.bcc?.[0]).toMatchObject({ address: 'secret@example.net' })
    expect(parsed.inReplyTo).toBe('<orig@example.org>')
    expect(parsed.references).toBe('<root@example.org> <orig@example.org>')
    expect(parsed.text?.replace(/\r\n/g, '\n').trim()).toBe('Hi Jane,\n\nSee you there.')
  })

  it('includes attachments as multipart/mixed', async () => {
    const raw = MimeUtility.build({
      ...base,
      attachments: [{ filename: 'notes.txt', mimeType: 'text/plain', content: new TextEncoder().encode('attached!') }],
    })
    const parsed = await PostalMime.parse(raw, { attachmentEncoding: 'utf8' })
    expect(parsed.attachments).toHaveLength(1)
    expect(parsed.attachments[0]).toMatchObject({ filename: 'notes.txt', mimeType: 'text/plain', content: 'attached!' })
  })

  it('cannot be header-injected through user input', () => {
    const raw = MimeUtility.build({ ...base, subject: 'Hi\r\nBcc: attacker@evil.com' })
    const headerBlock = raw.split('\r\n\r\n')[0]
    expect(headerBlock).not.toMatch(/^Bcc: attacker/m)
  })
})
