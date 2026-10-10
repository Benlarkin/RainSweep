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
    <div className="space-y-8 px-4 py-6 md:px-8">
      <div className="grid grid-cols-2 border-y-[1.5px] border-foreground md:grid-cols-4">
        <Stat label="Messages" value={insights.messageCount.toLocaleString()} />
        <Stat label="Unread" value={insights.unreadCount.toLocaleString()} hint={`${unreadShare}% of these`} />
        <Stat label="Space used" value={formatBytes(insights.totalBytes)} />
        <Stat label="Subscriptions" value={insights.subscriptionCount.toLocaleString()} hint="senders with an unsubscribe link" />
      </div>

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
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
        <section>
          <h3 className="border-b-[1.5px] border-foreground pb-2 font-display text-xl font-semibold">Oldest mail</h3>
          <ul>
            {insights.oldestMessages.map(m => (
              <li key={m.id} className="flex items-baseline gap-3 border-b border-border py-2.5">
                <span className="min-w-0 flex-1 truncate">{m.subject || '(no subject)'}</span>
                <span className="meta shrink-0">{m.from?.name ?? m.from?.address} · {formatListDate(m.date)}</span>
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
    <div className="border-border px-1 py-4 md:px-5 [&:not(:first-child)]:md:border-l">
      <div className="meta">{label}</div>
      <div className="mt-1 font-display text-[2.2rem] font-semibold leading-none tracking-tight tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-[0.92rem] italic text-muted">{hint}</div>}
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
    <section>
      <h3 className="border-b-[1.5px] border-foreground pb-2 font-display text-xl font-semibold">{title}</h3>
      {groups.length === 0 ? (
        <p className="py-4 italic text-muted">{empty ?? 'Nothing here.'}</p>
      ) : (
        <ul>
          {groups.map(g => (
            <li key={g.id} className="flex items-center gap-3 border-b border-border py-2.5">
              <button type="button" onClick={() => onOpen(g)} className="min-w-0 flex-1 text-left">
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-[1.05rem]">{g.label}</span>
                  <span className="meta shrink-0">{metric(g)}</span>
                </div>
                {/* A rain gauge: how much each sender drops on you. */}
                <div className="mt-1.5 h-2 bg-surface-muted">
                  <div className="h-2 bg-accent/80" style={{ width: `${max ? Math.max(2, (value(g) / max) * 100) : 0}%` }} />
                </div>
              </button>
              {onUnsubscribe && g.unsubscribe && (
                <button type="button" onClick={() => onUnsubscribe(g)} className="meta shrink-0 text-marker hover:text-foreground">
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
