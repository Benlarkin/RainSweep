'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MailLabel, MailThread, ThreadSummary } from '@/types'
import type { ThreadAction } from '@/managers/mailbox/MailboxRequests'
import { ApiError, mailApi } from '@/lib/client/mailApi'
import { parseView, type MailView } from '@/lib/client/mailView'

export type { MailView }


interface ListState {
  threads: ThreadSummary[]
  nextPageToken: string | null
  loading: boolean
  loadingMore: boolean
  error: string | null
}

interface ThreadState {
  data: MailThread | null
  loading: boolean
  error: string | null
}

const POLL_INTERVAL_MS = 60_000

/** What undoing an action does, and how it changes the list optimistically. */
const UNDO: Partial<Record<ThreadAction, ThreadAction>> = {
  archive: 'moveToInbox',
  trash: 'restore',
  markRead: 'markUnread',
  markUnread: 'markRead',
  star: 'unstar',
  unstar: 'star',
}

function removesFromView(action: ThreadAction, label: string | null): boolean {
  if (action === 'trash') return label !== 'TRASH'
  if (action === 'archive') return label === 'INBOX'
  if (action === 'unstar') return label === 'STARRED'
  if (action === 'restore') return label === 'TRASH'
  return false
}

function applyToSummary(thread: ThreadSummary, action: ThreadAction): ThreadSummary {
  switch (action) {
    case 'markRead': return { ...thread, unread: false }
    case 'markUnread': return { ...thread, unread: true }
    case 'star': return { ...thread, starred: true }
    case 'unstar': return { ...thread, starred: false }
    case 'archive': return { ...thread, labelIds: thread.labelIds.filter(l => l !== 'INBOX') }
    case 'moveToInbox': return { ...thread, labelIds: [...new Set([...thread.labelIds, 'INBOX'])] }
    default: return thread
  }
}

function readViewFromUrl(): MailView {
  return parseView(new URLSearchParams(window.location.search))
}

function writeViewToUrl(view: MailView, mode: 'push' | 'replace'): void {
  const params = new URLSearchParams()
  params.set('label', view.label ?? '')
  if (view.search) params.set('q', view.search)
  if (view.threadId) params.set('thread', view.threadId)
  const url = `/mail?${params}`
  if (url === `${window.location.pathname}${window.location.search}`) return
  if (mode === 'push') window.history.pushState(null, '', url)
  else window.history.replaceState(null, '', url)
}

