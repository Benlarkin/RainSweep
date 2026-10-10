'use client'

import type { Account, MailLabel } from '@/types'
import { BroomIcon, KeyboardIcon, PencilIcon, LabelIcon, MailIcon } from '@/components/ui/Icons'

interface SidebarProps {
  account: Account
  labels: MailLabel[]
  currentLabel: string | null
  onSelectLabel: (id: string) => void
  onCompose: () => void
  onSignOut: () => void
  onShowShortcuts: () => void
  onEnableNotifications: (() => void) | null
  onMakeDefaultMailApp: (() => void) | null
}

export function Sidebar(props: SidebarProps) {
  const { account, labels, currentLabel, onSelectLabel, onCompose } = props
  const system = labels.filter(l => l.kind === 'system')
  const user = labels.filter(l => l.kind === 'user')

  return (
    <nav aria-label="Mailboxes" className="flex h-full flex-col gap-2 overflow-y-auto p-3">
      <button type="button" onClick={onCompose}
        className="mb-2 flex items-center gap-3 rounded-2xl bg-accent px-5 py-3.5 font-medium text-accent-foreground shadow-sm transition hover:opacity-90">
        <PencilIcon /> Compose
      </button>

      <ul className="space-y-0.5">
        {system.map(label => <LabelItem key={label.id} label={label} active={label.id === currentLabel} onSelect={onSelectLabel} />)}
      </ul>

      <a href="/cleanup" className="mt-2 flex items-center gap-3 rounded-r-full px-3 py-1.5 text-sm hover:bg-surface-muted">
        <BroomIcon width={18} height={18} /> <span className="flex-1">Clean up</span>
      </a>

      {user.length > 0 && (
        <>
          <h2 className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-muted">Labels</h2>
          <ul className="space-y-0.5">
            {user.map(label => <LabelItem key={label.id} label={label} active={label.id === currentLabel} onSelect={onSelectLabel} />)}
          </ul>
        </>
      )}

      <div className="mt-auto space-y-1 border-t border-border pt-3 text-sm">
        {props.onEnableNotifications && (
          <button type="button" onClick={props.onEnableNotifications} className="w-full rounded-lg px-3 py-2 text-left text-muted hover:bg-surface-muted">
            Notify me about new mail
          </button>
        )}
        {props.onMakeDefaultMailApp && (
          <button type="button" onClick={props.onMakeDefaultMailApp} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-muted hover:bg-surface-muted">
            <MailIcon width={16} height={16} /> Open mailto: links here
          </button>
        )}
        <button type="button" onClick={props.onShowShortcuts} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-muted hover:bg-surface-muted">
          <KeyboardIcon width={16} height={16} /> Keyboard shortcuts
        </button>
        <div className="flex items-center gap-3 px-3 py-2">
          {account.pictureUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={account.pictureUrl} alt="" width={32} height={32} className="rounded-full" referrerPolicy="no-referrer" />
            : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">{(account.name ?? account.email)[0]?.toUpperCase()}</span>}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{account.name ?? account.email}</p>
            <p className="truncate text-xs text-muted">{account.email}</p>
          </div>
        </div>
        <button type="button" onClick={props.onSignOut} className="w-full rounded-lg px-3 py-2 text-left text-muted hover:bg-surface-muted">
          Sign out
        </button>
      </div>
    </nav>
  )
}

function LabelItem({ label, active, onSelect }: { label: MailLabel; active: boolean; onSelect: (id: string) => void }) {
  // Gmail shows unread counts for most labels, but total counts for Drafts.
  const count = label.id === 'DRAFT' ? label.totalCount : label.unreadCount
  const showCount = count > 0 && label.id !== 'SENT' && label.id !== 'TRASH' && label.id !== 'STARRED' && label.id !== 'IMPORTANT'
  return (
    <li>
      <button type="button" onClick={() => onSelect(label.id)} aria-current={active ? 'page' : undefined}
        className={`flex w-full items-center gap-3 rounded-r-full px-3 py-1.5 text-sm transition ${
          active ? 'bg-selected font-semibold' : 'hover:bg-surface-muted'
        }`}>
        <LabelIcon id={label.id} width={18} height={18} />
        <span className="flex-1 truncate text-left">{label.name}</span>
        {showCount && <span className={`text-xs ${active ? '' : 'text-muted'} ${label.unreadCount ? 'font-semibold' : ''}`}>{count}</span>}
      </button>
    </li>
  )
}
