# Mail — Planning

## Phase 1 — Functional Gmail client (this PR)

- [x] Google sign-in (OAuth code + PKCE), encrypted session, token refresh, sign-out with revoke
- [x] Labels with unread counts
- [x] Thread list with infinite scroll and Gmail search syntax
- [x] Conversation view: sandboxed HTML, remote images blocked by default, inline images, attachments
- [x] Archive, move to inbox, trash, restore, read/unread, star, with optimistic UI and Undo
- [x] Compose, reply, reply-all, forward, attachments, Undo send, local draft autosave
- [x] Keyboard shortcuts (Gmail-style)
- [x] PWA: installable, offline reading of recently opened mail, app badge, mailto: handler, new-mail notifications while open
- [x] Light and dark themes, responsive down to phone width
- [x] Architecture test enforcing iDesign call rules

## Phase 2 — Depth

- [ ] Gmail drafts sync (`DraftAccessor` verbs on `MailAccessor`)
- [ ] Rich-text compose and signatures (`CompositionEngine`)
- [ ] Forward with original attachments
- [ ] Apply/remove user labels, move to label
- [ ] Contacts autocomplete (People API behind a new `ContactsAccessor`)
- [ ] Multi-select and bulk actions

## Phase 3 — Real-time and multi-account

- [ ] Gmail push via Pub/Sub `users.watch` → Web Push (`NotificationManager`, `PushAccessor`), replacing polling
- [ ] Server-side sessions in Supabase (swap `SessionAccessor` handlers), enabling multiple accounts
- [ ] Second provider (IMAP/SMTP or Microsoft Graph) as alternate `MailAccessor` handlers, proving the provider volatility is contained
