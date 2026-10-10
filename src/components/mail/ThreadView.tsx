'use client'

import { useState } from 'react'
import type { MailMessage, MailThread } from '@/types'
import type { ThreadAction } from '@/managers/mailbox/MailboxRequests'
import type { DraftMode } from '@/managers/composition/CompositionRequests'
import { AddressUtility } from '@/utilities/AddressUtility'
import { formatBytes, formatFullDate } from '@/lib/client/format'
import { mailApi } from '@/lib/client/mailApi'
import { ArchiveIcon, BackIcon, ForwardIcon, MailIcon, PaperclipIcon, ReplyAllIcon, ReplyIcon, StarIcon, TrashIcon } from '@/components/ui/Icons'
import { MessageBody } from './MessageBody'

interface ThreadViewProps {
  thread: MailThread | null
  loading: boolean
  error: string | null
  onBack: () => void
  onAction: (action: ThreadAction) => void
  onRespond: (message: MailMessage, mode: DraftMode) => void
  onUnsubscribe: (message: MailMessage) => void
}

export function ThreadView({ thread, loading, error, onBack, onAction, onRespond, onUnsubscribe }: ThreadViewProps) {
  if (loading) {
    return <div className="flex h-full items-center justify-center text-sm text-muted" aria-busy="true">Loading conversation…</div>
  }
  if (error || !thread) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted">
        <p>{error ?? 'Conversation not found.'}</p>
        <button type="button" onClick={onBack} className="font-medium text-accent hover:underline">Back to list</button>
      </div>
    )
  }

  const starred = thread.messages.some(m => m.starred)
  const inInbox = thread.labelIds.includes('INBOX')
  const inTrash = thread.labelIds.includes('TRASH')
  const last = thread.messages[thread.messages.length - 1]

  return (
    <article className="flex h-full flex-col">
      <header className="flex items-center gap-1 border-b border-border px-2 py-2">
        <ToolbarButton label="Back" shortcut="u" onClick={onBack}><BackIcon /></ToolbarButton>
        {inInbox
          ? <ToolbarButton label="Archive" shortcut="e" onClick={() => onAction('archive')}><ArchiveIcon /></ToolbarButton>
          : !inTrash && <ToolbarButton label="Move to Inbox" onClick={() => onAction('moveToInbox')}><ArchiveIcon className="rotate-180" /></ToolbarButton>}
        {inTrash
          ? <ToolbarButton label="Restore from Trash" onClick={() => onAction('restore')}><TrashIcon /></ToolbarButton>
          : <ToolbarButton label="Delete" shortcut="#" onClick={() => onAction('trash')}><TrashIcon /></ToolbarButton>}
        <ToolbarButton label="Mark as unread" shortcut="Shift+U" onClick={() => onAction('markUnread')}><MailIcon /></ToolbarButton>
        <ToolbarButton label={starred ? 'Unstar' : 'Star'} shortcut="s" onClick={() => onAction(starred ? 'unstar' : 'star')}>
          <StarIcon filled={starred} className={starred ? 'text-amber-400' : ''} />
        </ToolbarButton>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 md:px-8">
        <h1 className="mb-5 text-xl font-semibold leading-snug">{thread.subject || '(no subject)'}</h1>
        <ol className="space-y-3">
          {thread.messages.map((message, i) => (
            <MessageCard key={message.id} message={message} defaultOpen={i === thread.messages.length - 1 || message.unread} onRespond={onRespond} onUnsubscribe={onUnsubscribe} />
          ))}
        </ol>

        {last && (
          <div className="mt-6 flex flex-wrap gap-2">
            <RespondButton onClick={() => onRespond(last, 'reply')}><ReplyIcon width={16} height={16} /> Reply</RespondButton>
            {last.to.length + last.cc.length > 1 && (
              <RespondButton onClick={() => onRespond(last, 'replyAll')}><ReplyAllIcon width={16} height={16} /> Reply all</RespondButton>
            )}
            <RespondButton onClick={() => onRespond(last, 'forward')}><ForwardIcon width={16} height={16} /> Forward</RespondButton>
          </div>
        )}
      </div>
    </article>
  )
}

function MessageCard({ message, defaultOpen, onRespond, onUnsubscribe }: { message: MailMessage; defaultOpen: boolean; onRespond: ThreadViewProps['onRespond']; onUnsubscribe: ThreadViewProps['onUnsubscribe'] }) {
  const [open, setOpen] = useState(defaultOpen)
  const sender = message.from ? AddressUtility.displayName(message.from) : '(unknown sender)'
  const files = message.attachments.filter(a => !a.inline)
  const preview = (message.textBody ?? '').replace(/\s+/g, ' ').slice(0, 140)

  return (
    <li className="rounded-xl border border-border bg-surface">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex w-full items-start gap-3 px-4 py-3 text-left">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
          {sender[0]?.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-semibold">{sender}</span>
            {open && message.from && <span className="hidden truncate text-xs text-muted sm:inline">&lt;{message.from.address}&gt;</span>}
            <time className="ml-auto shrink-0 text-xs text-muted" dateTime={message.date}>{formatFullDate(message.date)}</time>
          </div>
          {open && message.unsubscribe && (
            <span role="button" tabIndex={0}
              onClick={e => { e.stopPropagation(); onUnsubscribe(message) }}
              onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onUnsubscribe(message) } }}
              className="float-right ml-2 mt-0.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted hover:bg-surface-muted hover:text-foreground">
              Unsubscribe
            </span>
          )}
          {open
            ? <p className="truncate text-xs text-muted">to {[...message.to, ...message.cc].map(AddressUtility.displayName).join(', ') || 'undisclosed recipients'}</p>
            : <p className="truncate text-sm text-muted">{preview}</p>}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <MessageBody html={message.htmlBody} text={message.textBody} />

          {files.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Attachments">
              {files.map(file => (
                <li key={file.index}>
                  <a href={mailApi.attachmentUrl(message.id, file.index)} download={file.filename}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted">
                    <PaperclipIcon width={16} height={16} />
                    <span className="max-w-48 truncate">{file.filename}</span>
                    <span className="text-xs text-muted">{formatBytes(file.size)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex gap-1 text-muted">
            <IconButton label="Reply" onClick={() => onRespond(message, 'reply')}><ReplyIcon width={18} height={18} /></IconButton>
            <IconButton label="Reply all" onClick={() => onRespond(message, 'replyAll')}><ReplyAllIcon width={18} height={18} /></IconButton>
            <IconButton label="Forward" onClick={() => onRespond(message, 'forward')}><ForwardIcon width={18} height={18} /></IconButton>
          </div>
        </div>
      )}
    </li>
  )
}

function ToolbarButton({ label, shortcut, onClick, children }: { label: string; shortcut?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={shortcut ? `${label} (${shortcut})` : label}
      className="rounded-full p-2 text-muted transition hover:bg-surface-muted hover:text-foreground">
      {children}
    </button>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="rounded-full p-1.5 hover:bg-surface-muted hover:text-foreground">
      {children}
    </button>
  )
}

function RespondButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-surface-muted">
      {children}
    </button>
  )
}
