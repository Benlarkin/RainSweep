'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { Account, MailMessage } from '@/types'
import type { ThreadAction } from '@/managers/mailbox/MailboxRequests'
import type { DraftMode } from '@/managers/composition/CompositionRequests'
import { MailtoUtility } from '@/utilities/MailtoUtility'
import { mailApi } from '@/lib/client/mailApi'
import { clearOfflineMail } from '@/components/pwa/ServiceWorkerRegistration'
import { Toast, type ToastState } from '@/components/ui/Toast'
import { ArchiveIcon, CloseIcon, MailIcon, MailOpenIcon, MenuIcon, RefreshIcon, SearchIcon, TrashIcon } from '@/components/ui/Icons'
import { Sidebar } from './Sidebar'
import { ThreadList, type SweepTray } from './ThreadList'
import { ThreadView } from './ThreadView'
import { ComposeDialog } from './ComposeDialog'
import { ShortcutsHelp } from './ShortcutsHelp'
import { useMailbox, type MailView } from './useMailbox'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import { confirmAndUnsubscribe } from './unsubscribe'
import { AddressUtility } from '@/utilities/AddressUtility'
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
  const { view, navigate, labels, list, thread, focusIndex, setFocusIndex, offline, act, actMany, selected } = mailbox

  // People first: in the inbox, mail from lists and shops folds into a tray below conversations with people.
  const [trayOpen, setTrayOpen] = useState(false)
  const peopleFirst = view.label === 'INBOX' && !view.search
  const people = peopleFirst ? list.threads.filter(t => !t.fromMailingList) : list.threads
  const bulk = peopleFirst ? list.threads.filter(t => t.fromMailingList) : []
  const ordered = bulk.length ? [...people, ...bulk] : list.threads
  const threads = bulk.length && !trayOpen ? people : ordered
  const tray: SweepTray | null = bulk.length === 0 ? null : {
    position: people.length,
    count: bulk.length,
    senders: [...new Set(bulk.flatMap(t => t.participants.slice(-1).map(AddressUtility.displayName)))],
    expanded: trayOpen,
    onToggle: () => setTrayOpen(open => !open),
    onSweep: () => void actMany(bulk.map(t => t.id), 'archive'),
  }

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

  const unsubscribe = useCallback(async (message: MailMessage) => {
    const sender = message.from
    const label = sender ? AddressUtility.displayName(sender) : 'this sender'
    const result = await confirmAndUnsubscribe(message.id, label, (text, action, tone) =>
      setToast({ id: Date.now(), message: text, tone, actionLabel: action?.label, onAction: action?.run, durationMs: 10_000 }))
    if (result?.completed && sender) {
      // Offer the natural follow-up: everything they already sent.
      setToast({
        id: Date.now(), durationMs: 10_000,
        message: `Unsubscribed from ${label}.`,
        actionLabel: 'Show their mail',
        onAction: () => navigate({ search: `from:${sender.address}`, label: null, threadId: null }),
      })
    }
  }, [navigate])

  // ── Navigation helpers ─────────────────────────────────────────────────────

  const openThread = useCallback((id: string) => navigate({ threadId: id }), [navigate])
  const backToList = useCallback(() => navigate({ threadId: null }), [navigate])
  const selectLabel = useCallback((id: string) => {
    setSidebarOpen(false)
    navigate({ label: id, search: '', threadId: null })
  }, [navigate])

  const currentIndex = view.threadId ? threads.findIndex(t => t.id === view.threadId) : focusIndex
  const step = (delta: number) => {
    const next = Math.min(Math.max(currentIndex + delta, 0), threads.length - 1)
    if (next < 0) return
    setFocusIndex(next)
    if (view.threadId && threads[next]) openThread(threads[next].id)
  }
  const targetId = view.threadId ?? threads[focusIndex]?.id ?? null
  // With conversations checked, actions apply to all of them.
  const actOnTarget = (action: ThreadAction) => {
    if (!view.threadId && selected.size > 0) void actMany([...selected], action)
    else if (targetId) void act(targetId, action)
  }
  const lastMessage = thread.data?.messages[thread.data.messages.length - 1]

  useKeyboardShortcuts({
    c: openCompose,
    '/': () => searchInput.current?.focus(),
    '?': () => setShowHelp(true),
    j: () => step(1),
    k: () => step(-1),
    o: () => { if (threads[focusIndex]) openThread(threads[focusIndex].id) },
    Enter: () => { if (!view.threadId && threads[focusIndex]) openThread(threads[focusIndex].id) },
    u: backToList,
    Escape: () => { if (showHelp) setShowHelp(false); else if (selected.size) mailbox.clearSelection(); else backToList() },
    x: () => { const t = threads[focusIndex]; if (t && !view.threadId) mailbox.toggleSelected(t.id) },
    '*': () => { if (selected.size) mailbox.clearSelection(); else mailbox.selectAll(threads.map(t => t.id)) },
    'g c': () => { window.location.href = '/cleanup' },
    e: () => actOnTarget('archive'),
    '#': () => actOnTarget('trash'),
    s: () => {
      if (!view.threadId && selected.size > 0) {
        const anyUnstarred = threads.some(t => selected.has(t.id) && !t.starred)
        void actMany([...selected], anyUnstarred ? 'star' : 'unstar')
        return
      }
      const t = threads.find(x => x.id === targetId)
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
      <aside className={`fixed inset-y-0 left-0 z-30 w-60 bg-background transition-transform md:static md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5 md:px-6">
          <button type="button" aria-label="Open menu" className="p-2 text-muted md:hidden" onClick={() => setSidebarOpen(true)}><MenuIcon /></button>
          <form role="search" className="flex flex-1 items-center gap-2.5 border-b border-transparent px-1 py-1.5 focus-within:border-foreground"
            onSubmit={e => { e.preventDefault(); navigate({ search: searchText.trim(), label: searchText.trim() ? null : 'INBOX', threadId: null }) }}>
            <SearchIcon width={17} height={17} className="text-muted" />
            <input ref={searchInput} type="search" placeholder="Search the archive…" aria-label="Search mail" value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { e.currentTarget.blur() } }}
              className="w-full bg-transparent text-[1.02rem] outline-none placeholder:italic placeholder:text-muted" />
          </form>
          <button type="button" aria-label="Refresh" title="Refresh" onClick={mailbox.refresh} className="p-2 text-muted hover:text-foreground"><RefreshIcon width={18} height={18} /></button>
        </div>

        {offline && (
          <p role="status" className="border-b border-border bg-surface-muted px-4 py-1.5 text-center text-sm italic">
            You’re offline. Showing mail saved on this device.
          </p>
        )}

        <div className="flex min-h-0 flex-1">
          <section aria-label={heading}
            className={`min-w-0 flex-col border-border bg-surface lg:flex lg:w-[440px] lg:flex-none lg:border-r ${view.threadId ? 'hidden' : 'flex flex-1'}`}>
            {selected.size > 0 ? (
              <div role="toolbar" aria-label="Selected conversations" className="flex items-center gap-1 border-b-[1.5px] border-foreground px-4 py-3">
                <input type="checkbox" aria-label="Select all" checked={selected.size === threads.length}
                  ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < threads.length }}
                  onChange={() => (selected.size === threads.length ? mailbox.clearSelection() : mailbox.selectAll(threads.map(t => t.id)))}
                  className="mx-1 h-3.5 w-3.5 accent-[var(--accent)]" />
                <span className="mr-auto font-display text-lg font-semibold">{selected.size} selected</span>
                {view.label === 'TRASH'
                  ? <BulkButton label="Restore" onClick={() => actOnTarget('restore')}><ArchiveIcon width={18} height={18} /></BulkButton>
                  : <BulkButton label="Archive (e)" onClick={() => actOnTarget('archive')}><ArchiveIcon width={18} height={18} /></BulkButton>}
                {view.label !== 'TRASH' && <BulkButton label="Delete (#)" onClick={() => actOnTarget('trash')}><TrashIcon width={18} height={18} /></BulkButton>}
                <BulkButton label="Mark as read (Shift+I)" onClick={() => actOnTarget('markRead')}><MailOpenIcon width={18} height={18} /></BulkButton>
                <BulkButton label="Mark as unread (Shift+U)" onClick={() => actOnTarget('markUnread')}><MailIcon width={18} height={18} /></BulkButton>
                <BulkButton label="Clear selection (Esc)" onClick={mailbox.clearSelection}><CloseIcon width={18} height={18} /></BulkButton>
              </div>
            ) : (
              <div className="flex items-baseline gap-3 border-b-[1.5px] border-foreground px-6 pb-3 pt-5">
                <h2 className="min-w-0 truncate font-display text-[2rem] font-semibold leading-none tracking-tight">
                  {peopleFirst ? <>People <em className="font-normal text-muted">first</em></> : heading}
                </h2>
                <input type="checkbox" aria-label="Select all" checked={false} disabled={threads.length === 0}
                  onChange={() => mailbox.selectAll(threads.map(t => t.id))} className="ml-auto h-3.5 w-3.5 self-center accent-[var(--accent)] opacity-50 hover:opacity-100" />
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ThreadList
                threads={ordered}
                selectedId={view.threadId}
                checkedIds={selected}
                onToggleChecked={mailbox.toggleSelected}
                focusIndex={focusIndex}
                loading={list.loading}
                loadingMore={list.loadingMore}
                error={list.error}
                hasMore={Boolean(list.nextPageToken)}
                emptyMessage={view.search ? 'Nothing in the archive matches that.' : 'Clear skies. Nothing waiting.'}
                onOpen={openThread}
                onFocus={setFocusIndex}
                onAction={(id, action) => void act(id, action)}
                onLoadMore={mailbox.loadMore}
                onRetry={mailbox.refresh}
                tray={tray}
              />
            </div>
          </section>

          <section aria-label="Conversation" className={`min-w-0 flex-1 ${view.threadId ? 'block' : 'hidden lg:block'}`}>
            {view.threadId
              ? <ThreadView thread={thread.data} loading={thread.loading} error={thread.error} onBack={backToList}
                  onAction={action => { if (view.threadId) void act(view.threadId, action) }} onRespond={respond} onUnsubscribe={unsubscribe} />
              : <div className="flex h-full items-center justify-center font-display text-lg italic text-muted">Choose a letter to read it.</div>}
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

function BulkButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick}
      className="p-2 text-muted transition hover:bg-surface-muted hover:text-foreground">
      {children}
    </button>
  )
}
