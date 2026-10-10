import type { NextRequest } from 'next/server'
import { getContainer } from '@/lib/server/container'
import { errorJson, okJson } from '@/lib/server/http'
import { GetThreadsRequest } from '@/managers/mailbox/MailboxRequests'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const search = (params.get('q') ?? '').slice(0, 500)
  // An empty label with a search means "all mail".
  const label = params.get('label') || null

  const { mailboxManager } = await getContainer()
  const result = await mailboxManager.query(new GetThreadsRequest(label, search, params.get('pageToken')))
  return result.page ? okJson(result.page) : errorJson(result)
}
