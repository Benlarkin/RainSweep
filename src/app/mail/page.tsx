import { redirect } from 'next/navigation'
import { getContainer } from '@/lib/server/container'
import { GetAccountRequest } from '@/managers/account/AccountRequests'
import { MailApp } from '@/components/mail/MailApp'
import { parseView } from '@/lib/client/mailView'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function MailPage({ searchParams }: { searchParams: SearchParams }) {
  const { accountManager } = await getContainer()
  const { account } = await accountManager.query(new GetAccountRequest())
  if (!account) redirect('/')

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === 'string') params.set(key, value)
  }

  return <MailApp account={account} initialView={parseView(params)} composeRequest={params.get('compose')} />
}
