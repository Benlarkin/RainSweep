import type { IHandler } from '@/common/resolver/IHandler'
import {
  ClearSessionRequest,
  LoadSessionRequest,
  RemovePendingSignInRequest,
  StorePendingSignInRequest,
  StoreSessionRequest,
} from '../SessionRequests'
import {
  ClearSessionResponse,
  LoadSessionResponse,
  RemovePendingSignInResponse,
  StorePendingSignInResponse,
  StoreSessionResponse,
} from '../SessionResponses'
import { PENDING_COOKIE, SESSION_COOKIE, type SessionCookies } from './SessionCookies'

export class LoadSessionHandler implements IHandler<LoadSessionRequest> {
  constructor(private readonly cookies: SessionCookies) {}
  async handle(request: LoadSessionRequest): Promise<LoadSessionResponse> {
    return new LoadSessionResponse(request.correlationId, await this.cookies.readSession())
  }
}

export class StoreSessionHandler implements IHandler<StoreSessionRequest> {
  constructor(private readonly cookies: SessionCookies) {}
  async handle(request: StoreSessionRequest): Promise<StoreSessionResponse> {
    await this.cookies.writeSession(request.session)
    return new StoreSessionResponse(request.correlationId)
  }
}

export class ClearSessionHandler implements IHandler<ClearSessionRequest> {
  constructor(private readonly cookies: SessionCookies) {}
  async handle(request: ClearSessionRequest): Promise<ClearSessionResponse> {
    this.cookies.delete(SESSION_COOKIE)
    return new ClearSessionResponse(request.correlationId)
  }
}

export class StorePendingSignInHandler implements IHandler<StorePendingSignInRequest> {
  constructor(private readonly cookies: SessionCookies) {}
  async handle(request: StorePendingSignInRequest): Promise<StorePendingSignInResponse> {
    await this.cookies.writePending(request.pending)
    return new StorePendingSignInResponse(request.correlationId)
  }
}

export class RemovePendingSignInHandler implements IHandler<RemovePendingSignInRequest> {
  constructor(private readonly cookies: SessionCookies) {}
  async handle(request: RemovePendingSignInRequest): Promise<RemovePendingSignInResponse> {
    const pending = await this.cookies.readPending()
    this.cookies.delete(PENDING_COOKIE)
    return new RemovePendingSignInResponse(request.correlationId, pending)
  }
}
