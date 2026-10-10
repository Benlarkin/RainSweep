import PostalMime from 'postal-mime'
import type { IHandler } from '@/common/resolver/IHandler'
import { failure } from '@/common/ResponseBase'
import type { AttachmentInfo } from '@/types'
import { Base64UrlUtility } from '@/utilities/Base64UrlUtility'
import { ParseMessageRequest } from '../MessageParsingEngineRequests'
import { ParseMessageResponse } from '../MessageParsingEngineResponses'
import { attachmentBytes, parseMessageIds, toMailAddresses } from './mimeMapping'
import { readUnsubscribe } from './unsubscribeRules'

/** Inline images larger than this stay as attachments rather than data: URIs. */
const MAX_INLINE_IMAGE_BYTES = 1_000_000

export class ParseMessageHandler implements IHandler<ParseMessageRequest> {
  async handle(request: ParseMessageRequest): Promise<ParseMessageResponse> {
    const { message } = request
    let email
    try {
      email = await PostalMime.parse(message.raw)
    } catch (err) {
      return new ParseMessageResponse(request.correlationId, null,
        failure('upstream_failure', `Could not parse message ${message.id}: ${String(err)}`))
    }

    let html = email.html ?? null
    const attachments: AttachmentInfo[] = email.attachments.map((attachment, index) => {
      const bytes = attachmentBytes(attachment)
      const cid = attachment.contentId?.replace(/^<|>$/g, '')
      let inline = false

      // Resolve cid: references so inline images render inside the sandboxed
      // frame, which is not allowed to fetch anything itself.
      if (html && cid && attachment.mimeType.startsWith('image/') && bytes.length <= MAX_INLINE_IMAGE_BYTES) {
        const ref = new RegExp(`cid:${escapeRegExp(cid)}`, 'gi')
        if (ref.test(html)) {
          html = html.replace(ref, `data:${attachment.mimeType};base64,${Base64UrlUtility.toBase64(bytes)}`)
          inline = true
        }
      }

      return {
        index,
        filename: attachment.filename ?? `attachment-${index + 1}`,
        mimeType: attachment.mimeType,
        size: bytes.length,
        inline,
      }
    })

    const from = toMailAddresses(email.from ? [email.from] : undefined)[0] ?? null
    const headerValue = (name: string): string | undefined => email.headers.find(h => h.key === name)?.value
    const parsedDate = email.date ? new Date(email.date) : null

    return new ParseMessageResponse(request.correlationId, {
      id: message.id,
      threadId: message.threadId,
      messageIdHeader: email.messageId ?? null,
      references: parseMessageIds(email.references),
      from,
      replyTo: toMailAddresses(email.replyTo),
      to: toMailAddresses(email.to),
      cc: toMailAddresses(email.cc),
      subject: email.subject ?? '',
      date: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : message.receivedAt,
      textBody: email.text ?? null,
      htmlBody: html,
      attachments,
      labelIds: message.labelIds,
      unread: message.unread,
      starred: message.starred,
      unsubscribe: readUnsubscribe(headerValue('list-unsubscribe'), headerValue('list-unsubscribe-post')),
    })
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
