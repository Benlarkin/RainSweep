import { NextResponse } from 'next/server'
import { getContainer } from '@/lib/server/container'
import { rejectCrossSite } from '@/lib/server/http'
import { SignOutRequest } from '@/managers/account/AccountRequests'

export async function POST(request: Request) {
  const rejected = rejectCrossSite(request)
  if (rejected) return rejected

  const { accountManager } = await getContainer()
  await accountManager.execute(new SignOutRequest())
  return new NextResponse(null, { status: 204 })
}
