import { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type {
  LoadLabelsResponse,
  LoadThreadPageResponse,
  LoadThreadResponse,
  LoadRawMessageResponse,
  SendMessageResponse,
  ThreadStateResponse,
} from './MailResponses'

// Every request carries the caller's access token: the accessor is stateless
// and never decides whose mailbox it is talking to.
abstract class MailRequestBase<TResponse extends ResponseBase> extends RequestBase<TResponse> {
  constructor(public readonly accessToken: string) { super() }
}

// ── load ──────────────────────────────────────────────────────────────────────

export class LoadLabelsRequest extends MailRequestBase<LoadLabelsResponse> {}

export interface ThreadPageQuery {
  labelId: string | null
  search: string
  pageToken: string | null
  pageSize: number
}

export class LoadThreadPageRequest extends MailRequestBase<LoadThreadPageResponse> {
  constructor(accessToken: string, public readonly query: ThreadPageQuery) { super(accessToken) }
}

export class LoadThreadRequest extends MailRequestBase<LoadThreadResponse> {
  constructor(accessToken: string, public readonly threadId: string) { super(accessToken) }
}

export class LoadRawMessageRequest extends MailRequestBase<LoadRawMessageResponse> {
  constructor(accessToken: string, public readonly messageId: string) { super(accessToken) }
}

// ── store ─────────────────────────────────────────────────────────────────────

export class SendMessageRequest extends MailRequestBase<SendMessageResponse> {
  constructor(
    accessToken: string,
    public readonly raw: string,
    public readonly threadId: string | null,
  ) { super(accessToken) }
}

abstract class ThreadStateRequest extends MailRequestBase<ThreadStateResponse> {
  constructor(accessToken: string, public readonly threadId: string) { super(accessToken) }
}

export class ArchiveThreadRequest extends ThreadStateRequest {}
export class MoveThreadToInboxRequest extends ThreadStateRequest {}
export class TrashThreadRequest extends ThreadStateRequest {}
export class RestoreThreadFromTrashRequest extends ThreadStateRequest {}

export class SetThreadReadRequest extends ThreadStateRequest {
  constructor(accessToken: string, threadId: string, public readonly read: boolean) { super(accessToken, threadId) }
}

export class SetThreadStarredRequest extends ThreadStateRequest {
  constructor(accessToken: string, threadId: string, public readonly starred: boolean) { super(accessToken, threadId) }
}
