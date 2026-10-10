import type { RequestBase, ResponseOf } from '@/common/RequestBase'

/** Mailing-list senders' own unsubscribe endpoints (RFC 8058 one-click). */
export interface ISubscriptionAccessor {
  unsubscribe<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>>
}
