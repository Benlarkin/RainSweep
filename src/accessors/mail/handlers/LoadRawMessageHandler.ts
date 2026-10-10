import type { IHandler } from '@/common/resolver/IHandler'
import { failure } from '@/common/ResponseBase'
import type { GmailClient } from '../gmail/GmailClient'
import { readRawMessage } from '../gmail/gmailTypes'
import { LoadRawMessageRequest } from '../MailRequests'
import { LoadRawMessageResponse } from '../MailResponses'
import { toRawMailMessage } from './rawMessage'

export class LoadRawMessageHandler implements IHandler<LoadRawMessageRequest> {
  constructor(private readonly gmail: GmailClient) {}

  async handle(request: LoadRawMessageRequest): Promise<LoadRawMessageResponse> {
    const result = await this.gmail.get(request.accessToken, `/messages/${encodeURIComponent(request.messageId)}`, {
      format: 'raw',
    })
    if (!result.ok) return new LoadRawMessageResponse(request.correlationId, null, result.failure)

    const message = readRawMessage(result.data)
    if (!message) {
      return new LoadRawMessageResponse(request.correlationId, null, failure('upstream_failure', 'Gmail returned an unreadable message.'))
    }
    return new LoadRawMessageResponse(request.correlationId, toRawMailMessage(message))
  }
}
