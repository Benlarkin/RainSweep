import { getContainer } from '@/lib/server/container'
import { badRequest, errorJson, isRecord, okJson, readJson, rejectCrossSite } from '@/lib/server/http'
import { UnsubscribeRequest } from '@/managers/cleanup/CleanupRequests'

export async function POST(request: Request) {
  const rejected = rejectCrossSite(request)
  if (rejected) return rejected

  const body = await readJson(request)
  if (!isRecord(body) || typeof body.messageId !== 'string') return badRequest('Expected { messageId }.')

  const { cleanupManager } = await getContainer()
  const result = await cleanupManager.execute(new UnsubscribeRequest(body.messageId))
  return result.result ? okJson({ result: result.result }) : errorJson(result)
}
