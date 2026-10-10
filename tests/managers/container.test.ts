import { describe, expect, it } from 'vitest'
import { createContainer } from '@/container/DependencyContainer'
import { Base64UrlUtility } from '@/utilities/Base64UrlUtility'
import { BeginSignInRequest, CompleteSignInRequest, GetAccountRequest, SignOutRequest } from '@/managers/account/AccountRequests'
import { GetThreadRequest, GetThreadsRequest, UpdateThreadRequest } from '@/managers/mailbox/MailboxRequests'
import { GetComposeDraftRequest, SendMailRequest } from '@/managers/composition/CompositionRequests'
import { fakeFetch, memoryCookieJar } from '../fakes'
import { MULTIPART_SOURCE } from '../fixtures'

const config = {
  googleClientId: 'client-id',
  googleClientSecret: 'client-secret',
  appUrl: 'https://mail.example.com',
  sessionSecret: Base64UrlUtility.toBase64(new Uint8Array(32).fill(3)),
}

const rawMultipart = Base64UrlUtility.encode(MULTIPART_SOURCE.replace(/\n/g, '\r\n'))

/** Google + Gmail, faked at the HTTP boundary. Everything above it is real. */
function google() {
  return fakeFetch([
    [/oauth2\.googleapis\.com\/token/, () => ({
      access_token: 'access-1', expires_in: 3600, refresh_token: 'refresh-1',
      scope: 'openid email profile https://www.googleapis.com/auth/gmail.modify',
    })],
    [/oauth2\.googleapis\.com\/revoke/, () => ({})],
    [/userinfo/, () => ({ email: 'ben@example.com', name: 'Ben', picture: 'https://img/ben.png' })],
    [/\/threads\/t1\?format=minimal/, () => ({ id: 't1', messages: [{ id: 'm1' }] })],
    [/\/messages\/m1\?format=raw/, () => ({ id: 'm1', threadId: 't1', labelIds: ['INBOX', 'UNREAD'], internalDate: '0', raw: rawMultipart })],
    [/\/threads\?/, () => ({ threads: [], resultSizeEstimate: 0 })],
    [/\/modify$/, () => ({})],
    [/\/messages\/send$/, () => ({ id: 'sent-1', threadId: 't1' })],
  ])
}

async function signedIn() {
  const cookies = memoryCookieJar()
  const http = google()
  const container = createContainer({ config, cookies, fetchFn: http.fn })
  const begin = await container.accountManager.execute(new BeginSignInRequest('/mail?label=STARRED'))
  const state = new URL(begin.authorizationUrl ?? '').searchParams.get('state') ?? ''
  const completed = await container.accountManager.execute(new CompleteSignInRequest('auth-code', state))
  return { container, cookies, http, begin, completed }
}

describe('Container wiring, end to end through every layer', () => {
  it('signs in with Google using PKCE and stores an encrypted session', async () => {
    const { begin, completed, cookies, http } = await signedIn()
    const url = new URL(begin.authorizationUrl ?? '')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('redirect_uri')).toBe('https://mail.example.com/api/auth/google/callback')
    expect(url.searchParams.get('scope')).toContain('gmail.modify')

    expect(completed.account?.email).toBe('ben@example.com')
    expect(completed.returnTo).toBe('/mail?label=STARRED')
    expect(cookies.values.get('mc_session')).toBeTruthy()
    expect(cookies.values.get('mc_session')).not.toContain('refresh-1')
    expect(cookies.values.has('mc_signin')).toBe(false)
    expect(http.calls.find(c => c.url.includes('/token'))?.body).toContain('code_verifier=')
  })

  it('rejects a callback whose state does not match', async () => {
    const cookies = memoryCookieJar()
    const container = createContainer({ config, cookies, fetchFn: google().fn })
    await container.accountManager.execute(new BeginSignInRequest())
    const result = await container.accountManager.execute(new CompleteSignInRequest('auth-code', 'forged'))
    expect(result.error?.code).toBe('invalid_request')
  })

  it('refuses mailbox access when signed out', async () => {
    const container = createContainer({ config, cookies: memoryCookieJar(), fetchFn: google().fn })
    const result = await container.mailboxManager.query(new GetThreadsRequest('INBOX'))
    expect(result.error?.code).toBe('unauthenticated')
  })

  it('opens a thread: loads raw MIME, parses it, and marks it read', async () => {
    const { container, http } = await signedIn()
    const { thread } = await container.mailboxManager.query(new GetThreadRequest('t1'))
    expect(thread?.subject).toBe('Quarterly plan')
    expect(thread?.messages[0].unread).toBe(false)
    expect(http.calls.some(c => c.url.endsWith('/threads/t1/modify') && c.body?.includes('UNREAD'))).toBe(true)
  })

  it('archives a thread', async () => {
    const { container } = await signedIn()
    const result = await container.mailboxManager.execute(new UpdateThreadRequest('t1', 'archive'))
    expect(result.success).toBe(true)
  })

  it('prepares a reply-all draft and sends it in the same thread', async () => {
    const { container, http } = await signedIn()
    const { draft } = await container.compositionManager.query(new GetComposeDraftRequest('m1', 'replyAll', 'UTC'))
    expect(draft?.to.map(a => a.address)).toEqual(['replies@example.org'])
    expect(draft?.cc.map(a => a.address)).toEqual(['carol@example.net', 'dave@example.net'])

    const sent = await container.compositionManager.execute(new SendMailRequest({
      to: draft?.to ?? [], cc: draft?.cc ?? [], bcc: [], subject: draft?.subject ?? '', body: 'Sounds good.' + (draft?.body ?? ''),
      inReplyTo: draft?.inReplyTo ?? null, references: draft?.references ?? [], attachments: [],
    }, draft?.threadId ?? null))
    expect(sent).toMatchObject({ success: true, messageId: 'sent-1', threadId: 't1' })

    const sendBody = JSON.parse(http.calls.find(c => c.url.endsWith('/messages/send'))?.body ?? '{}') as { raw: string; threadId: string }
    expect(sendBody.threadId).toBe('t1')
    const mime = Base64UrlUtility.decodeToString(sendBody.raw)
    expect(mime).toContain('In-Reply-To: <plan-1@example.org>')
    expect(mime).toContain('Subject: Re: Quarterly plan')
  })

  it('signs out by revoking the token and clearing the cookie', async () => {
    const { container, cookies, http } = await signedIn()
    await container.accountManager.execute(new SignOutRequest())
    expect(cookies.values.has('mc_session')).toBe(false)
    expect(http.calls.some(c => c.url.includes('/revoke'))).toBe(true)
    const account = await container.accountManager.query(new GetAccountRequest())
    expect(account.error?.code).toBe('unauthenticated')
  })
})
