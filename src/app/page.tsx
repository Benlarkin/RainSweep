import { redirect } from 'next/navigation'
import { getContainer } from '@/lib/server/container'
import { GetAccountRequest } from '@/managers/account/AccountRequests'

export default async function HomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const { accountManager } = await getContainer()
  const { account } = await accountManager.query(new GetAccountRequest())
  if (account) redirect('/mail')

  return (
    <main className="min-h-full flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={72} height={72} className="mx-auto" />
          <h1 className="text-3xl font-semibold tracking-tight">Mail</h1>
          <p className="text-muted">A fast, installable client for your Gmail.</p>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </p>
        )}

        {/* A plain link: the OAuth flow is a full-page redirect, not a fetch. */}
        <a
          href="/api/auth/google/start"
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-accent px-4 py-3 font-medium text-accent-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Sign in with Google
        </a>

        <p className="text-xs text-muted">
          Your mail stays in Gmail. This app keeps only an encrypted session cookie in your browser.
        </p>
      </div>
    </main>
  )
}
