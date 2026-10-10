import { getContainer } from '@/lib/server/container'
import { errorJson, okJson } from '@/lib/server/http'
import { GetThreadRequest } from '@/managers/mailbox/MailboxRequests'

export async function GET(_request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  const { mailboxManager } = await getContainer()
  const result = await mailboxManager.query(new GetThreadRequest(threadId))
  return result.thread ? okJson({ thread: result.thread }) : errorJson(result)
}
