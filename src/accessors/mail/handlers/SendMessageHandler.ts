import type { IHandler } from '@/common/resolver/IHandler'
import { Base64UrlUtility } from '@/utilities/Base64UrlUtility'
import type { GmailClient } from '../gmail/GmailClient'
import { isRecord } from '../gmail/GmailClient'
import { SendMessageRequest } from '../MailRequests'
import { SendMessageResponse } from '../MailResponses'

export class SendMessageHandler implements IHandler<SendMessageRequest> {
  constructor(private readonly gmail: GmailClient) {}

  async handle(request: SendMessageRequest): Promise<SendMessageResponse> {
    const result = await this.gmail.post(request.accessToken, '/messages/send', {
      raw: Base64UrlUtility.encode(request.raw),
      ...(request.threadId ? { threadId: request.threadId } : {}),
    })
    if (!result.ok) return new SendMessageResponse(request.correlationId, null, null, result.failure)

    const data = isRecord(result.data) ? result.data : {}
    return new SendMessageResponse(
      request.correlationId,
      typeof data.id === 'string' ? data.id : null,
      typeof data.threadId === 'string' ? data.threadId : null,
    )
  }
}
