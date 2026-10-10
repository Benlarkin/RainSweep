@AGENTS.md

# RainSweep — Project Instructions

## What This Is

RainSweep is a Gmail client built as a PWA, and a working example of **iDesign** (Juval Löwy's volatility-based decomposition). Sign in with Google, read, search, archive, star, reply, forward and send, with keyboard shortcuts, offline reading and install support. Clean up groups mail by sender, mailing list, subject, size and age for one-click unsubscribe and bulk trash, with an insights dashboard.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the layer map, volatility analysis, flows and security model.
See [PLANNING.md](PLANNING.md) for what's next.

---

## Architecture

**Stack:** Next.js (App Router) · TypeScript (strict) · Gmail API · Google OAuth (PKCE) · Tailwind CSS · Vitest · Hosted on Cloudflare Workers (OpenNext)

| Layer | Components |
|---|---|
| Client | `app/` (pages, route handlers), `components/` |
| Manager | `AccountManager`, `MailboxManager`, `CompositionManager`, `CleanupManager` (+ `shared/ActiveSessionActivity`) |
| Engine | `MessageParsingEngine`, `CompositionEngine`, `GroupingEngine` |
| Accessor | `MailAccessor` (Gmail), `IdentityAccessor` (Google OAuth), `SessionAccessor` (encrypted cookie), `SubscriptionAccessor` (one-click unsubscribe) |
| Utility | `AddressUtility`, `MimeUtility`, `CryptoUtility`, `Base64UrlUtility`, `ConcurrencyUtility`, `MailtoUtility` |

All component classes are thin shells over `HandlerResolver` instances. All logic lives in `handlers/`. Wiring happens only in `src/container/DependencyContainer.ts`.

### Call rules (enforced by `tests/architecture.test.ts`)

- Clients → Managers only. The browser talks to route handlers over HTTP.
- Managers → Engines, Accessors, Utilities. Never Manager → Manager; put shared steps in `managers/shared/`.
- Engines → Accessors, Utilities. Never Engine → Engine. No I/O in Engines.
- Accessors → Utilities only. Never Accessor → Accessor. No business logic in Accessors.
- Utilities → nothing above them.
- Nothing outside `accessors/mail` may know Gmail exists. Domain types in `src/types` stay provider-neutral.

### Adding a use case

1. Add `<Operation>Request extends RequestBase<<Operation>Response>` and the response to the Manager's `*Requests.ts` / `*Responses.ts`.
2. Write `handlers/<Operation>Handler.ts implementing IHandler<<Operation>Request>`.
3. Put rules in an Engine and resource calls in an Accessor (new verbs get their own request + handler there too).
4. Register every handler in `DependencyContainer.ts`.
5. Expose it through a route handler in `app/api/`, validating the body with type guards.
6. Test the Engine in isolation and the flow through `createContainer` with `fakeFetch`.

---

## TypeScript Rules

- `strict: true`, no `any`. Use `unknown` at external boundaries and narrow with type guards.
- Prefer type declarations over assertions. The resolver's single internal cast is the exception.
- Every operation uses typed Request/Response objects inheriting `RequestBase<TResponse>` / `ResponseBase`.
- Failures are values: `ResponseBase.error` carries `{ code, message }`, and route handlers map `code` to HTTP status.

---

## Naming Conventions

| Thing | Convention |
|---|---|
| Request types | `<Operation>Request`, e.g. `GetThreadRequest`, `ArchiveThreadRequest` |
| Response types | `<Operation>Response` |
| Handler files | `<Operation>Handler.ts` |
| Interfaces | `I<Name>Manager`, `I<Name>Engine`, `I<Name>Accessor` |
| Accessor verbs | Business verbs (`ArchiveThread`), never CRUD on provider concepts (`ModifyLabels`) |

---

## What NOT to Do

- Do not call `fetch` to Google or Gmail anywhere but an Accessor handler.
- Do not import `next/*` into Managers, Engines or Accessors. The container injects a `CookieJar` and `fetch`.
- Do not render email HTML outside `MessageBody`'s sandboxed iframe, and never add `allow-scripts` to it.
- Do not commit secrets. `.env*` is git-ignored; `.env.example` documents the variables.
- Do not store mail server-side. The service worker's cache is per-device and cleared on sign-out.
