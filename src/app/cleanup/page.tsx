import { redirect } from 'next/navigation'
import { getContainer } from '@/lib/server/container'
import { GetAccountRequest } from '@/managers/account/AccountRequests'
import { CleanupApp } from '@/components/cleanup/CleanupApp'

export const metadata = { title: 'Clean up · RainSweep' }

export default async function CleanupPage() {
  const { accountManager } = await getContainer()
  const { account } = await accountManager.query(new GetAccountRequest())
  if (!account) redirect('/')
  return <CleanupApp account={account} />
}
