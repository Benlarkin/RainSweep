import { RequestBase } from '@/common/RequestBase'
import type { GetLabelsResponse, GetThreadsResponse, GetThreadResponse, GetAttachmentResponse, UpdateThreadResponse } from './MailboxResponses'

export class GetLabelsRequest extends RequestBase<GetLabelsResponse> {}

export class GetThreadsRequest extends RequestBase<GetThreadsResponse> {
  constructor(
    public readonly labelId: string | null,
    public readonly search: string = '',
    public readonly pageToken: string | null = null,
    public readonly pageSize: number = 25,
  ) { super() }
}

export class GetThreadRequest extends RequestBase<GetThreadResponse> {
  constructor(
    public readonly threadId: string,
    public readonly markAsRead: boolean = true,
  ) { super() }
}

export class GetAttachmentRequest extends RequestBase<GetAttachmentResponse> {
  constructor(
    public readonly messageId: string,
    public readonly attachmentIndex: number,
  ) { super() }
}

export const THREAD_ACTIONS = ['archive', 'moveToInbox', 'trash', 'restore', 'markRead', 'markUnread', 'star', 'unstar'] as const
export type ThreadAction = (typeof THREAD_ACTIONS)[number]

export class UpdateThreadRequest extends RequestBase<UpdateThreadResponse> {
  constructor(
    public readonly threadId: string,
    public readonly action: ThreadAction,
  ) { super() }
}
