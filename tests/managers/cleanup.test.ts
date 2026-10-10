import { describe, expect, it } from 'vitest'
import { createContainer } from '@/container/DependencyContainer'
import { Base64UrlUtility } from '@/utilities/Base64UrlUtility'
import { BeginSignInRequest, CompleteSignInRequest } from '@/managers/account/AccountRequests'
import { AnalyzeMailboxRequest, ApplyBulkActionRequest, ScanMailboxRequest, UnsubscribeRequest } from '@/managers/cleanup/CleanupRequests'
import { UpdateThreadsRequest } from '@/managers/mailbox/MailboxRequests'
import { fakeFetch, memoryCookieJar } from '../fakes'

const config = {
  googleClientId: 'client-id',
  googleClientSecret: 'client-secret',
  appUrl: 'https://mail.example.com',
  sessionSecret: Base64UrlUtility.toBase64(new Uint8Array(32).fill(3)),
}

const headers = (unsubscribe: string | null, post: string | null) => [
  { name: 'From', value: 'Daily News <news@news.example>' },
  { name: 'Subject', value: 'Issue 7' },
  { name: 'List-Id', value: '<daily.news.example>' },
  ...(unsubscribe ? [{ name: 'List-Unsubscribe', value: unsubscribe }] : []),
  ...(post ? [{ name: 'List-Unsubscribe-Post', value: post }] : []),
]

function google(options: { oneClickStatus?: number; unsubscribe?: string | null; post?: string | null } = {}) {
  const unsubscribe = options.unsubscribe === undefined ? '<mailto:leave@news.example>, <https://news.example/u/1>' : options.unsubscribe
  const post = options.post === undefined ? 'List-Unsubscribe=One-Click' : options.post
  return fakeFetch([
    [/oauth2\.googleapis\.com\/token/, () => ({ access_token: 'access-1', expires_in: 3600, refresh_token: 'refresh-1', scope: 'openid email https://www.googleapis.com/auth/gmail.modify' })],
    [/userinfo/, () => ({ email: 'ben@example.com', name: 'Ben' })],
    [/\/messages\?/, () => ({ messages: [{ id: 'm1' }, { id: 'm2' }], resultSizeEstimate: 2 })],
    [/\/messages\/m\d\?/, call => ({
      id: call.url.match(/messages\/(m\d)/)?.[1], threadId: 't1', labelIds: ['INBOX', 'UNREAD'], internalDate: '1760000000000', sizeEstimate: 5000,
      payload: { headers: headers(unsubscribe, post) },
    })],
    [/batchModify$/, () => new Response(null, { status: 204 })],
    [/\/messages\/send$/, () => ({ id: 'sent-1', threadId: 'x' })],
    [/\/threads\/t\d\/modify$/, call => (call.url.includes('/t9/') ? new Response('{}', { status: 404 }) : {})],
    [/news\.example\/u\/1/, () => new Response(null, { status: options.oneClickStatus ?? 200 })],
  ])
}

async function signedIn(http = google()) {
  const container = createContainer({ config, cookies: memoryCookieJar(), fetchFn: http.fn })
  const begin = await container.accountManager.execute(new BeginSignInRequest())
  const state = new URL(begin.authorizationUrl ?? '').searchParams.get('state') ?? ''
  await container.accountManager.execute(new CompleteSignInRequest('auth-code', state))
  return { container, http }
}

describe('Clean up, end to end through every layer', () => {
  it('scans a page of metadata and groups it', async () => {
    const { container, http } = await signedIn()
    const scan = await container.cleanupManager.query(new ScanMailboxRequest('inbox'))
    expect(scan.messages.map(m => m.id)).toEqual(['m1', 'm2'])
    expect(scan.messages[0].unsubscribe?.oneClick).toBe(true)
    expect(http.calls.find(c => c.url.includes('/messages?'))?.url).toContain('labelIds=INBOX')

    const { analysis } = await container.cleanupManager.query(
      new AnalyzeMailboxRequest(scan.messages, { olderThanDays: null, largerThanBytes: null, unreadOnly: false }))
    expect(analysis?.groups.sender[0]).toMatchObject({ label: 'Daily News', messageCount: 2, unreadCount: 2 })
    expect(analysis?.groups.list[0].id).toBe('list:daily.news.example')
    expect(analysis?.insights.unopenedSubscriptions).toHaveLength(1)
  })

  it('refuses to scan when signed out', async () => {
    const container = createContainer({ config, cookies: memoryCookieJar(), fetchFn: google().fn })
    expect((await container.cleanupManager.query(new ScanMailboxRequest('all'))).error?.code).toBe('unauthenticated')
  })

  it('moves a group to Trash in one batch', async () => {
    const { container, http } = await signedIn()
    const result = await container.cleanupManager.execute(new ApplyBulkActionRequest(['m1', 'm2'], 'trash'))
    expect(result.updatedCount).toBe(2)
    expect(JSON.parse(http.calls.find(c => c.url.endsWith('batchModify'))?.body ?? '{}').addLabelIds).toEqual(['TRASH'])
  })

  it('treats an empty selection as a no-op and rejects unknown actions', async () => {
    const { container, http } = await signedIn()
    const empty = await container.cleanupManager.execute(new ApplyBulkActionRequest([], 'trash'))
    expect(empty).toMatchObject({ success: true, updatedCount: 0 })
    expect(http.calls.some(c => c.url.endsWith('batchModify'))).toBe(false)
    expect((await container.cleanupManager.execute(new ApplyBulkActionRequest(['m1'], 'nuke' as never))).error?.code).toBe('invalid_request')
  })

  it('unsubscribes with one click when the sender supports it', async () => {
    const { container, http } = await signedIn()
    const { result } = await container.cleanupManager.execute(new UnsubscribeRequest('m1'))
    expect(result).toEqual({ method: 'one-click', completed: true, url: null })
    expect(http.calls.find(c => c.url.includes('news.example/u/1'))?.body).toBe('List-Unsubscribe=One-Click')
    expect(http.calls.some(c => c.url.endsWith('/messages/send'))).toBe(false)
  })

  it('falls back to emailing the list when one-click fails', async () => {
    const { container, http } = await signedIn(google({ oneClickStatus: 500 }))
    const { result } = await container.cleanupManager.execute(new UnsubscribeRequest('m1'))
    expect(result?.method).toBe('mailto')
    const sent = JSON.parse(http.calls.find(c => c.url.endsWith('/messages/send'))?.body ?? '{}')
    const raw = new TextDecoder().decode(Base64UrlUtility.decode(sent.raw))
    expect(raw).toContain('To: leave@news.example')
  })

  it('hands back the link when that is all the sender offers', async () => {
    const { container } = await signedIn(google({ unsubscribe: '<https://news.example/u/1>', post: null }))
    const { result } = await container.cleanupManager.execute(new UnsubscribeRequest('m1'))
    expect(result).toEqual({ method: 'link', completed: false, url: 'https://news.example/u/1' })
  })

  it('says so when a sender has no unsubscribe option', async () => {
    const { container } = await signedIn(google({ unsubscribe: null }))
    expect((await container.cleanupManager.execute(new UnsubscribeRequest('m1'))).error?.code).toBe('not_found')
  })

  it('archives several conversations, reporting the ones that failed', async () => {
    const { container } = await signedIn()
    const result = await container.mailboxManager.execute(new UpdateThreadsRequest(['t1', 't2', 't9'], 'archive'))
    expect(result.updatedIds.sort()).toEqual(['t1', 't2'])
    expect(result.failedIds).toEqual(['t9'])
  })
})
