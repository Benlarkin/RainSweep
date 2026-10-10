import type { IHandler } from '@/common/resolver/IHandler'
import type { IMailAccessor } from '@/accessors/mail/IMailAccessor'
import { LoadRawMessageRequest } from '@/accessors/mail/MailRequests'
import type { IMessageParsingEngine } from '@/engines/messageParsing/IMessageParsingEngine'
import { ExtractAttachmentRequest } from '@/engines/messageParsing/MessageParsingEngineRequests'
import type { ActiveSessionActivity } from '../../shared/ActiveSessionActivity'
import { GetAttachmentRequest } from '../MailboxRequests'
import { GetAttachmentResponse } from '../MailboxResponses'

export class GetAttachmentHandler implements IHandler<GetAttachmentRequest> {
  constructor(
    private readonly activeSession: ActiveSessionActivity,
    private readonly mailAccessor: IMailAccessor,
    private readonly parsingEngine: IMessageParsingEngine,
  ) {}

  async handle(request: GetAttachmentRequest): Promise<GetAttachmentResponse> {
    const active = await this.activeSession.resolve()
    if (!active.ok) return new GetAttachmentResponse(request.correlationId, null, active.failure)

    const loaded = await this.mailAccessor.load(
      new LoadRawMessageRequest(active.session.credentials.accessToken, request.messageId),
    )
    if (!loaded.message) return new GetAttachmentResponse(request.correlationId, null, loaded.error)

    const extracted = await this.parsingEngine.evaluate(new ExtractAttachmentRequest(loaded.message, request.attachmentIndex))
    return new GetAttachmentResponse(request.correlationId, extracted.attachment, extracted.error)
  }
}
