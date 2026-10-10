import type { IHandler } from '@/common/resolver/IHandler'
import { failure } from '@/common/ResponseBase'
import type { ISessionAccessor } from '@/accessors/session/ISessionAccessor'
import { LoadSessionRequest } from '@/accessors/session/SessionRequests'
import { GetAccountRequest } from '../AccountRequests'
import { GetAccountResponse } from '../AccountResponses'

export class GetAccountHandler implements IHandler<GetAccountRequest> {
  constructor(private readonly sessionAccessor: ISessionAccessor) {}

  async handle(request: GetAccountRequest): Promise<GetAccountResponse> {
    const { session } = await this.sessionAccessor.load(new LoadSessionRequest())
    return session
      ? new GetAccountResponse(request.correlationId, session.account)
      : new GetAccountResponse(request.correlationId, null, failure('unauthenticated', 'Not signed in.'))
  }
}
