'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { Account, MailMessage } from '@/types'
import type { ThreadAction } from '@/managers/mailbox/MailboxRequests'
import type { DraftMode } from '@/managers/composition/CompositionRequests'
import { MailtoUtility } from '@/utilities/MailtoUtility'
import { mailApi } from '@/lib/client/mailApi'
import { clearOfflineMail } from '@/components/pwa/ServiceWorkerRegistration'
import { Toast, type ToastState } from '@/components/ui/Toast'
import { MenuIcon, RefreshIcon, SearchIcon } from '@/components/ui/Icons'
import { Sidebar } from './Sidebar'
import { ThreadList } from './ThreadList'
import { ThreadView } from './ThreadView'
import { ComposeDialog } from './ComposeDialog'
import { ShortcutsHelp } from './ShortcutsHelp'
import { useMailbox, type MailView } from './useMailbox'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import {
  clearLocalDraft, composeFromDraft, composeFromMailto, emptyCompose, fileToBase64, loadLocalDraft, type ComposeState,
} from './composeState'

/** Seconds a sent message waits before going out, so "Undo" can stop it. */
const UNDO_SEND_MS = 5000

const noSubscribe = () => () => undefined

/** A browser capability, read after hydration so server and client markup match. */
function useBrowserCapability(probe: () => boolean): boolean {
  return useSyncExternalStore(noSubscribe, probe, () => false)
}

function initialCompose(request: string | null): ComposeState | null {
  if (!request) return null
  const mailto = MailtoUtility.parse(request)
  return mailto ? composeFromMailto(mailto) : emptyCompose()
}

interface MailAppProps {
  account: Account
  initialView: MailView
  /** `new` or a mailto: URL, from the manifest shortcut or protocol handler. */
  composeRequest: string | null
}

