import { describe, expect, it } from 'vitest'
import PostalMime from 'postal-mime'
import { PrepareReplyDraftHandler } from '@/engines/composition/handlers/PrepareReplyDraftHandler'
import { PrepareForwardDraftHandler } from '@/engines/composition/handlers/PrepareForwardDraftHandler'
import { BuildOutgoingMessageHandler } from '@/engines/composition/handlers/BuildOutgoingMessageHandler'
import {
  BuildOutgoingMessageRequest,
  PrepareForwardDraftRequest,
  PrepareReplyDraftRequest,
  type OutgoingMessageInput,
} from '@/engines/composition/CompositionEngineRequests'
import type { Account } from '@/types'
import { mailMessage } from '../fixtures'

const ben: Account = { email: 'ben@example.com', name: 'Ben', pictureUrl: null }
const reply = (original = mailMessage(), replyAll = false) =>
  new PrepareReplyDraftHandler().handle(new PrepareReplyDraftRequest(original, replyAll, ben, 'UTC'))

describe('CompositionEngine — replies', () => {
  it('replies to the sender, threads the reply and quotes the original', async () => {
    const { draft } = await reply()
    expect(draft?.to.map(a => a.address)).toEqual(['alice@example.org'])
    expect(draft?.cc).toEqual([])
    expect(draft?.subject).toBe('Re: Quarterly plan')
    expect(draft?.inReplyTo).toBe('<plan-1@example.org>')
    expect(draft?.references).toEqual(['<root@example.org>', '<plan-1@example.org>'])
    expect(draft?.threadId).toBe('t1')
    expect(draft?.body).toContain('Alice Example <alice@example.org> wrote:')
    expect(draft?.body).toContain('> Here is the plan.\n> See attached.')
  })

  it('honours Reply-To', async () => {
    const { draft } = await reply(mailMessage({ replyTo: [{ name: null, address: 'list@example.org' }] }))
    expect(draft?.to.map(a => a.address)).toEqual(['list@example.org'])
  })

  it('reply-all copies everyone except me and the primary recipient', async () => {
    const { draft } = await reply(mailMessage(), true)
    expect(draft?.mode).toBe('replyAll')
    expect(draft?.to.map(a => a.address)).toEqual(['alice@example.org'])
    expect(draft?.cc.map(a => a.address)).toEqual(['carol@example.net', 'dave@example.net'])
  })

  it('replying to my own sent message addresses its original recipients', async () => {
    const mine = mailMessage({ from: { name: 'Ben', address: 'BEN@example.com' }, to: [{ name: null, address: 'alice@example.org' }], cc: [] })
    const { draft } = await reply(mine)
    expect(draft?.to.map(a => a.address)).toEqual(['alice@example.org'])
  })

  it('does not stack Re: prefixes', async () => {
    const { draft } = await reply(mailMessage({ subject: 'RE: Quarterly plan' }))
    expect(draft?.subject).toBe('RE: Quarterly plan')
  })

  it('quotes HTML-only messages as text', async () => {
    const { draft } = await reply(mailMessage({ textBody: null, htmlBody: '<p>Hello&nbsp;<b>there</b></p><script>x()</script>' }))
    expect(draft?.body).toContain('> Hello there')
    expect(draft?.body).not.toContain('x()')
  })
})

describe('CompositionEngine — forward', () => {
  it('starts a new conversation with the original inline', async () => {
    const { draft } = await new PrepareForwardDraftHandler().handle(new PrepareForwardDraftRequest(mailMessage(), 'UTC'))
    expect(draft?.to).toEqual([])
    expect(draft?.subject).toBe('Fwd: Quarterly plan')
    expect(draft?.threadId).toBeNull()
    expect(draft?.body).toContain('---------- Forwarded message ---------')
    expect(draft?.body).toContain('From: Alice Example <alice@example.org>')
    expect(draft?.body).toContain('Here is the plan.')
  })
})

describe('CompositionEngine — outgoing message', () => {
  const input = (overrides: Partial<OutgoingMessageInput> = {}): OutgoingMessageInput => ({
    to: [{ name: null, address: 'alice@example.org' }], cc: [], bcc: [], subject: 'Hi', body: 'Hello\nthere',
    inReplyTo: null, references: [], attachments: [], ...overrides,
  })
  const build = (i: OutgoingMessageInput) => new BuildOutgoingMessageHandler().handle(new BuildOutgoingMessageRequest(ben, i))

  it('builds a sendable RFC 5322 message from the sender account', async () => {
    const { raw, message } = await build(input({ inReplyTo: '<x@y>', references: ['<x@y>'] }))
    expect(message?.messageId).toMatch(/^<[0-9a-f-]+@example\.com>$/)
    const parsed = await PostalMime.parse(raw ?? '')
    expect(parsed.from).toEqual({ name: 'Ben', address: 'ben@example.com' })
    expect(parsed.inReplyTo).toBe('<x@y>')
  })

  it('rejects a message with no recipients', async () => {
    const response = await build(input({ to: [] }))
    expect(response.error).toEqual({ code: 'invalid_request', message: 'Add at least one recipient.' })
  })

  it('rejects malformed addresses, naming them', async () => {
    const response = await build(input({ cc: [{ name: null, address: 'oops' }] }))
    expect(response.errorMessage).toContain('oops')
  })
})
