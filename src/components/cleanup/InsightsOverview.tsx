'use client'

import type { InboxInsights, MailGroup } from '@/types'
import { formatBytes, formatListDate } from '@/lib/client/format'

interface InsightsOverviewProps {
  insights: InboxInsights
  onOpen: (group: MailGroup) => void
  onUnsubscribe: (group: MailGroup) => void
}

export function InsightsOverview({ insights, onOpen, onUnsubscribe }: InsightsOverviewProps) {
  const unreadShare = insights.messageCount === 0 ? 0 : Math.round((insights.unreadCount / insights.messageCount) * 100)
  return (
    <div className="space-y-6 p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Messages" value={insights.messageCount.toLocaleString()} />
        <Stat label="Unread" value={insights.unreadCount.toLocaleString()} hint={`${unreadShare}% of these`} />
        <Stat label="Space used" value={formatBytes(insights.totalBytes)} />
        <Stat label="Subscriptions" value={insights.subscriptionCount.toLocaleString()} hint="senders with an unsubscribe link" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GroupPanel title="Who sends you the most" groups={insights.topSenders} onOpen={onOpen}
          metric={g => `${g.messageCount.toLocaleString()} messages`} max={insights.topSenders[0]?.messageCount ?? 0}
          value={g => g.messageCount} />
        <GroupPanel title="Subscriptions you never open" groups={insights.unopenedSubscriptions} onOpen={onOpen}
          metric={g => `${g.unreadCount.toLocaleString()} unread`} max={insights.unopenedSubscriptions[0]?.messageCount ?? 0}
          value={g => g.messageCount} onUnsubscribe={onUnsubscribe}
          empty="Every subscription here has been opened at least once." />
        <GroupPanel title="Who takes the most space" groups={insights.largestSenders} onOpen={onOpen}
          metric={g => formatBytes(g.totalBytes)} max={insights.largestSenders[0]?.totalBytes ?? 0}
          value={g => g.totalBytes} />
        <section className="rounded-lg border border-border">
          <h3 className="border-b border-border px-4 py-2 text-sm font-semibold">Oldest mail</h3>
          <ul>
            {insights.oldestMessages.map(m => (
              <li key={m.id} className="flex items-baseline gap-2 border-b border-border px-4 py-2 text-sm last:border-0">
                <span className="min-w-0 flex-1 truncate">{m.subject || '(no subject)'}</span>
                <span className="shrink-0 text-xs text-muted">{m.from?.name ?? m.from?.address} · {formatListDate(m.date)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  )
}

interface GroupPanelProps {
  title: string
  groups: MailGroup[]
  max: number
  value: (g: MailGroup) => number
  metric: (g: MailGroup) => string
  onOpen: (g: MailGroup) => void
  onUnsubscribe?: (g: MailGroup) => void
  empty?: string
}

function GroupPanel({ title, groups, max, value, metric, onOpen, onUnsubscribe, empty }: GroupPanelProps) {
  return (
    <section className="rounded-lg border border-border">
      <h3 className="border-b border-border px-4 py-2 text-sm font-semibold">{title}</h3>
      {groups.length === 0 ? (
        <p className="p-4 text-sm text-muted">{empty ?? 'Nothing here.'}</p>
      ) : (
        <ul>
          {groups.map(g => (
            <li key={g.id} className="flex items-center gap-2 border-b border-border px-4 py-2 text-sm last:border-0">
              <button type="button" onClick={() => onOpen(g)} className="min-w-0 flex-1 text-left">
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate">{g.label}</span>
                  <span className="shrink-0 text-xs text-muted">{metric(g)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-surface-muted">
                  <div className="h-1.5 rounded-full bg-accent" style={{ width: `${max ? Math.max(2, (value(g) / max) * 100) : 0}%` }} />
                </div>
              </button>
              {onUnsubscribe && g.unsubscribe && (
                <button type="button" onClick={() => onUnsubscribe(g)} className="shrink-0 text-xs text-accent hover:underline">
                  Unsubscribe
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
