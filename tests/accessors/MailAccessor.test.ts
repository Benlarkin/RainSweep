import { describe, expect, it } from 'vitest'
import { GmailClient } from '@/accessors/mail/gmail/GmailClient'
import { LoadThreadPageHandler } from '@/accessors/mail/handlers/LoadThreadPageHandler'
import { ArchiveThreadHandler, SetThreadReadHandler } from '@/accessors/mail/handlers/ThreadStateHandlers'
import { LoadThreadHandler } from '@/accessors/mail/handlers/LoadThreadHandler'
import { ArchiveThreadRequest, LoadThreadPageRequest, LoadThreadRequest, SetThreadReadRequest } from '@/accessors/mail/MailRequests'
import { Base64UrlUtility } from '@/utilities/Base64UrlUtility'
import { fakeFetch } from '../fakes'

const meta = (id: string, from: string, labels: string[], internalDate: string, subject = 'Lunch?') => ({
  id, threadId: 't1', labelIds: labels, snippet: 'Are you free &amp; hungry?', internalDate,
  payload: { headers: [{ name: 'From', value: from }, { name: 'Subject', value: subject }] },
})

describe('MailAccessor (Gmail)', () => {
  it('loads a page of thread summaries, mapping Gmail labels to flags', async () => {
    const { fn, calls } = fakeFetch([
      [/\/threads\?/, () => ({ threads: [{ id: 't1' }], nextPageToken: 'next', resultSizeEstimate: 42 })],
      [/\/threads\/t1\?/, () => ({
        id: 't1',
        messages: [
          meta('m1', 'Alice <alice@x.com>', ['INBOX'], '1700000000000'),
          meta('m2', '"Bob B" <bob@y.com>', ['INBOX', 'UNREAD', 'STARRED'], '1700000600000', 'Re: Lunch?'),
        ],
      })],
    ])
    const handler = new LoadThreadPageHandler(new GmailClient(fn))
    const { page } = await handler.handle(new LoadThreadPageRequest('token', { labelId: 'INBOX', search: 'lunch', pageToken: null, pageSize: 25 }))

    expect(calls[0].url).toContain('labelIds=INBOX')
    expect(calls[0].url).toContain('q=lunch')
    expect(page?.nextPageToken).toBe('next')
    expect(page?.threads[0]).toMatchObject({
      id: 't1',
      subject: 'Lunch?',
      snippet: 'Are you free & hungry?',
      messageCount: 2,
      unread: true,
      starred: true,
      labelIds: ['INBOX'],
      lastMessageAt: new Date(1700000600000).toISOString(),
    })
    expect(page?.threads[0].participants.map(p => p.name)).toEqual(['Alice', 'Bob B'])
  })

  it('loads a thread as raw MIME messages', async () => {
    const raw = Base64UrlUtility.encode('Subject: hi\r\n\r\nbody')
    const { fn } = fakeFetch([
      [/\/threads\/t1\?format=minimal/, () => ({ id: 't1', messages: [{ id: 'm1' }] })],
      [/\/messages\/m1\?format=raw/, () => ({ id: 'm1', threadId: 't1', labelIds: ['INBOX', 'UNREAD'], internalDate: '0', raw })],
    ])
    const { thread } = await new LoadThreadHandler(new GmailClient(fn)).handle(new LoadThreadRequest('token', 't1'))
    expect(thread?.messages[0]).toMatchObject({ id: 'm1', unread: true, starred: false, labelIds: ['INBOX'] })
    expect(new TextDecoder().decode(thread?.messages[0].raw)).toBe('Subject: hi\r\n\r\nbody')
  })

  it('archives by removing the INBOX label', async () => {
    const { fn, calls } = fakeFetch([[/modify$/, () => ({})]])
    const response = await new ArchiveThreadHandler(new GmailClient(fn)).handle(new ArchiveThreadRequest('token', 't1'))
    expect(response.success).toBe(true)
    expect(JSON.parse(calls[0].body ?? '')).toEqual({ addLabelIds: [], removeLabelIds: ['INBOX'] })
  })

  it('marks read by removing UNREAD', async () => {
    const { fn, calls } = fakeFetch([[/modify$/, () => ({})]])
    await new SetThreadReadHandler(new GmailClient(fn)).handle(new SetThreadReadRequest('token', 't1', true))
    expect(JSON.parse(calls[0].body ?? '')).toEqual({ addLabelIds: [], removeLabelIds: ['UNREAD'] })
  })

  it('translates Gmail 401s into unauthenticated failures', async () => {
    const { fn } = fakeFetch([[/modify$/, () => new Response('{}', { status: 401 })]])
    const response = await new ArchiveThreadHandler(new GmailClient(fn)).handle(new ArchiveThreadRequest('token', 't1'))
    expect(response.error?.code).toBe('unauthenticated')
  })
})
