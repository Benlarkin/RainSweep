import type { IHandler } from '@/common/resolver/IHandler'
import type { IMailAccessor } from '@/accessors/mail/IMailAccessor'
import { LoadMessageMetadataPageRequest } from '@/accessors/mail/MailRequests'
import type { IMessageParsingEngine } from '@/engines/messageParsing/IMessageParsingEngine'
import { ParseMetadataRequest } from '@/engines/messageParsing/MessageParsingEngineRequests'
import type { ActiveSessionActivity } from '../../shared/ActiveSessionActivity'
import { ScanMailboxRequest } from '../CleanupRequests'
import { ScanMailboxResponse } from '../CleanupResponses'

export class ScanMailboxHandler implements IHandler<ScanMailboxRequest> {
  constructor(
    private readonly activeSession: ActiveSessionActivity,
    private readonly mailAccessor: IMailAccessor,
    private readonly parsingEngine: IMessageParsingEngine,
  ) {}

  async handle(request: ScanMailboxRequest): Promise<ScanMailboxResponse> {
    const active = await this.activeSession.resolve()
    if (!active.ok) return new ScanMailboxResponse(request.correlationId, [], null, 0, active.failure)

    // "All mail" leaves out Spam and Trash, which the provider excludes by default.
    const loaded = await this.mailAccessor.load(new LoadMessageMetadataPageRequest(active.session.credentials.accessToken, {
      labelId: request.scope === 'inbox' ? 'INBOX' : null,
      search: '',
      pageToken: request.pageToken,
      pageSize: request.pageSize,
    }))
    if (!loaded.success) return new ScanMailboxResponse(request.correlationId, [], null, 0, loaded.error)

    const parsed = await this.parsingEngine.evaluate(new ParseMetadataRequest(loaded.messages))
    return new ScanMailboxResponse(request.correlationId, parsed.messages, loaded.nextPageToken, loaded.resultSizeEstimate)
  }
}
