import { getContainer } from '@/lib/server/container'
import { badRequest, errorJson, isRecord, okJson, readJson, rejectCrossSite } from '@/lib/server/http'
import { ApplyBulkActionRequest, BULK_ACTIONS } from '@/managers/cleanup/CleanupRequests'
import type { BulkMessageAction } from '@/types'

function isBulkAction(value: unknown): value is BulkMessageAction {
  return typeof value === 'string' && (BULK_ACTIONS as readonly string[]).includes(value)
}

export async function POST(request: Request) {
  const rejected = rejectCrossSite(request)
  if (rejected) return rejected

  const body = await readJson(request)
  if (!isRecord(body) || !Array.isArray(body.messageIds) || !isBulkAction(body.action)) {
    return badRequest(`Expected { messageIds: string[], action: ${BULK_ACTIONS.join(' | ')} }.`)
  }
  const ids = body.messageIds.filter((id): id is string => typeof id === 'string' && /^[\w-]+$/.test(id))

  const { cleanupManager } = await getContainer()
  const result = await cleanupManager.execute(new ApplyBulkActionRequest(ids, body.action))
  return result.success ? okJson({ updatedCount: result.updatedCount }) : errorJson(result)
}
