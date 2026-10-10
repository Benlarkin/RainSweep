import type { NextRequest } from 'next/server'
import { getContainer } from '@/lib/server/container'
import { errorJson, okJson } from '@/lib/server/http'
import { ScanMailboxRequest } from '@/managers/cleanup/CleanupRequests'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const scope = params.get('scope') === 'inbox' ? 'inbox' : 'all'

  const { cleanupManager } = await getContainer()
  const result = await cleanupManager.query(new ScanMailboxRequest(scope, params.get('pageToken')))
  return result.success
    ? okJson({ messages: result.messages, nextPageToken: result.nextPageToken, resultSizeEstimate: result.resultSizeEstimate })
    : errorJson(result)
}
