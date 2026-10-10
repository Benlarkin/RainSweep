import { RequestBase } from '@/common/RequestBase'
import type { BulkMessageAction, CleanupFilter, MessageMetadata } from '@/types'
import type { AnalyzeMailboxResponse, ApplyBulkActionResponse, ScanMailboxResponse, UnsubscribeResponse } from './CleanupResponses'

export type ScanScope = 'all' | 'inbox'

/**
 * One page of a metadata scan. The client pages until it has enough or runs out.
 * Each message is its own Gmail call, and Cloudflare's free plan allows 50
 * outbound calls per request, so a page stays well under that.
 */
export class ScanMailboxRequest extends RequestBase<ScanMailboxResponse> {
  constructor(
    public readonly scope: ScanScope,
    public readonly pageToken: string | null = null,
    public readonly pageSize: number = 40,
  ) { super() }
}

export class AnalyzeMailboxRequest extends RequestBase<AnalyzeMailboxResponse> {
  constructor(
    public readonly messages: MessageMetadata[],
    public readonly filter: CleanupFilter,
  ) { super() }
}

export const BULK_ACTIONS: readonly BulkMessageAction[] = ['trash', 'restore', 'archive', 'moveToInbox', 'markRead', 'markUnread']
export const MAX_BULK_MESSAGES = 10_000

export class ApplyBulkActionRequest extends RequestBase<ApplyBulkActionResponse> {
  constructor(
    public readonly messageIds: string[],
    public readonly action: BulkMessageAction,
  ) { super() }
}

export class UnsubscribeRequest extends RequestBase<UnsubscribeResponse> {
  /** The message whose List-Unsubscribe header to act on, re-read from the provider. */
  constructor(public readonly messageId: string) { super() }
}
