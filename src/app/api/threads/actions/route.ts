import { getContainer } from '@/lib/server/container'
import { badRequest, errorJson, isRecord, okJson, readJson, rejectCrossSite } from '@/lib/server/http'
import { THREAD_ACTIONS, UpdateThreadsRequest, type ThreadAction } from '@/managers/mailbox/MailboxRequests'

function isThreadAction(value: unknown): value is ThreadAction {
  return typeof value === 'string' && (THREAD_ACTIONS as readonly string[]).includes(value)
}

/** Bulk version of /api/threads/[threadId]/actions for multi-select. */
export async function POST(request: Request) {
  const rejected = rejectCrossSite(request)
  if (rejected) return rejected

  const body = await readJson(request)
  if (!isRecord(body) || !Array.isArray(body.threadIds) || !isThreadAction(body.action)) {
    return badRequest(`Expected { threadIds: string[], action: ${THREAD_ACTIONS.join(' | ')} }.`)
  }
  const ids = body.threadIds.filter((id): id is string => typeof id === 'string')

  const { mailboxManager } = await getContainer()
  const result = await mailboxManager.execute(new UpdateThreadsRequest(ids, body.action))
  return result.success ? okJson({ updatedIds: result.updatedIds, failedIds: result.failedIds }) : errorJson(result)
}
