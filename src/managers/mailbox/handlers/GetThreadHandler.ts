import type { IHandler } from '@/common/resolver/IHandler'
import type { IMailAccessor } from '@/accessors/mail/IMailAccessor'
import { LoadThreadRequest, SetThreadReadRequest } from '@/accessors/mail/MailRequests'
import type { IMessageParsingEngine } from '@/engines/messageParsing/IMessageParsingEngine'
import { ParseMessageRequest } from '@/engines/messageParsing/MessageParsingEngineRequests'
import type { MailMessage } from '@/types'
import type { ActiveSessionActivity } from '../../shared/ActiveSessionActivity'
import { GetThreadRequest } from '../MailboxRequests'
import { GetThreadResponse } from '../MailboxResponses'

export class GetThreadHandler implements IHandler<GetThreadRequest> {
  constructor(
    private readonly activeSession: ActiveSessionActivity,
    private readonly mailAccessor: IMailAccessor,
    private readonly parsingEngine: IMessageParsingEngine,
  ) {}

  async handle(request: GetThreadRequest): Promise<GetThreadResponse> {
    const active = await this.activeSession.resolve()
    if (!active.ok) return new GetThreadResponse(request.correlationId, null, active.failure)
    const { accessToken } = active.session.credentials

    const loaded = await this.mailAccessor.load(new LoadThreadRequest(accessToken, request.threadId))
    if (!loaded.thread) return new GetThreadResponse(request.correlationId, null, loaded.error)

    const parsed = await Promise.all(loaded.thread.messages.map(m => this.parsingEngine.evaluate(new ParseMessageRequest(m))))
    const messages: MailMessage[] = parsed
      .map(p => p.message)
      .filter(m => m !== null)
      .sort((a, b) => a.date.localeCompare(b.date))

    // Opening a conversation reads it. The response reflects the new state
    // even though the provider update runs alongside.
    const wasUnread = messages.some(m => m.unread)
    if (request.markAsRead && wasUnread) {
      await this.mailAccessor.store(new SetThreadReadRequest(accessToken, request.threadId, true))
      messages.forEach(m => { m.unread = false })
    }

    return new GetThreadResponse(request.correlationId, {
      id: loaded.thread.id,
      subject: messages[0]?.subject ?? '',
      messages,
      labelIds: loaded.thread.labelIds,
    })
  }
}