export function MailApp({ account, initialView, composeRequest }: MailAppProps) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const notify = useCallback((message: string, undo?: () => void, tone?: 'error') => {
    setToast({ id: Date.now(), message, tone, actionLabel: undo ? 'Undo' : undefined, onAction: undo })
  }, [])

  const mailbox = useMailbox(initialView, notify)
  const { view, navigate, labels, list, thread, focusIndex, setFocusIndex, offline, act } = mailbox

  const [compose, setCompose] = useState<ComposeState | null>(() => initialCompose(composeRequest))
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [searchText, setSearchText] = useState(view.search)
  const [searchSource, setSearchSource] = useState(view.search)
  if (searchSource !== view.search) {
    // Back/forward changed the search; reflect it in the box.
    setSearchSource(view.search)
    setSearchText(view.search)
  }
  const [notifyAsked, setNotifyAsked] = useState(false)
  const notificationsAvailable = useBrowserCapability(() => typeof Notification !== 'undefined' && Notification.permission === 'default')
  const canNotify = notificationsAvailable && !notifyAsked
  const canHandleMailto = useBrowserCapability(() => 'registerProtocolHandler' in navigator)
  const searchInput = useRef<HTMLInputElement>(null)

  // The compose request was consumed into state; drop it from the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has('compose')) return
    params.delete('compose')
    window.history.replaceState(null, '', `/mail${params.size ? `?${params}` : ''}`)
  }, [])

  // ── Composition ────────────────────────────────────────────────────────────

  const openCompose = useCallback(() => setCompose(loadLocalDraft() ?? emptyCompose()), [])

  const respond = useCallback(async (message: MailMessage, mode: DraftMode) => {
    try {
      const { draft } = await mailApi.draft(message.id, mode)
      setCompose(composeFromDraft(draft))
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not start a reply.', undefined, 'error')
    }
  }, [notify])

  const send = useCallback((state: ComposeState) => {
    setCompose(null)
    let cancelled = false
    const timer = setTimeout(async () => {
      if (cancelled) return
      try {
        const attachments = await Promise.all(state.attachments.map(async f => ({
          filename: f.name, mimeType: f.type || 'application/octet-stream', data: await fileToBase64(f),
        })))
        await mailApi.send({
          to: state.to, cc: state.cc, bcc: state.bcc, subject: state.subject, body: state.body,
          threadId: state.threadId, inReplyTo: state.inReplyTo, references: state.references, attachments,
        })
        clearLocalDraft()
        notify('Message sent')
        if (state.threadId && state.threadId === view.threadId) void mailbox.reloadThread(state.threadId)
      } catch (err) {
        notify(err instanceof Error ? err.message : 'Sending failed.', undefined, 'error')
        setCompose(state)   // reopen so nothing is lost
      }
    }, UNDO_SEND_MS)
    setToast({
      id: Date.now(), message: 'Sending…', actionLabel: 'Undo', durationMs: UNDO_SEND_MS,
      onAction: () => { cancelled = true; clearTimeout(timer); setCompose(state) },
    })
  }, [notify, view.threadId, mailbox])

  // ── Navigation helpers ─────────────────────────────────────────────────────

  const openThread = useCallback((id: string) => navigate({ threadId: id }), [navigate])
  const backToList = useCallback(() => navigate({ threadId: null }), [navigate])
  const selectLabel = useCallback((id: string) => {
    setSidebarOpen(false)
    navigate({ label: id, search: '', threadId: null })
  }, [navigate])

  const currentIndex = view.threadId ? list.threads.findIndex(t => t.id === view.threadId) : focusIndex
  const step = (delta: number) => {
    const next = Math.min(Math.max(currentIndex + delta, 0), list.threads.length - 1)
    if (next < 0) return
    setFocusIndex(next)
    if (view.threadId && list.threads[next]) openThread(list.threads[next].id)
  }
  const targetId = view.threadId ?? list.threads[focusIndex]?.id ?? null
  const actOnTarget = (action: ThreadAction) => { if (targetId) void act(targetId, action) }
  const lastMessage = thread.data?.messages[thread.data.messages.length - 1]

  useKeyboardShortcuts({
    c: openCompose,
    '/': () => searchInput.current?.focus(),
    '?': () => setShowHelp(true),
    j: () => step(1),
    k: () => step(-1),
    o: () => { if (list.threads[focusIndex]) openThread(list.threads[focusIndex].id) },
    Enter: () => { if (!view.threadId && list.threads[focusIndex]) openThread(list.threads[focusIndex].id) },
    u: backToList,
    Escape: () => { if (showHelp) setShowHelp(false); else backToList() },
    e: () => actOnTarget('archive'),
    '#': () => actOnTarget('trash'),
    s: () => {
      const t = list.threads.find(x => x.id === targetId)
      const starred = t?.starred ?? thread.data?.messages.some(m => m.starred) ?? false
      actOnTarget(starred ? 'unstar' : 'star')
    },
    I: () => actOnTarget('markRead'),
    U: () => { actOnTarget('markUnread'); if (view.threadId) backToList() },
    r: () => { if (lastMessage) void respond(lastMessage, 'reply') },
    a: () => { if (lastMessage) void respond(lastMessage, 'replyAll') },
    f: () => { if (lastMessage) void respond(lastMessage, 'forward') },
    'g i': () => selectLabel('INBOX'),
    'g s': () => selectLabel('STARRED'),
    'g t': () => selectLabel('SENT'),
  }, compose === null)

  // ── Device integrations ────────────────────────────────────────────────────

  const enableNotifications = async () => {
    const result = await Notification.requestPermission()
    setNotifyAsked(true)
    notify(result === 'granted' ? 'You’ll be notified about new mail while the app is in the background.' : 'Notifications stay off.')
  }

  const makeDefaultMailApp = () => {
    try {
      navigator.registerProtocolHandler('mailto', `${window.location.origin}/mail?compose=%s`)
      notify('Your browser will ask to confirm opening mailto: links here.')
    } catch {
      notify('This browser doesn’t allow that.', undefined, 'error')
    }
  }

  const signOut = async () => {
    await mailApi.signOut().catch(() => undefined)
    await clearOfflineMail().catch(() => undefined)
    clearLocalDraft()
    if ('clearAppBadge' in navigator) void navigator.clearAppBadge().catch(() => undefined)
    window.location.href = '/'
  }

  const currentLabel = labels.find(l => l.id === view.label)
  const heading = view.search ? `Results for “${view.search}”` : currentLabel?.name ?? view.label ?? 'All mail'

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar: fixed column on desktop, drawer on mobile. */}
      <div className={`fixed inset-0 z-30 bg-black/30 md:hidden ${sidebarOpen ? '' : 'hidden'}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-background transition-transform md:static md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar
          account={account}
          labels={labels}
          currentLabel={view.search ? null : view.label}
          onSelectLabel={selectLabel}
          onCompose={() => { setSidebarOpen(false); openCompose() }}
          onSignOut={signOut}
          onShowShortcuts={() => setShowHelp(true)}
          onEnableNotifications={canNotify ? enableNotifications : null}
          onMakeDefaultMailApp={canHandleMailto ? makeDefaultMailApp : null}
        />
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-surface md:my-2 md:mr-2 md:rounded-2xl md:border md:border-border">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <button type="button" aria-label="Open menu" className="rounded-full p-2 text-muted md:hidden" onClick={() => setSidebarOpen(true)}><MenuIcon /></button>
          <form role="search" className="flex flex-1 items-center gap-2 rounded-full bg-surface-muted px-4 py-2"
            onSubmit={e => { e.preventDefault(); navigate({ search: searchText.trim(), label: searchText.trim() ? null : 'INBOX', threadId: null }) }}>
            <SearchIcon width={18} height={18} className="text-muted" />
            <input ref={searchInput} type="search" placeholder="Search mail" aria-label="Search mail" value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { e.currentTarget.blur() } }}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted" />
          </form>
          <button type="button" aria-label="Refresh" title="Refresh" onClick={mailbox.refresh} className="rounded-full p-2 text-muted hover:bg-surface-muted"><RefreshIcon width={18} height={18} /></button>
        </div>

        {offline && (
          <p role="status" className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            You’re offline. Showing mail saved on this device.
          </p>
        )}

        <div className="flex min-h-0 flex-1">
          <section aria-label={heading}
            className={`min-w-0 flex-col border-border lg:flex lg:w-[400px] lg:flex-none lg:border-r ${view.threadId ? 'hidden' : 'flex flex-1'}`}>
            <h2 className="px-4 pb-1 pt-3 text-sm font-semibold text-muted">{heading}</h2>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ThreadList
                threads={list.threads}
                selectedId={view.threadId}
                focusIndex={focusIndex}
                loading={list.loading}
                loadingMore={list.loadingMore}
                error={list.error}
                hasMore={Boolean(list.nextPageToken)}
                emptyMessage={view.search ? 'No conversations match your search.' : 'Nothing here. Enjoy the quiet.'}
                onOpen={openThread}
                onFocus={setFocusIndex}
                onAction={(id, action) => void act(id, action)}
                onLoadMore={mailbox.loadMore}
                onRetry={mailbox.refresh}
              />
            </div>
          </section>

          <section aria-label="Conversation" className={`min-w-0 flex-1 ${view.threadId ? 'block' : 'hidden lg:block'}`}>
            {view.threadId
              ? <ThreadView thread={thread.data} loading={thread.loading} error={thread.error} onBack={backToList}
                  onAction={action => { if (view.threadId) void act(view.threadId, action) }} onRespond={respond} />
              : <div className="flex h-full items-center justify-center text-sm text-muted">Select a conversation to read it.</div>}
          </section>
        </div>
      </main>

      {compose && (
        <ComposeDialog key={`${compose.mode}-${compose.inReplyTo ?? 'new'}`} initial={compose} offline={offline}
          onSend={send} onDiscard={() => { clearLocalDraft(); setCompose(null) }} />
      )}
      {showHelp && <ShortcutsHelp onClose={() => setShowHelp(false)} />}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
