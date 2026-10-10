import type { RequestBase, ResponseOf } from '@/common/RequestBase'

/**
 * Atomic business verbs against the user's mailbox. The interface is
 * provider-neutral: the Gmail handlers behind it are the only code in the
 * system that knows Gmail exists, so an IMAP or Microsoft Graph provider is a
 * new set of handlers registered in the container, with no Manager changes.
 */
export interface IMailAccessor {
  load<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>>
  store<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>>
}
