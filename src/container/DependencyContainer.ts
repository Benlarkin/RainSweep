import { HandlerResolverBuilder } from '@/common/resolver/HandlerResolverBuilder'
import type { AppConfig } from '@/lib/config'
import { CryptoUtility } from '@/utilities/CryptoUtility'

// Accessors — Mail (Gmail)
import { MailAccessor } from '@/accessors/mail/MailAccessor'
import { GmailClient } from '@/accessors/mail/gmail/GmailClient'
import { LoadLabelsHandler } from '@/accessors/mail/handlers/LoadLabelsHandler'
import { LoadThreadPageHandler } from '@/accessors/mail/handlers/LoadThreadPageHandler'
import { LoadThreadHandler } from '@/accessors/mail/handlers/LoadThreadHandler'
import { LoadRawMessageHandler } from '@/accessors/mail/handlers/LoadRawMessageHandler'
import { SendMessageHandler } from '@/accessors/mail/handlers/SendMessageHandler'
import {
  ArchiveThreadHandler,
  MoveThreadToInboxHandler,
  RestoreThreadFromTrashHandler,
  SetThreadReadHandler,
  SetThreadStarredHandler,
  TrashThreadHandler,
} from '@/accessors/mail/handlers/ThreadStateHandlers'
import {
  LoadLabelsRequest,
  LoadThreadPageRequest,
  LoadThreadRequest,
  LoadRawMessageRequest,
  SendMessageRequest,
  ArchiveThreadRequest,
  MoveThreadToInboxRequest,
  TrashThreadRequest,
  RestoreThreadFromTrashRequest,
  SetThreadReadRequest,
  SetThreadStarredRequest,
} from '@/accessors/mail/MailRequests'

// Accessors — Identity (Google OAuth)
import { IdentityAccessor } from '@/accessors/identity/IdentityAccessor'
import { BuildAuthorizationUrlHandler } from '@/accessors/identity/handlers/BuildAuthorizationUrlHandler'
import { ExchangeAuthorizationCodeHandler } from '@/accessors/identity/handlers/ExchangeAuthorizationCodeHandler'
import { RefreshCredentialsHandler } from '@/accessors/identity/handlers/RefreshCredentialsHandler'
import { RevokeCredentialsHandler } from '@/accessors/identity/handlers/RevokeCredentialsHandler'
import {
  BuildAuthorizationUrlRequest,
  ExchangeAuthorizationCodeRequest,
  RefreshCredentialsRequest,
  RevokeCredentialsRequest,
} from '@/accessors/identity/IdentityRequests'

// Accessors — Session (encrypted cookies)
import type { CookieJar } from '@/accessors/session/CookieJar'
import { SessionAccessor } from '@/accessors/session/SessionAccessor'
import { SessionCookies } from '@/accessors/session/handlers/SessionCookies'
import {
  ClearSessionHandler,
  LoadSessionHandler,
  RemovePendingSignInHandler,
  StorePendingSignInHandler,
  StoreSessionHandler,
} from '@/accessors/session/handlers/SessionHandlers'
import {
  ClearSessionRequest,
  LoadSessionRequest,
  RemovePendingSignInRequest,
  StorePendingSignInRequest,
  StoreSessionRequest,
} from '@/accessors/session/SessionRequests'

// Engines — Message parsing
import { MessageParsingEngine } from '@/engines/messageParsing/MessageParsingEngine'
import { ParseMessageHandler } from '@/engines/messageParsing/handlers/ParseMessageHandler'
import { ExtractAttachmentHandler } from '@/engines/messageParsing/handlers/ExtractAttachmentHandler'
import { ParseMessageRequest, ExtractAttachmentRequest } from '@/engines/messageParsing/MessageParsingEngineRequests'

// Engines — Composition
import { CompositionEngine } from '@/engines/composition/CompositionEngine'
import { PrepareReplyDraftHandler } from '@/engines/composition/handlers/PrepareReplyDraftHandler'
import { PrepareForwardDraftHandler } from '@/engines/composition/handlers/PrepareForwardDraftHandler'
import { BuildOutgoingMessageHandler } from '@/engines/composition/handlers/BuildOutgoingMessageHandler'
import {
  PrepareReplyDraftRequest,
  PrepareForwardDraftRequest,
  BuildOutgoingMessageRequest,
} from '@/engines/composition/CompositionEngineRequests'

