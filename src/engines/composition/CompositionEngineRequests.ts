import { RequestBase } from '@/common/RequestBase'
import type { Account, AttachmentContent, MailAddress, MailMessage } from '@/types'
import type { PrepareDraftResponse, BuildOutgoingMessageResponse } from './CompositionEngineResponses'

export class PrepareReplyDraftRequest extends RequestBase<PrepareDraftResponse> {
  constructor(
    public readonly original: MailMessage,
    public readonly replyAll: boolean,
    public readonly self: Account,
    public readonly timeZone: string,
  ) { super() }
}

export class PrepareForwardDraftRequest extends RequestBase<PrepareDraftResponse> {
  constructor(
    public readonly original: MailMessage,
    public readonly timeZone: string,
  ) { super() }
}

export interface OutgoingMessageInput {
  to: MailAddress[]
  cc: MailAddress[]
  bcc: MailAddress[]
  subject: string
  body: string
  inReplyTo: string | null
  references: string[]
  attachments: AttachmentContent[]
}

export class BuildOutgoingMessageRequest extends RequestBase<BuildOutgoingMessageResponse> {
  constructor(
    public readonly sender: Account,
    public readonly input: OutgoingMessageInput,
  ) { super() }
}
