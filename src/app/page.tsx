import { redirect } from 'next/navigation'
import { getContainer } from '@/lib/server/container'
import { GetAccountRequest } from '@/managers/account/AccountRequests'
import { isDemoMode } from '@/lib/config'

export default async function HomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const { accountManager } = await getContainer()
  const { account } = await accountManager.query(new GetAccountRequest())
  if (account) redirect('/mail')

  return (
    <main className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-4 border-b-[1.5px] border-foreground pb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={56} height={56} />
          <p className="meta">A field guide to your mail</p>
          <h1 className="font-display text-[3.4rem] font-semibold leading-[0.95] tracking-tight">Rain<em className="font-normal">Sweep</em></h1>
          <p className="text-[1.15rem] leading-relaxed text-muted">Read the people who wrote to you first. Sweep the newsletters, receipts and notifications that pile up around them.</p>
        </div>

        {error && (
          <p role="alert" className="border-l-4 border-marker bg-letter px-4 py-3 italic">
            {error}
          </p>
        )}

        {/* A plain link: the OAuth flow is a full-page redirect, not a fetch. */}
        <a
          href="/api/auth/google/start"
          className="flex w-full items-center justify-between border-[1.5px] border-foreground bg-letter px-5 py-3.5 font-display text-lg font-semibold transition hover:bg-foreground hover:text-background"
        >
          {isDemoMode() ? 'Open the demo mailbox' : 'Sign in with Google'}
          <span aria-hidden="true">→</span>
        </a>

        <p className="text-[0.95rem] italic text-muted">
          {isDemoMode()
            ? 'Demo mode: a made-up mailbox that resets when the server restarts. Nothing touches Gmail.'
            : 'Your mail stays in Gmail. This app keeps only an encrypted session cookie in your browser.'}
        </p>
      </div>
    </main>
  )
}