// Managers
import { ActiveSessionActivity } from '@/managers/shared/ActiveSessionActivity'
import { AccountManager } from '@/managers/account/AccountManager'
import type { IAccountManager } from '@/managers/account/IAccountManager'
import { BeginSignInHandler } from '@/managers/account/handlers/BeginSignInHandler'
import { CompleteSignInHandler } from '@/managers/account/handlers/CompleteSignInHandler'
import { SignOutHandler } from '@/managers/account/handlers/SignOutHandler'
import { GetAccountHandler } from '@/managers/account/handlers/GetAccountHandler'
import { BeginSignInRequest, CompleteSignInRequest, SignOutRequest, GetAccountRequest } from '@/managers/account/AccountRequests'

import { MailboxManager } from '@/managers/mailbox/MailboxManager'
import type { IMailboxManager } from '@/managers/mailbox/IMailboxManager'
import { GetLabelsHandler } from '@/managers/mailbox/handlers/GetLabelsHandler'
import { GetThreadsHandler } from '@/managers/mailbox/handlers/GetThreadsHandler'
import { GetThreadHandler } from '@/managers/mailbox/handlers/GetThreadHandler'
import { GetAttachmentHandler } from '@/managers/mailbox/handlers/GetAttachmentHandler'
import { UpdateThreadHandler } from '@/managers/mailbox/handlers/UpdateThreadHandler'
import {
  GetLabelsRequest,
  GetThreadsRequest,
  GetThreadRequest,
  GetAttachmentRequest,
  UpdateThreadRequest,
} from '@/managers/mailbox/MailboxRequests'

import { CompositionManager } from '@/managers/composition/CompositionManager'
import type { ICompositionManager } from '@/managers/composition/ICompositionManager'
import { GetComposeDraftHandler } from '@/managers/composition/handlers/GetComposeDraftHandler'
import { SendMailHandler } from '@/managers/composition/handlers/SendMailHandler'
import { GetComposeDraftRequest, SendMailRequest } from '@/managers/composition/CompositionRequests'

/** Clients see Managers only. */
export interface Container {
  accountManager: IAccountManager
  mailboxManager: IMailboxManager
  compositionManager: ICompositionManager
}

export interface ContainerOptions {
  config: AppConfig
  cookies: CookieJar
  fetchFn?: typeof fetch
}

