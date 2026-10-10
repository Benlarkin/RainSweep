import { describe, expect, it } from 'vitest'
import { ParseMessageHandler } from '@/engines/messageParsing/handlers/ParseMessageHandler'
import { ExtractAttachmentHandler } from '@/engines/messageParsing/handlers/ExtractAttachmentHandler'
import { ExtractAttachmentRequest, ParseMessageRequest } from '@/engines/messageParsing/MessageParsingEngineRequests'
import { MULTIPART_SOURCE, rawMessage } from '../fixtures'

describe('MessageParsingEngine', () => {
  it('maps a multipart MIME message onto the domain model', async () => {
    const { message } = await new ParseMessageHandler().handle(new ParseMessageRequest(rawMessage(MULTIPART_SOURCE)))
    expect(message).not.toBeNull()
    expect(message?.from).toEqual({ name: 'Alice Example', address: 'alice@example.org' })
    expect(message?.to.map(a => a.address)).toEqual(['ben@example.com', 'carol@example.net'])
    expect(message?.replyTo.map(a => a.address)).toEqual(['replies@example.org'])
    expect(message?.messageIdHeader).toBe('<plan-1@example.org>')
    expect(message?.references).toEqual(['<root@example.org>'])
    expect(message?.date).toBe('2026-10-08T14:30:00.000Z')
    expect(message?.textBody?.trim()).toBe('Here is the plan.\nSee attached.')
    expect(message?.unread).toBe(true)
  })

  it('inlines cid: images as data URIs and keeps real attachments listed', async () => {
    const { message } = await new ParseMessageHandler().handle(new ParseMessageRequest(rawMessage(MULTIPART_SOURCE)))
    expect(message?.htmlBody).toContain('src="data:image/png;base64,')
    expect(message?.htmlBody).not.toContain('cid:logo')
    // Remote images stay as-is; the reader's sandbox decides whether to load them.
    expect(message?.htmlBody).toContain('https://tracker.example/p.gif')
    expect(message?.attachments.map(a => [a.filename, a.inline])).toEqual([
      [expect.stringMatching(/attachment-1|\.png$/), true],
      ['plan.pdf', false],
    ])
  })

  it('extracts an attachment by index', async () => {
    const { attachment } = await new ExtractAttachmentHandler().handle(new ExtractAttachmentRequest(rawMessage(MULTIPART_SOURCE), 1))
    expect(attachment?.filename).toBe('plan.pdf')
    expect(new TextDecoder().decode(attachment?.content)).toBe('%PDF-1.4\n')
  })

  it('reports a missing attachment as not_found', async () => {
    const response = await new ExtractAttachmentHandler().handle(new ExtractAttachmentRequest(rawMessage(MULTIPART_SOURCE), 9))
    expect(response.error?.code).toBe('not_found')
  })

  it('falls back to the provider receive time when Date is missing', async () => {
    const { message } = await new ParseMessageHandler().handle(new ParseMessageRequest(rawMessage('Subject: hi\n\nbody')))
    expect(message?.date).toBe('2026-10-09T08:00:00.000Z')
    expect(message?.subject).toBe('hi')
  })
})
