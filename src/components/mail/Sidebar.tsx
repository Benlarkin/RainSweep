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
    <nav aria-label="Mailboxes" className="flex h-full flex-col gap-6 overflow-y-auto border-r border-border px-5 py-6">
      <div>
        <p className="font-display text-[1.65rem] font-bold leading-none tracking-tight">RainSweep</p>
        <p className="meta mt-1.5">Field guide to your mail</p>
      </div>

      <button type="button" onClick={onCompose}
        className="flex items-center justify-between border-[1.5px] border-foreground bg-letter px-3.5 py-2.5 font-display text-[1.05rem] font-semibold transition hover:bg-surface-muted">
        <span className="flex items-center gap-2.5"><PencilIcon width={18} height={18} /> Write</span>
        <kbd className="meta">c</kbd>
      </button>

      <ul>
        {system.map(label => <LabelItem key={label.id} label={label} active={label.id === currentLabel} onSelect={onSelectLabel} />)}
        <li>
          <a href="/cleanup" className="flex items-center gap-2.5 border-b border-dotted border-border py-1.5 text-[1.05rem] hover:text-accent">
            <BroomIcon width={17} height={17} className="text-muted" /> <span className="flex-1">Sweep</span>
            <span className="meta">g c</span>
          </a>
        </li>
      </ul>

      {user.length > 0 && (
        <div>
          <h2 className="meta mb-1">Labels</h2>
          <ul>
            {user.map(label => <LabelItem key={label.id} label={label} active={label.id === currentLabel} onSelect={onSelectLabel} />)}
          </ul>
        </div>
      )}

      <div className="mt-auto space-y-0.5 border-t-[1.5px] border-foreground pt-3 text-[0.95rem]">
        {props.onEnableNotifications && (
          <button type="button" onClick={props.onEnableNotifications} className="w-full py-1.5 text-left text-muted hover:text-foreground">
            Notify me about new mail
          </button>
        )}
        {props.onMakeDefaultMailApp && (
          <button type="button" onClick={props.onMakeDefaultMailApp} className="flex w-full items-center gap-2 py-1.5 text-left text-muted hover:text-foreground">
            <MailIcon width={16} height={16} /> Open mailto: links here
          </button>
        )}
        <button type="button" onClick={props.onShowShortcuts} className="flex w-full items-center gap-2 py-1.5 text-left text-muted hover:text-foreground">
          <KeyboardIcon width={16} height={16} /> Keyboard shortcuts
        </button>
        <div className="flex items-center gap-3 py-2">
          {account.pictureUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={account.pictureUrl} alt="" width={32} height={32} className="rounded-full" referrerPolicy="no-referrer" />
            : <span className="flex h-8 w-8 items-center justify-center rounded-full border border-foreground font-display text-sm font-semibold">{(account.name ?? account.email)[0]?.toUpperCase()}</span>}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{account.name ?? account.email}</p>
            <p className="truncate font-mono text-[0.7rem] text-muted">{account.email}</p>
          </div>
        </div>
        <button type="button" onClick={props.onSignOut} className="w-full py-1 text-left text-muted hover:text-foreground">
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
        className={`flex w-full items-center gap-2.5 border-b border-dotted border-border py-1.5 text-left text-[1.05rem] transition hover:text-accent ${
          active ? 'font-medium italic' : ''
        }`}>
        {active
          ? <span aria-hidden="true" className="w-[17px] text-center font-display text-marker">§</span>
          : <LabelIcon id={label.id} width={17} height={17} className="text-muted" />}
        <span className="flex-1 truncate">{label.name}</span>
        {showCount && <span className={`font-mono text-xs not-italic ${label.unreadCount ? 'text-foreground' : 'text-muted'}`}>{count}</span>}
      </button>
    </li>
  )
}
