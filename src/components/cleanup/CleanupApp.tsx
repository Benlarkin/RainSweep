'use client'

import { useCallback, useState } from 'react'
import type { Account, BulkMessageAction, CleanupFilter, GroupingKind, MailGroup } from '@/types'
import { Toast, type ToastState } from '@/components/ui/Toast'
import { BackIcon, BroomIcon } from '@/components/ui/Icons'
import { formatListDate } from '@/lib/client/format'
import { useCleanup, type Scope } from './useCleanup'
import { GroupTable } from './GroupTable'
import { GroupDetail } from './GroupDetail'
import { InsightsOverview } from './InsightsOverview'
import { runGroupAction, unsubscribeGroup } from './groupActions'

type Tab = 'overview' | GroupingKind

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'sender', label: 'Senders' },
  { id: 'list', label: 'Mailing lists' },
  { id: 'subject', label: 'Subjects' },
  { id: 'size', label: 'Size' },
  { id: 'age', label: 'Age' },
]

const LIMITS = [1000, 2500, 5000]
const DAY = 1
const MB = 1024 * 1024
const AGE_FILTERS: { label: string; days: number | null }[] = [
  { label: 'Any age', days: null }, { label: 'Older than 30 days', days: 30 * DAY },
  { label: 'Older than 6 months', days: 182 * DAY }, { label: 'Older than 1 year', days: 365 * DAY },
  { label: 'Older than 3 years', days: 3 * 365 * DAY },
]
const SIZE_FILTERS: { label: string; bytes: number | null }[] = [
  { label: 'Any size', bytes: null }, { label: 'Larger than 1 MB', bytes: MB },
  { label: 'Larger than 5 MB', bytes: 5 * MB }, { label: 'Larger than 10 MB', bytes: 10 * MB },
]