export function createContainer({ config, cookies, fetchFn = fetch }: ContainerOptions): Container {
  // ── Accessors ──────────────────────────────────────────────────────────────

  const gmail = new GmailClient(fetchFn)
  const mailAccessor = new MailAccessor(
    new HandlerResolverBuilder()
      .register(LoadLabelsRequest, new LoadLabelsHandler(gmail))
      .register(LoadThreadPageRequest, new LoadThreadPageHandler(gmail))
      .register(LoadThreadRequest, new LoadThreadHandler(gmail))
      .register(LoadRawMessageRequest, new LoadRawMessageHandler(gmail))
      .build(),
    new HandlerResolverBuilder()
      .register(SendMessageRequest, new SendMessageHandler(gmail))
      .register(ArchiveThreadRequest, new ArchiveThreadHandler(gmail))
      .register(MoveThreadToInboxRequest, new MoveThreadToInboxHandler(gmail))
      .register(TrashThreadRequest, new TrashThreadHandler(gmail))
      .register(RestoreThreadFromTrashRequest, new RestoreThreadFromTrashHandler(gmail))
      .register(SetThreadReadRequest, new SetThreadReadHandler(gmail))
      .register(SetThreadStarredRequest, new SetThreadStarredHandler(gmail))
      .build(),
  )

  const oauth = {
    clientId: config.googleClientId,
    clientSecret: config.googleClientSecret,
    redirectUri: `${config.appUrl}/api/auth/google/callback`,
  }
  const identityAccessor = new IdentityAccessor(
    new HandlerResolverBuilder()
      .register(BuildAuthorizationUrlRequest, new BuildAuthorizationUrlHandler(oauth))
      .register(ExchangeAuthorizationCodeRequest, new ExchangeAuthorizationCodeHandler(oauth, fetchFn))
      .register(RefreshCredentialsRequest, new RefreshCredentialsHandler(oauth, fetchFn))
      .build(),
    new HandlerResolverBuilder()
      .register(RevokeCredentialsRequest, new RevokeCredentialsHandler(fetchFn))
      .build(),
  )

  let key: Promise<CryptoKey> | null = null
  const sessionCookies = new SessionCookies(cookies, {
    key: () => (key ??= CryptoUtility.importKey(config.sessionSecret)),
    secure: config.appUrl.startsWith('https://'),
  })
  const sessionAccessor = new SessionAccessor(
    new HandlerResolverBuilder()
      .register(LoadSessionRequest, new LoadSessionHandler(sessionCookies))
      .build(),
    new HandlerResolverBuilder()
      .register(StoreSessionRequest, new StoreSessionHandler(sessionCookies))
      .register(StorePendingSignInRequest, new StorePendingSignInHandler(sessionCookies))
      .build(),
    new HandlerResolverBuilder()
      .register(ClearSessionRequest, new ClearSessionHandler(sessionCookies))
      .register(RemovePendingSignInRequest, new RemovePendingSignInHandler(sessionCookies))
      .build(),
  )

  // ── Engines ────────────────────────────────────────────────────────────────

  const parsingEngine = new MessageParsingEngine(
    new HandlerResolverBuilder()
      .register(ParseMessageRequest, new ParseMessageHandler())
      .register(ExtractAttachmentRequest, new ExtractAttachmentHandler())
      .build(),
  )

  const compositionEngine = new CompositionEngine(
    new HandlerResolverBuilder()
      .register(PrepareReplyDraftRequest, new PrepareReplyDraftHandler())
      .register(PrepareForwardDraftRequest, new PrepareForwardDraftHandler())
      .register(BuildOutgoingMessageRequest, new BuildOutgoingMessageHandler())
      .build(),
  )

  // ── Managers ───────────────────────────────────────────────────────────────

  const activeSession = new ActiveSessionActivity(sessionAccessor, identityAccessor)

  const accountManager = new AccountManager(
    new HandlerResolverBuilder()
      .register(BeginSignInRequest, new BeginSignInHandler(sessionAccessor, identityAccessor))
      .register(CompleteSignInRequest, new CompleteSignInHandler(sessionAccessor, identityAccessor))
      .register(SignOutRequest, new SignOutHandler(sessionAccessor, identityAccessor))
      .build(),
    new HandlerResolverBuilder()
      .register(GetAccountRequest, new GetAccountHandler(sessionAccessor))
      .build(),
  )

  const mailboxManager = new MailboxManager(
    new HandlerResolverBuilder()
      .register(UpdateThreadRequest, new UpdateThreadHandler(activeSession, mailAccessor))
      .build(),
    new HandlerResolverBuilder()
      .register(GetLabelsRequest, new GetLabelsHandler(activeSession, mailAccessor))
      .register(GetThreadsRequest, new GetThreadsHandler(activeSession, mailAccessor))
      .register(GetThreadRequest, new GetThreadHandler(activeSession, mailAccessor, parsingEngine))
      .register(GetAttachmentRequest, new GetAttachmentHandler(activeSession, mailAccessor, parsingEngine))
      .build(),
  )

  const compositionManager = new CompositionManager(
    new HandlerResolverBuilder()
      .register(SendMailRequest, new SendMailHandler(activeSession, mailAccessor, compositionEngine))
      .build(),
    new HandlerResolverBuilder()
      .register(GetComposeDraftRequest, new GetComposeDraftHandler(activeSession, mailAccessor, parsingEngine, compositionEngine))
      .build(),
  )

  return { accountManager, mailboxManager, compositionManager }
}
