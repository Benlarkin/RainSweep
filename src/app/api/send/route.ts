import { getContainer } from '@/lib/server/container'
import { badRequest, errorJson, isRecord, okJson, readJson, rejectCrossSite } from '@/lib/server/http'
import { SendMailRequest } from '@/managers/composition/CompositionRequests'
import type { AttachmentContent, MailAddress } from '@/types'
import { AddressUtility } from '@/utilities/AddressUtility'
import { Base64UrlUtility } from '@/utilities/Base64UrlUtility'

export async function POST(request: Request) {
  const rejected = rejectCrossSite(request)
  if (rejected) return rejected

  const body = await readJson(request)
  if (!isRecord(body)) return badRequest('Expected a JSON body.')

  const attachments = readAttachments(body.attachments)
  if (attachments === null) return badRequest('Attachments must be { filename, mimeType, data } with base64 data.')

  const { compositionManager } = await getContainer()
  const result = await compositionManager.execute(new SendMailRequest(
    {
      to: readAddresses(body.to),
      cc: readAddresses(body.cc),
      bcc: readAddresses(body.bcc),
      subject: typeof body.subject === 'string' ? body.subject : '',
      body: typeof body.body === 'string' ? body.body : '',
      inReplyTo: typeof body.inReplyTo === 'string' ? body.inReplyTo : null,
      references: Array.isArray(body.references) ? body.references.filter((r): r is string => typeof r === 'string') : [],
      attachments,
    },
    typeof body.threadId === 'string' ? body.threadId : null,
  ))

  return result.success ? okJson({ messageId: result.messageId, threadId: result.threadId }, 201) : errorJson(result)
}

/** Accepts either a header-style string or an array of { name, address }. */
function readAddresses(value: unknown): MailAddress[] {
  if (typeof value === 'string') return AddressUtility.parseList(value)
  if (!Array.isArray(value)) return []
  return value.flatMap((item): MailAddress[] => {
    if (typeof item === 'string') return AddressUtility.parseList(item)
    if (isRecord(item) && typeof item.address === 'string') {
      return [{ name: typeof item.name === 'string' && item.name ? item.name : null, address: item.address }]
    }
    return []
  })
}

function readAttachments(value: unknown): AttachmentContent[] | null {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) return null
  const files: AttachmentContent[] = []
  for (const item of value) {
    if (!isRecord(item) || typeof item.filename !== 'string' || typeof item.data !== 'string') return null
    try {
      files.push({
        filename: item.filename,
        mimeType: typeof item.mimeType === 'string' ? item.mimeType : 'application/octet-stream',
        content: Base64UrlUtility.fromBase64(item.data),
      })
    } catch {
      return null
    }
  }
  return files
}
