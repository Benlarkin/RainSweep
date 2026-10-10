import type { IHandler } from '@/common/resolver/IHandler'
import { failure } from '@/common/ResponseBase'
import type { IMailAccessor } from '@/accessors/mail/IMailAccessor'
import { LoadMessageMetadataRequest, SendMessageRequest } from '@/accessors/mail/MailRequests'
import type { ISubscriptionAccessor } from '@/accessors/subscription/ISubscriptionAccessor'
import { OneClickUnsubscribeRequest } from '@/accessors/subscription/SubscriptionRequests'
import type { IMessageParsingEngine } from '@/engines/messageParsing/IMessageParsingEngine'
import { ParseMetadataRequest } from '@/engines/messageParsing/MessageParsingEngineRequests'
import type { ICompositionEngine } from '@/engines/composition/ICompositionEngine'
import { BuildOutgoingMessageRequest } from '@/engines/composition/CompositionEngineRequests'
import type { Session, UnsubscribeOptions } from '@/types'
import { MailtoUtility } from '@/utilities/MailtoUtility'
import type { ActiveSessionActivity } from '../../shared/ActiveSessionActivity'
import { UnsubscribeRequest } from '../CleanupRequests'
import { UnsubscribeResponse } from '../CleanupResponses'

/**
 * Picks the strongest unsubscribe method a sender offers:
 *   1. RFC 8058 one-click POST, done by the server.
 *   2. mailto:, sent from the user's own account.
 *   3. A web page the user has to visit themselves.
 * The options are re-read from the provider rather than taken from the
 * client, so this endpoint can't be used to POST to arbitrary URLs.
 */
export class UnsubscribeHandler implements IHandler<UnsubscribeRequest> {
  constructor(
    private readonly activeSession: ActiveSessionActivity,
    private readonly mailAccessor: IMailAccessor,
    private readonly subscriptionAccessor: ISubscriptionAccessor,
    private readonly parsingEngine: IMessageParsingEngine,
    private readonly compositionEngine: ICompositionEngine,
  ) {}

  async handle(request: UnsubscribeRequest): Promise<UnsubscribeResponse> {
    const active = await this.activeSession.resolve()
    if (!active.ok) return new UnsubscribeResponse(request.correlationId, null, active.failure)

    const loaded = await this.mailAccessor.load(new LoadMessageMetadataRequest(active.session.credentials.accessToken, request.messageId))
    if (!loaded.message) return new UnsubscribeResponse(request.correlationId, null, loaded.error)

    const [metadata] = (await this.parsingEngine.evaluate(new ParseMetadataRequest([loaded.message]))).messages
    const options = metadata?.unsubscribe
    if (!options) {
      return new UnsubscribeResponse(request.correlationId, null, failure('not_found', 'This sender doesn’t offer an unsubscribe option.'))
    }

    if (options.oneClick && options.httpUrl) {
      const posted = await this.subscriptionAccessor.unsubscribe(new OneClickUnsubscribeRequest(options.httpUrl))
      if (posted.success) return new UnsubscribeResponse(request.correlationId, { method: 'one-click', completed: true, url: null })
      // Fall through to the next method if the sender's endpoint failed.
    }

    if (options.mailto) {
      const sent = await this.sendMailto(active.session, options.mailto)
      if (sent) return new UnsubscribeResponse(request.correlationId, { method: 'mailto', completed: true, url: null })
    }

    return this.linkOrFail(request.correlationId, options)
  }

  private async sendMailto(session: Session, mailto: string): Promise<boolean> {
    const fields = MailtoUtility.parse(mailto)
    if (!fields || fields.to.length === 0) return false
    const built = await this.compositionEngine.evaluate(new BuildOutgoingMessageRequest(session.account, {
      to: fields.to, cc: [], bcc: [],
      subject: fields.subject || 'Unsubscribe',
      body: fields.body || 'Please unsubscribe me from this list.',
      inReplyTo: null, references: [], attachments: [],
    }))
    if (!built.raw) return false
    const sent = await this.mailAccessor.store(new SendMessageRequest(session.credentials.accessToken, built.raw, null))
    return sent.success
  }

  private linkOrFail(correlationId: string, options: UnsubscribeOptions): UnsubscribeResponse {
    if (options.httpUrl) return new UnsubscribeResponse(correlationId, { method: 'link', completed: false, url: options.httpUrl })
    return new UnsubscribeResponse(correlationId, null, failure('upstream_failure', 'The unsubscribe request didn’t go through. Try again later.'))
  }
}
