'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { BulkMessageAction, CleanupFilter, MailboxAnalysis, MessageMetadata } from '@/types'
import { mailApi } from '@/lib/client/mailApi'
import { loadScan, saveScan } from './scanCache'

export type Scope = 'all' | 'inbox'

export interface ScanProgress {
  scanned: number
  limit: number
}

export const NO_FILTER: CleanupFilter = { olderThanDays: null, largerThanBytes: null, unreadOnly: false }

const UNDO: Record<BulkMessageAction, BulkMessageAction> = {
  trash: 'restore', restore: 'trash', archive: 'moveToInbox', moveToInbox: 'archive', markRead: 'markUnread', markUnread: 'markRead',
}

/** Only the messages an action will actually change, so Undo restores exactly those. */
function affected(messages: MessageMetadata[], ids: Set<string>, action: BulkMessageAction): string[] {
  return messages.filter(m => ids.has(m.id) && (
    action === 'archive' ? m.labelIds.includes('INBOX')
      : action === 'markRead' ? m.unread
        : action === 'markUnread' ? !m.unread
          : true
  )).map(m => m.id)
}

function applyLocally(messages: MessageMetadata[], ids: Set<string>, action: BulkMessageAction, scope: Scope): MessageMetadata[] {
  switch (action) {
    case 'trash': return messages.filter(m => !ids.has(m.id))
    case 'archive':
      return scope === 'inbox'
        ? messages.filter(m => !ids.has(m.id))
        : messages.map(m => (ids.has(m.id) ? { ...m, labelIds: m.labelIds.filter(l => l !== 'INBOX') } : m))
    case 'markRead': return messages.map(m => (ids.has(m.id) ? { ...m, unread: false } : m))
    case 'markUnread': return messages.map(m => (ids.has(m.id) ? { ...m, unread: true } : m))
    default: return messages
  }
}

export interface Notify {
  (message: string, action?: { label: string; run: () => void }, tone?: 'error'): void
}

export function useCleanup(accountEmail: string, notify: Notify) {
  const [messages, setMessages] = useState<MessageMetadata[]>([])
  const [scope, setScope] = useState<Scope>('all')
  const [scannedAt, setScannedAt] = useState<string | null>(null)
  const [complete, setComplete] = useState(false)
  const [progress, setProgress] = useState<ScanProgress | null>(null)
  const [filter, setFilter] = useState<CleanupFilter>(NO_FILTER)
  const [analysis, setAnalysis] = useState<MailboxAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restored, setRestored] = useState(false)
  const cancelScan = useRef(false)
  const analyzeRequest = useRef(0)

  useEffect(() => {
    let alive = true
    void loadScan(accountEmail).then(cached => {
      if (!alive) return
      if (cached) {
        setMessages(cached.messages)
        setScope(cached.scope)
        setScannedAt(cached.scannedAt)
        setComplete(cached.complete)
      }
      setRestored(true)
    })
    return () => { alive = false }
  }, [accountEmail])

  // Re-group whenever the scanned set or the filter changes.
  useEffect(() => {
    if (!restored || messages.length === 0) return
    const id = ++analyzeRequest.current
    const timer = setTimeout(async () => {
      setAnalyzing(true)
      try {
        const { analysis: next } = await mailApi.analyze(messages, filter)
        if (id === analyzeRequest.current) setAnalysis(next)
      } catch (err) {
        if (id === analyzeRequest.current) setError(err instanceof Error ? err.message : 'Could not analyze your mail.')
      } finally {
        if (id === analyzeRequest.current) setAnalyzing(false)
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [messages, filter, restored])

  const scan = useCallback(async (nextScope: Scope, limit: number) => {
    cancelScan.current = false
    setError(null)
    setScope(nextScope)
    setProgress({ scanned: 0, limit })
    const collected: MessageMetadata[] = []
    let pageToken: string | null = null
    try {
      do {
        const page = await mailApi.scan(nextScope, pageToken)
        collected.push(...page.messages)
        pageToken = page.nextPageToken
        setProgress({ scanned: collected.length, limit: Math.min(limit, Math.max(page.resultSizeEstimate, collected.length)) })
      } while (pageToken && collected.length < limit && !cancelScan.current)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The scan stopped early.')
    }
    setProgress(null)
    if (collected.length === 0) return
    const at = new Date().toISOString()
    const done = !pageToken
    setMessages(collected)
    setScannedAt(at)
    setComplete(done)
    void saveScan({ accountEmail, scope: nextScope, scannedAt: at, messages: collected, complete: done })
  }, [accountEmail])

  const stopScan = useCallback(() => { cancelScan.current = true }, [])

  const apply = useCallback(async (messageIds: string[], action: BulkMessageAction, description: string) => {
    const ids = affected(messages, new Set(messageIds), action)
    if (ids.length === 0) {
      notify('Nothing to change there.')
      return
    }
    const before = messages
    const after = applyLocally(messages, new Set(ids), action, scope)
    setMessages(after)
    try {
      await mailApi.bulkAction(ids, action)
      void saveScan({ accountEmail, scope, scannedAt: scannedAt ?? new Date().toISOString(), messages: after, complete })
      notify(description.replace('{n}', ids.length.toLocaleString()), {
        label: 'Undo',
        run: () => {
          setMessages(before)
          void mailApi.bulkAction(ids, UNDO[action])
            .then(() => saveScan({ accountEmail, scope, scannedAt: scannedAt ?? new Date().toISOString(), messages: before, complete }))
            .catch(() => notify('Undo failed. Check Trash in Gmail.', undefined, 'error'))
        },
      })
    } catch (err) {
      setMessages(before)
      notify(err instanceof Error ? err.message : 'That didn’t work.', undefined, 'error')
    }
  }, [messages, scope, scannedAt, complete, accountEmail, notify])

  const byId = useCallback((ids: string[]) => {
    const wanted = new Set(ids)
    return messages.filter(m => wanted.has(m.id))
  }, [messages])

  return {
    messages, scope, scannedAt, complete, progress, filter, setFilter, analysis, analyzing, error, restored,
    scan, stopScan, apply, byId,
  }
}
