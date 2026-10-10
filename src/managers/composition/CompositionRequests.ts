import { RequestBase } from '@/common/RequestBase'
import type { OutgoingMessageInput } from '@/engines/composition/CompositionEngineRequests'
import type { GetComposeDraftResponse, SendMailResponse } from './CompositionResponses'

export type DraftMode = 'reply' | 'replyAll' | 'forward'

export class GetComposeDraftRequest extends RequestBase<GetComposeDraftResponse> {
  constructor(
    public readonly messageId: string,
    public readonly mode: DraftMode,
    public readonly timeZone: string = 'UTC',
  ) { super() }
}

export class SendMailRequest extends RequestBase<SendMailResponse> {
  constructor(
    public readonly input: OutgoingMessageInput,
    public readonly threadId: string | null,
  ) { super() }
}