export function CleanupApp({ account }: { account: Account }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const notify = useCallback((message: string, action?: { label: string; run: () => void }, tone?: 'error') => {
    setToast({ id: Date.now(), message, tone, actionLabel: action?.label, onAction: action?.run, durationMs: action ? 10_000 : 6000 })
  }, [])
  const dismiss = useCallback(() => setToast(null), [])

  const cleanup = useCleanup(account.email, notify)
  const { analysis, filter, setFilter, progress, apply } = cleanup
  const [tab, setTab] = useState<Tab>('overview')
  const [scopeChoice, setScopeChoice] = useState<Scope | null>(null)
  const [limit, setLimit] = useState(LIMITS[1])
  const [openGroupId, setOpenGroupId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Senders unsubscribed during this visit, so their button doesn't invite a second request.
  const [unsubscribed, setUnsubscribed] = useState<ReadonlySet<string>>(new Set())

  const scope = scopeChoice ?? cleanup.scope
  const scanning = progress !== null

  const run = useCallback(async (work: () => Promise<void>) => {
    setBusy(true)
    try { await work() } finally { setBusy(false) }
  }, [])

  const onAction = (groups: MailGroup[], action: BulkMessageAction) =>
    void run(() => runGroupAction(groups, action, apply))
  const onUnsubscribe = (group: MailGroup, alsoTrash = false) => void run(async () => {
    const done = await unsubscribeGroup(group, notify, apply, alsoTrash)
    if (done) setUnsubscribed(prev => new Set(prev).add(group.id))
    if (alsoTrash) setOpenGroupId(null)
  })
  const fromDrawer = (group: MailGroup, action: BulkMessageAction) => void run(async () => {
    await runGroupAction([group], action, apply)
    setOpenGroupId(null)
  })
  // Hide the unsubscribe option for senders already handled.
  const visible = (group: MailGroup): MailGroup => (unsubscribed.has(group.id) ? { ...group, unsubscribe: null } : group)

  const allGroups = analysis ? Object.values(analysis.groups).flat() : []
  const insightGroups = analysis
    ? [...analysis.insights.topSenders, ...analysis.insights.unopenedSubscriptions, ...analysis.insights.largestSenders]
    : []
  const found = openGroupId ? (allGroups.find(g => g.id === openGroupId) ?? insightGroups.find(g => g.id === openGroupId)) : undefined
  const openGroup = found ? visible(found) : null

  const updateFilter = (patch: Partial<CleanupFilter>) => setFilter({ ...filter, ...patch })

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <a href="/mail" aria-label="Back to mail" className="rounded-full p-2 hover:bg-surface-muted"><BackIcon /></a>
        <BroomIcon />
        <h1 className="text-lg font-semibold">Clean up</h1>
        <span className="text-sm text-muted">{account.email}</span>

        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <select aria-label="What to scan" value={scope} disabled={scanning}
            onChange={e => setScopeChoice(e.target.value as Scope)}
            className="rounded border border-border bg-surface px-2 py-1.5">
            <option value="all">All mail</option>
            <option value="inbox">Inbox only</option>
          </select>
          <select aria-label="How many messages" value={limit} disabled={scanning}
            onChange={e => setLimit(Number(e.target.value))}
            className="rounded border border-border bg-surface px-2 py-1.5">
            {LIMITS.map(n => <option key={n} value={n}>Newest {n.toLocaleString()}</option>)}
          </select>
          {scanning ? (
            <button type="button" onClick={cleanup.stopScan} className="rounded-full border border-border px-4 py-1.5">Stop</button>
          ) : (
            <button type="button" onClick={() => void cleanup.scan(scope, limit)}
              className="rounded-full bg-accent px-4 py-1.5 font-medium text-accent-foreground">
              {cleanup.messages.length > 0 ? 'Rescan' : 'Scan my mail'}
            </button>
          )}
        </div>
      </header>

      {progress && (
        <div className="border-b border-border px-4 py-2 text-sm">
          <div className="mb-1 text-muted">Reading {progress.scanned.toLocaleString()} of about {progress.limit.toLocaleString()} messages…</div>
          <div className="h-1.5 rounded-full bg-surface-muted">
            <div className="h-1.5 rounded-full bg-accent transition-all"
              style={{ width: `${progress.limit ? Math.min(100, (progress.scanned / progress.limit) * 100) : 0}%` }} />
          </div>
        </div>
      )}

      {cleanup.error && <p role="alert" className="border-b border-border bg-red-50 px-4 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{cleanup.error}</p>}

      {!cleanup.restored ? null : cleanup.messages.length === 0 && !scanning ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2 text-sm">
            <select aria-label="Age filter" value={filter.olderThanDays ?? ''}
              onChange={e => updateFilter({ olderThanDays: e.target.value ? Number(e.target.value) : null })}
              className="rounded border border-border bg-surface px-2 py-1">
              {AGE_FILTERS.map(f => <option key={f.label} value={f.days ?? ''}>{f.label}</option>)}
            </select>
            <select aria-label="Size filter" value={filter.largerThanBytes ?? ''}
              onChange={e => updateFilter({ largerThanBytes: e.target.value ? Number(e.target.value) : null })}
              className="rounded border border-border bg-surface px-2 py-1">
              {SIZE_FILTERS.map(f => <option key={f.label} value={f.bytes ?? ''}>{f.label}</option>)}
            </select>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={filter.unreadOnly} onChange={e => updateFilter({ unreadOnly: e.target.checked })} />
              Unread only
            </label>
            <span className="ml-auto text-xs text-muted">
              {cleanup.analyzing ? 'Updating…' : cleanup.scannedAt
                ? `${cleanup.messages.length.toLocaleString()} messages from ${scope === 'inbox' ? 'your inbox' : 'all mail'}, scanned ${formatListDate(cleanup.scannedAt)}${cleanup.complete ? '' : ' (newest only)'}`
                : null}
            </span>
          </div>

          <nav aria-label="Groupings" className="flex gap-1 overflow-x-auto border-b border-border px-2">
            {TABS.map(t => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
                className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${tab === t.id ? 'border-accent font-medium' : 'border-transparent text-muted hover:text-foreground'}`}>
                {t.label}
                {t.id !== 'overview' && analysis && <span className="ml-1 text-xs text-muted">{analysis.groups[t.id].length}</span>}
              </button>
            ))}
          </nav>

          <main className="flex-1">
            {!analysis ? (
              <p className="p-8 text-center text-sm text-muted">Grouping your mail…</p>
            ) : tab === 'overview' ? (
              <InsightsOverview insights={{
                ...analysis.insights,
                unopenedSubscriptions: analysis.insights.unopenedSubscriptions.filter(g => !unsubscribed.has(g.id)),
              }} onOpen={g => setOpenGroupId(g.id)} onUnsubscribe={g => onUnsubscribe(g)} />
            ) : (
              <GroupTable key={tab} kind={tab} groups={analysis.groups[tab].map(visible)} busy={busy}
                onOpen={g => setOpenGroupId(g.id)} onAction={onAction} onUnsubscribe={g => onUnsubscribe(g)} />
            )}
          </main>
        </>
      )}

      {openGroup && (
        <GroupDetail group={openGroup} messages={cleanup.byId(openGroup.messageIds)} busy={busy}
          onClose={() => setOpenGroupId(null)}
          onTrash={() => fromDrawer(openGroup, 'trash')}
          onArchive={() => fromDrawer(openGroup, 'archive')}
          onUnsubscribe={alsoTrash => onUnsubscribe(openGroup, alsoTrash)} />
      )}

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-md p-10 text-center">
      <h2 className="text-xl font-semibold">See where your mail comes from</h2>
      <p className="mt-2 text-sm text-muted">
        RainSweep reads the headers of your newest messages (never the bodies), then groups them by sender, mailing list,
        subject, size and age so you can unsubscribe and clear out whole groups at once. The scan stays on this device.
      </p>
    </div>
  )
}
