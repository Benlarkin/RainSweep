import type { IHandler } from '@/common/resolver/IHandler'
import { failure } from '@/common/ResponseBase'
import { ConcurrencyUtility } from '@/utilities/ConcurrencyUtility'
import type { GmailClient } from '../gmail/GmailClient'
import { readIdList, readRawMessage } from '../gmail/gmailTypes'
import { LoadThreadRequest } from '../MailRequests'
import { LoadThreadResponse } from '../MailResponses'
import { toRawMailMessage } from './rawMessage'

export class LoadThreadHandler implements IHandler<LoadThreadRequest> {
  constructor(private readonly gmail: GmailClient) {}

  async handle(request: LoadThreadRequest): Promise<LoadThreadResponse> {
    const { accessToken, threadId } = request
    const thread = await this.gmail.get(accessToken, `/threads/${encodeURIComponent(threadId)}`, {
      format: 'minimal',
    })
    if (!thread.ok) return new LoadThreadResponse(request.correlationId, null, thread.failure)

    // threads.get has no raw format, so fetch each message's full MIME source.
    const { ids } = readIdList(thread.data, 'messages')
    const raws = await ConcurrencyUtility.mapWithLimit(ids, 4, async id => {
      const result = await this.gmail.get(accessToken, `/messages/${encodeURIComponent(id)}`, { format: 'raw' })
      return result.ok ? readRawMessage(result.data) : null
    })

    const messages = raws.filter(m => m !== null).map(toRawMailMessage)
    if (messages.length === 0) {
      return new LoadThreadResponse(request.correlationId, null, failure('not_found', 'That conversation is empty.'))
    }

    return new LoadThreadResponse(request.correlationId, {
      id: threadId,
      labelIds: [...new Set(messages.flatMap(m => m.labelIds))],
      messages,
    })
  }
}