export function useMailbox(initialView: MailView, notify: (message: string, undo?: () => void, tone?: 'error') => void) {
  const [view, setView] = useState<MailView>(initialView)
  const [labels, setLabels] = useState<MailLabel[]>([])
  const [list, setList] = useState<ListState>({ threads: [], nextPageToken: null, loading: true, loadingMore: false, error: null })
  const [thread, setThread] = useState<ThreadState>({ data: null, loading: false, error: null })
  const [focusIndex, setFocusIndex] = useState(0)
  const [offline, setOffline] = useState(false)
  const listRequest = useRef(0)
  const seenUnread = useRef<Set<string> | null>(null)

  // ── Navigation ─────────────────────────────────────────────────────────────

  const navigate = useCallback((next: Partial<MailView>, mode: 'push' | 'replace' = 'push') => {
    setView(prev => {
      const merged = { ...prev, ...next }
      writeViewToUrl(merged, mode)
      return merged
    })
  }, [])

  useEffect(() => {
    const onPop = () => setView(readViewFromUrl())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  // ── Labels ─────────────────────────────────────────────────────────────────

  const refreshLabels = useCallback(async () => {
    try {
      const { labels: next } = await mailApi.labels()
      setLabels(next)
      const inbox = next.find(l => l.id === 'INBOX')
      // App badge on the installed app's icon (Badging API, where supported).
      if (inbox && 'setAppBadge' in navigator) {
        if (inbox.unreadCount > 0) void navigator.setAppBadge(inbox.unreadCount).catch(() => undefined)
        else void navigator.clearAppBadge().catch(() => undefined)
      }
    } catch (err) {
      if (err instanceof ApiError && err.code !== 'offline') notify(err.message, undefined, 'error')
    }
  }, [notify])

  useEffect(() => { void refreshLabels() }, [refreshLabels])

  // ── Thread list ────────────────────────────────────────────────────────────

  const loadList = useCallback(async (silent = false) => {
    const requestId = ++listRequest.current
    if (!silent) setList(prev => ({ ...prev, loading: true, error: null }))
    try {
      const page = await mailApi.threads(view.label, view.search, null)
      if (requestId !== listRequest.current) return
      setList(prev => {
        // A silent refresh keeps pages the user already scrolled to.
        const fresh = new Set(page.threads.map(t => t.id))
        const kept = silent ? prev.threads.slice(page.threads.length).filter(t => !fresh.has(t.id)) : []
        return {
          threads: [...page.threads, ...kept],
          nextPageToken: silent && kept.length ? prev.nextPageToken : page.nextPageToken,
          loading: false,
          loadingMore: false,
          error: null,
        }
      })
      if (!silent) setFocusIndex(0)
      announceNewMail(page.threads)
    } catch (err) {
      if (requestId !== listRequest.current) return
      setList(prev => ({ ...prev, loading: false, error: err instanceof Error ? err.message : 'Could not load mail.' }))
    }
    // announceNewMail is stable (refs only); omitted to avoid re-creating loadList.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.label, view.search])

  useEffect(() => { void loadList() }, [loadList])

  const loadMore = useCallback(async () => {
    if (!list.nextPageToken || list.loadingMore) return
    const requestId = listRequest.current
    setList(prev => ({ ...prev, loadingMore: true }))
    try {
      const page = await mailApi.threads(view.label, view.search, list.nextPageToken)
      if (requestId !== listRequest.current) return
      setList(prev => {
        const existing = new Set(prev.threads.map(t => t.id))
        return {
          ...prev,
          threads: [...prev.threads, ...page.threads.filter(t => !existing.has(t.id))],
          nextPageToken: page.nextPageToken,
          loadingMore: false,
        }
      })
    } catch (err) {
      setList(prev => ({ ...prev, loadingMore: false }))
      notify(err instanceof Error ? err.message : 'Could not load more.', undefined, 'error')
    }
  }, [list.nextPageToken, list.loadingMore, view.label, view.search, notify])

  // Notifies about unread inbox threads that weren't there on the last check,
  // only while the app is in the background and the user opted in.
  function announceNewMail(threads: ThreadSummary[]) {
    if (view.label !== 'INBOX' || view.search) return
    const unread = threads.filter(t => t.unread)
    const previous = seenUnread.current
    seenUnread.current = new Set(unread.map(t => t.id))
    if (!previous || !document.hidden || typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    for (const t of unread.filter(t => !previous.has(t.id)).slice(0, 3)) {
      const from = t.participants[t.participants.length - 1]
      const title = from?.name ?? from?.address ?? 'New mail'
      const options: NotificationOptions = { body: t.subject || t.snippet, tag: t.id, icon: '/icon.svg', data: { url: `/mail?label=INBOX&thread=${t.id}` } }
      void navigator.serviceWorker?.getRegistration().then(reg => {
        if (reg) void reg.showNotification(title, options)
        else new Notification(title, options)
      })
    }
  }

  // Background refresh while visible, and immediately on return to the tab.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return
      void refreshLabels()
      void loadList(true)
    }
    const timer = setInterval(tick, POLL_INTERVAL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [refreshLabels, loadList])

  // ── Open thread ────────────────────────────────────────────────────────────

  const loadThread = useCallback(async (id: string) => {
    setThread({ data: null, loading: true, error: null })
    try {
      const { thread: data } = await mailApi.thread(id)
      setThread({ data, loading: false, error: null })
      // Opening marks read on the server; mirror it locally.
      setList(prev => ({ ...prev, threads: prev.threads.map(t => (t.id === id ? { ...t, unread: false } : t)) }))
      void refreshLabels()
    } catch (err) {
      setThread({ data: null, loading: false, error: err instanceof Error ? err.message : 'Could not open conversation.' })
    }
  }, [refreshLabels])

  useEffect(() => {
    if (view.threadId) void loadThread(view.threadId)
    else setThread({ data: null, loading: false, error: null })
  }, [view.threadId, loadThread])

  // ── Actions (optimistic, undoable) ─────────────────────────────────────────

  const act = useCallback(async (threadId: string, action: ThreadAction, options: { silentUndo?: boolean } = {}) => {
    const before = list.threads
    const index = before.findIndex(t => t.id === threadId)
    const removed = removesFromView(action, view.label)

    setList(prev => ({
      ...prev,
      threads: removed
        ? prev.threads.filter(t => t.id !== threadId)
        : prev.threads.map(t => (t.id === threadId ? applyToSummary(t, action) : t)),
    }))
    if (removed && view.threadId === threadId) navigate({ threadId: null })
    if (removed && index >= 0) setFocusIndex(i => Math.min(i, Math.max(0, before.length - 2)))

    try {
      await mailApi.updateThread(threadId, action)
      void refreshLabels()
      const undoAction = UNDO[action]
      const message = ({ archive: 'Conversation archived', trash: 'Moved to Trash', markUnread: 'Marked as unread' } as Partial<Record<ThreadAction, string>>)[action]
      if (message && undoAction && !options.silentUndo) {
        notify(message, () => {
          setList(prev => (prev.threads.some(t => t.id === threadId) ? prev : { ...prev, threads: before }))
          void mailApi.updateThread(threadId, undoAction).then(() => refreshLabels())
        })
      }
    } catch (err) {
      setList(prev => ({ ...prev, threads: before }))
      notify(err instanceof Error ? err.message : 'That didn’t work.', undefined, 'error')
    }
  }, [list.threads, view.label, view.threadId, navigate, refreshLabels, notify])

  return {
    view, navigate, labels, list, thread, focusIndex, setFocusIndex, offline,
    loadMore, refresh: () => { void refreshLabels(); void loadList() }, reloadThread: loadThread, act,
  }
}
