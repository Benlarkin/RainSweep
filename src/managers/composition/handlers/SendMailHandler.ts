import type { IHandler } from '@/common/resolver/IHandler'
import type { IMailAccessor } from '@/accessors/mail/IMailAccessor'
import { SendMessageRequest } from '@/accessors/mail/MailRequests'
import type { ICompositionEngine } from '@/engines/composition/ICompositionEngine'
import { BuildOutgoingMessageRequest } from '@/engines/composition/CompositionEngineRequests'
import type { ActiveSessionActivity } from '../../shared/ActiveSessionActivity'
import { SendMailRequest } from '../CompositionRequests'
import { SendMailResponse } from '../CompositionResponses'

export class SendMailHandler implements IHandler<SendMailRequest> {
  constructor(
    private readonly activeSession: ActiveSessionActivity,
    private readonly mailAccessor: IMailAccessor,
    private readonly compositionEngine: ICompositionEngine,
  ) {}

  async handle(request: SendMailRequest): Promise<SendMailResponse> {
    const active = await this.activeSession.resolve()
    if (!active.ok) return new SendMailResponse(request.correlationId, null, null, active.failure)

    const built = await this.compositionEngine.evaluate(new BuildOutgoingMessageRequest(active.session.account, request.input))
    if (!built.raw) return new SendMailResponse(request.correlationId, null, null, built.error)

    const sent = await this.mailAccessor.store(
      new SendMessageRequest(active.session.credentials.accessToken, built.raw, request.threadId),
    )
    return new SendMailResponse(request.correlationId, sent.messageId, sent.threadId, sent.error)
  }
}
