import { getContainer } from '@/lib/server/container'
import { errorJson, okJson } from '@/lib/server/http'
import { GetLabelsRequest } from '@/managers/mailbox/MailboxRequests'

export async function GET() {
  const { mailboxManager } = await getContainer()
  const result = await mailboxManager.query(new GetLabelsRequest())
  return result.success ? okJson({ labels: result.labels }) : errorJson(result)
}
