import { beforeEach, describe, expect, it } from 'vitest'
import { createContainer } from '@/container/DependencyContainer'
import { demoFetch } from '@/lib/server/demo/demoGoogle'
import { Base64UrlUtility } from '@/utilities/Base64UrlUtility'
import { BeginSignInRequest, CompleteSignInRequest } from '@/managers/account/AccountRequests'
import { GetThreadRequest, GetThreadsRequest, UpdateThreadRequest } from '@/managers/mailbox/MailboxRequests'
import { ScanMailboxRequest } from '@/managers/cleanup/CleanupRequests'
import { memoryCookieJar } from '../fakes'

const config = {
  googleClientId: 'demo',
  googleClientSecret: 'demo',
  appUrl: 'http://localhost:3000',
  sessionSecret: Base64UrlUtility.toBase64(new Uint8Array(32).fill(7)),
}

async function signedIn() {
  const container = createContainer({ config, cookies: memoryCookieJar(), fetchFn: demoFetch })
  const begin = await container.accountManager.execute(new BeginSignInRequest())
  const state = new URL(begin.authorizationUrl ?? '').searchParams.get('state') ?? ''
  const completed = await container.accountManager.execute(new CompleteSignInRequest('demo', state))
  return { container, completed }
}

describe('Demo mode: the real stack against the in-memory mailbox', () => {
  beforeEach(() => { delete (globalThis as { __rainsweepDemo?: unknown }).__rainsweepDemo })

  it('signs in as the demo account and lists the inbox', async () => {
    const { container, completed } = await signedIn()
    expect(completed.account?.email).toBe('jordan@example.com')
    const { page } = await container.mailboxManager.query(new GetThreadsRequest('INBOX'))
    expect(page?.threads.length).toBe(25)
    expect(page?.nextPageToken).toBeTruthy()
  })

  it('opens and parses a conversation, then archives it', async () => {
    const { container } = await signedIn()
    const { page } = await container.mailboxManager.query(new GetThreadsRequest('INBOX', 'kitchen'))
    const id = page?.threads[0]?.id ?? ''
    const { thread } = await container.mailboxManager.query(new GetThreadRequest(id))
    expect(thread?.messages).toHaveLength(2)
    expect(thread?.subject).toBe('Re: Kitchen remodel quote')

    await container.mailboxManager.execute(new UpdateThreadRequest(id, 'archive'))
    const after = await container.mailboxManager.query(new GetThreadsRequest('INBOX', 'kitchen'))
    expect(after.page?.threads).toHaveLength(0)
  })

  it('gives Clean up mailing lists with one-click unsubscribe to find', async () => {
    const { container } = await signedIn()
    const scan = await container.cleanupManager.query(new ScanMailboxRequest('all', null, 500))
    expect(scan.messages).toHaveLength(500)
    expect(scan.messages.some(m => m.unsubscribe !== null)).toBe(true)
  })
})
