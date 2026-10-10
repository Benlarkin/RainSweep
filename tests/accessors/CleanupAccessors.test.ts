import { describe, expect, it } from 'vitest'
import { GmailClient } from '@/accessors/mail/gmail/GmailClient'
import { SetMessagesReadHandler, TrashMessagesHandler } from '@/accessors/mail/handlers/MessagesStateHandlers'
import { LoadMessageMetadataPageHandler } from '@/accessors/mail/handlers/LoadMessageMetadataHandlers'
import { LoadMessageMetadataPageRequest, SetMessagesReadRequest, TrashMessagesRequest } from '@/accessors/mail/MailRequests'
import { OneClickUnsubscribeHandler, isPublicHostname } from '@/accessors/subscription/handlers/OneClickUnsubscribeHandler'
import { OneClickUnsubscribeRequest } from '@/accessors/subscription/SubscriptionRequests'
import { fakeFetch } from '../fakes'

const noSleep = async () => undefined

describe('Bulk message changes (Gmail batchModify)', () => {
  it('trashes with the TRASH label in chunks of 1,000, deduplicating ids', async () => {
    const { fn, calls } = fakeFetch([[/batchModify/, () => new Response(null, { status: 204 })]])
    const ids = [...Array.from({ length: 2500 }, (_, i) => `m${i}`), 'm0']
    const result = await new TrashMessagesHandler(new GmailClient(fn)).handle(new TrashMessagesRequest('token', ids))
    expect(result.updatedCount).toBe(2500)
    expect(calls).toHaveLength(3)
    const first = JSON.parse(calls[0].body ?? '{}')
    expect(first.ids).toHaveLength(1000)
    expect(first.addLabelIds).toEqual(['TRASH'])
    expect(calls.some(c => c.url.includes('batchDelete'))).toBe(false)
  })

  it('stops at the first failed chunk and reports how many went through', async () => {
    let n = 0
    const { fn } = fakeFetch([[/batchModify/, () => (++n === 2
      ? new Response(JSON.stringify({ error: { message: 'bad' } }), { status: 400 })
      : new Response(null, { status: 204 }))]])
    const ids = Array.from({ length: 1500 }, (_, i) => `m${i}`)
    const result = await new SetMessagesReadHandler(new GmailClient(fn)).handle(new SetMessagesReadRequest('token', ids, true))
    expect(result.success).toBe(false)
    expect(result.updatedCount).toBe(1000)
  })

  it('retries rate-limited calls, honouring Retry-After', async () => {
    const waits: number[] = []
    let n = 0
    const { fn, calls } = fakeFetch([[/batchModify/, () => (++n === 1
      ? new Response('{}', { status: 429, headers: { 'Retry-After': '2' } })
      : new Response(null, { status: 204 }))]])
    const gmail = new GmailClient(fn, 3, async ms => { waits.push(ms) })
    const result = await new TrashMessagesHandler(gmail).handle(new TrashMessagesRequest('token', ['m1']))
    expect(result.success).toBe(true)
    expect(calls).toHaveLength(2)
    expect(waits).toEqual([2000])
  })
})

describe('Metadata scan', () => {
  it('lists message ids, then reads only the cleanup headers for each', async () => {
    const { fn, calls } = fakeFetch([
      [/\/messages\?/, () => ({ messages: [{ id: 'm1' }, { id: 'gone' }], nextPageToken: 'p2', resultSizeEstimate: 900 })],
      [/\/messages\/m1\?/, () => ({
        id: 'm1', threadId: 't1', labelIds: ['INBOX', 'UNREAD', 'CATEGORY_PROMOTIONS'], internalDate: '1700000000000', sizeEstimate: 4321,
        payload: { headers: [{ name: 'From', value: 'News <n@x.com>' }, { name: 'List-Id', value: '<x.com>' }] },
      })],
      [/\/messages\/gone\?/, () => new Response('{}', { status: 404 })],
    ])
    const handler = new LoadMessageMetadataPageHandler(new GmailClient(fn, 3, noSleep))
    const page = await handler.handle(new LoadMessageMetadataPageRequest('token', { labelId: null, search: '', pageToken: null, pageSize: 250 }))
    expect(page.success).toBe(true)
    expect(page.nextPageToken).toBe('p2')
    expect(page.messages).toHaveLength(1)
    expect(page.messages[0]).toMatchObject({ id: 'm1', unread: true, sizeEstimate: 4321, headers: { from: 'News <n@x.com>', 'list-id': '<x.com>' } })
    const get = calls.find(c => c.url.includes('/messages/m1'))?.url ?? ''
    expect(get).toContain('format=metadata')
    expect(get).toContain('metadataHeaders=List-Unsubscribe')
  })
})

describe('One-click unsubscribe', () => {
  it('POSTs the RFC 8058 body without following redirects', async () => {
    const { fn, calls } = fakeFetch([[/news\.example/, () => new Response(null, { status: 202 })]])
    const result = await new OneClickUnsubscribeHandler(fn).handle(new OneClickUnsubscribeRequest('https://news.example/u?x=1'))
    expect(result.success).toBe(true)
    expect(calls[0]).toMatchObject({ method: 'POST', body: 'List-Unsubscribe=One-Click' })
  })

  it('refuses http, private and malformed targets without calling them', async () => {
    const { fn, calls } = fakeFetch([])
    const handler = new OneClickUnsubscribeHandler(fn)
    for (const url of ['http://news.example/u', 'https://127.0.0.1/u', 'https://localhost/u', 'https://[::1]/u', 'not a url']) {
      expect((await handler.handle(new OneClickUnsubscribeRequest(url))).success).toBe(false)
    }
    expect(calls).toHaveLength(0)
  })

  it('reports a sender error as an upstream failure', async () => {
    const { fn } = fakeFetch([[/news\.example/, () => new Response('nope', { status: 500 })]])
    const result = await new OneClickUnsubscribeHandler(fn).handle(new OneClickUnsubscribeRequest('https://news.example/u'))
    expect(result.error?.code).toBe('upstream_failure')
  })

  it('classifies hostnames', () => {
    expect(isPublicHostname('news.example.com')).toBe(true)
    expect(isPublicHostname('8.8.8.8')).toBe(true)
    for (const host of ['10.0.0.1', '192.168.1.1', '172.20.0.1', '169.254.169.254', '100.64.0.1', 'intranet', 'db.internal', 'printer.local', '[fd00::1]', '[::ffff:127.0.0.1]']) {
      expect(isPublicHostname(host), host).toBe(false)
    }
  })
})
