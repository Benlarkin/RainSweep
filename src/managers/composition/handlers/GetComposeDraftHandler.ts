import type { IHandler } from '@/common/resolver/IHandler'
import type { IMailAccessor } from '@/accessors/mail/IMailAccessor'
import { LoadRawMessageRequest } from '@/accessors/mail/MailRequests'
import type { IMessageParsingEngine } from '@/engines/messageParsing/IMessageParsingEngine'
import { ParseMessageRequest } from '@/engines/messageParsing/MessageParsingEngineRequests'
import type { ICompositionEngine } from '@/engines/composition/ICompositionEngine'
import { PrepareForwardDraftRequest, PrepareReplyDraftRequest } from '@/engines/composition/CompositionEngineRequests'
import type { ActiveSessionActivity } from '../../shared/ActiveSessionActivity'
import { GetComposeDraftRequest } from '../CompositionRequests'
import { GetComposeDraftResponse } from '../CompositionResponses'

export class GetComposeDraftHandler implements IHandler<GetComposeDraftRequest> {
  constructor(
    private readonly activeSession: ActiveSessionActivity,
    private readonly mailAccessor: IMailAccessor,
    private readonly parsingEngine: IMessageParsingEngine,
    private readonly compositionEngine: ICompositionEngine,
  ) {}

  async handle(request: GetComposeDraftRequest): Promise<GetComposeDraftResponse> {
    const active = await this.activeSession.resolve()
    if (!active.ok) return new GetComposeDraftResponse(request.correlationId, null, active.failure)

    const loaded = await this.mailAccessor.load(
      new LoadRawMessageRequest(active.session.credentials.accessToken, request.messageId),
    )
    if (!loaded.message) return new GetComposeDraftResponse(request.correlationId, null, loaded.error)

    const parsed = await this.parsingEngine.evaluate(new ParseMessageRequest(loaded.message))
    if (!parsed.message) return new GetComposeDraftResponse(request.correlationId, null, parsed.error)

    const prepared = request.mode === 'forward'
      ? await this.compositionEngine.evaluate(new PrepareForwardDraftRequest(parsed.message, request.timeZone))
      : await this.compositionEngine.evaluate(new PrepareReplyDraftRequest(
          parsed.message, request.mode === 'replyAll', active.session.account, request.timeZone,
        ))
    return new GetComposeDraftResponse(request.correlationId, prepared.draft, prepared.error)
  }
}
