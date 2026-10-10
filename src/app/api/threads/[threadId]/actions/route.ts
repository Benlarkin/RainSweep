import { getContainer } from '@/lib/server/container'
import { badRequest, errorJson, isRecord, okJson, readJson, rejectCrossSite } from '@/lib/server/http'
import { THREAD_ACTIONS, UpdateThreadRequest, type ThreadAction } from '@/managers/mailbox/MailboxRequests'

function isThreadAction(value: unknown): value is ThreadAction {
  return typeof value === 'string' && (THREAD_ACTIONS as readonly string[]).includes(value)
}

export async function POST(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const rejected = rejectCrossSite(request)
  if (rejected) return rejected

  const body = await readJson(request)
  if (!isRecord(body) || !isThreadAction(body.action)) {
    return badRequest(`action must be one of: ${THREAD_ACTIONS.join(', ')}`)
  }

  const { threadId } = await params
  const { mailboxManager } = await getContainer()
  const result = await mailboxManager.execute(new UpdateThreadRequest(threadId, body.action))
  return result.success ? okJson({ threadId: result.threadId, action: body.action }) : errorJson(result)
}
