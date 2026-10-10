import type { RequestBase, ResponseOf } from '@/common/RequestBase'

/** The identity provider (Google OAuth 2.0 today). */
export interface IIdentityAccessor {
  authorize<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>>
  revoke<TRequest extends RequestBase>(request: TRequest): Promise<ResponseOf<TRequest>>
}
