import PostalMime from 'postal-mime'
import type { IHandler } from '@/common/resolver/IHandler'
import { failure } from '@/common/ResponseBase'
import { ExtractAttachmentRequest } from '../MessageParsingEngineRequests'
import { ExtractAttachmentResponse } from '../MessageParsingEngineResponses'
import { attachmentBytes } from './mimeMapping'

export class ExtractAttachmentHandler implements IHandler<ExtractAttachmentRequest> {
  async handle(request: ExtractAttachmentRequest): Promise<ExtractAttachmentResponse> {
    let email
    try {
      email = await PostalMime.parse(request.message.raw)
    } catch (err) {
      return new ExtractAttachmentResponse(request.correlationId, null, failure('upstream_failure', String(err)))
    }

    const attachment = email.attachments[request.attachmentIndex]
    if (!attachment) {
      return new ExtractAttachmentResponse(request.correlationId, null, failure('not_found', 'Attachment not found'))
    }

    return new ExtractAttachmentResponse(request.correlationId, {
      filename: attachment.filename ?? `attachment-${request.attachmentIndex + 1}`,
      mimeType: attachment.mimeType || 'application/octet-stream',
      content: attachmentBytes(attachment),
    })
  }
}
