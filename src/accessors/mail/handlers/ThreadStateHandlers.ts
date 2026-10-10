import type { IHandler } from '@/common/resolver/IHandler'
import type { GmailClient, GmailResult } from '../gmail/GmailClient'
import {
  ArchiveThreadRequest,
  MoveThreadToInboxRequest,
  RestoreThreadFromTrashRequest,
  SetThreadReadRequest,
  SetThreadStarredRequest,
  TrashThreadRequest,
} from '../MailRequests'
import { ThreadStateResponse } from '../MailResponses'

// Each business verb maps to Gmail's label model here, and only here:
// "archive" in Gmail means "remove the INBOX label".

function modify(gmail: GmailClient, accessToken: string, threadId: string, add: string[], remove: string[]): Promise<GmailResult<unknown>> {
  return gmail.post(accessToken, `/threads/${encodeURIComponent(threadId)}/modify`, {
    addLabelIds: add,
    removeLabelIds: remove,
  })
}

function respond(correlationId: string, threadId: string, result: GmailResult<unknown>): ThreadStateResponse {
  return new ThreadStateResponse(correlationId, threadId, result.ok ? null : result.failure)
}

export class ArchiveThreadHandler implements IHandler<ArchiveThreadRequest> {
  constructor(private readonly gmail: GmailClient) {}
  async handle(r: ArchiveThreadRequest): Promise<ThreadStateResponse> {
    return respond(r.correlationId, r.threadId, await modify(this.gmail, r.accessToken, r.threadId, [], ['INBOX']))
  }
}

export class MoveThreadToInboxHandler implements IHandler<MoveThreadToInboxRequest> {
  constructor(private readonly gmail: GmailClient) {}
  async handle(r: MoveThreadToInboxRequest): Promise<ThreadStateResponse> {
    return respond(r.correlationId, r.threadId, await modify(this.gmail, r.accessToken, r.threadId, ['INBOX'], []))
  }
}

export class TrashThreadHandler implements IHandler<TrashThreadRequest> {
  constructor(private readonly gmail: GmailClient) {}
  async handle(r: TrashThreadRequest): Promise<ThreadStateResponse> {
    return respond(r.correlationId, r.threadId,
      await this.gmail.post(r.accessToken, `/threads/${encodeURIComponent(r.threadId)}/trash`))
  }
}

export class RestoreThreadFromTrashHandler implements IHandler<RestoreThreadFromTrashRequest> {
  constructor(private readonly gmail: GmailClient) {}
  async handle(r: RestoreThreadFromTrashRequest): Promise<ThreadStateResponse> {
    return respond(r.correlationId, r.threadId,
      await this.gmail.post(r.accessToken, `/threads/${encodeURIComponent(r.threadId)}/untrash`))
  }
}

export class SetThreadReadHandler implements IHandler<SetThreadReadRequest> {
  constructor(private readonly gmail: GmailClient) {}
  async handle(r: SetThreadReadRequest): Promise<ThreadStateResponse> {
    const [add, remove] = r.read ? [[], ['UNREAD']] : [['UNREAD'], []]
    return respond(r.correlationId, r.threadId, await modify(this.gmail, r.accessToken, r.threadId, add, remove))
  }
}

export class SetThreadStarredHandler implements IHandler<SetThreadStarredRequest> {
  constructor(private readonly gmail: GmailClient) {}
  async handle(r: SetThreadStarredRequest): Promise<ThreadStateResponse> {
    const [add, remove] = r.starred ? [['STARRED'], []] : [[], ['STARRED']]
    return respond(r.correlationId, r.threadId, await modify(this.gmail, r.accessToken, r.threadId, add, remove))
  }
}
