'use client'

import { useState } from 'react'
import type { MailMessage, MailThread } from '@/types'
import type { ThreadAction } from '@/managers/mailbox/MailboxRequests'
import type { DraftMode } from '@/managers/composition/CompositionRequests'
import { AddressUtility } from '@/utilities/AddressUtility'
import { formatBytes, formatFullDate } from '@/lib/client/format'
import { mailApi } from '@/lib/client/mailApi'
import { BackIcon, ForwardIcon, PaperclipIcon, ReplyAllIcon, ReplyIcon, StarIcon } from '@/components/ui/Icons'
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
    return <div className="flex h-full items-center justify-center font-display italic text-muted" aria-busy="true">Opening the letter…</div>
  }
  if (error || !thread) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted">
        <p className="italic">{error ?? 'Conversation not found.'}</p>
        <button type="button" onClick={onBack} className="meta text-accent hover:text-foreground">Back to list</button>
      </div>
    )
  }

  const starred = thread.messages.some(m => m.starred)
  const inInbox = thread.labelIds.includes('INBOX')
  const inTrash = thread.labelIds.includes('TRASH')
  const last = thread.messages[thread.messages.length - 1]

  return (
    <article className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 pb-2 pt-5 md:px-12">
        <button type="button" onClick={onBack} aria-label="Back" title="Back (u)" className="-ml-1 p-1 text-muted hover:text-foreground lg:hidden"><BackIcon /></button>
        {inInbox
          ? <ToolbarButton label="File away" shortcut="e" title="Archive" onClick={() => onAction('archive')} />
          : !inTrash && <ToolbarButton label="Move to Inbox" onClick={() => onAction('moveToInbox')} />}
        {inTrash
          ? <ToolbarButton label="Restore" onClick={() => onAction('restore')} />
          : <ToolbarButton label="Discard" shortcut="#" title="Move to Trash" onClick={() => onAction('trash')} />}
        <ToolbarButton label="Reply" shortcut="r" onClick={() => last && onRespond(last, 'reply')} />
        <ToolbarButton label={starred ? 'Unstar' : 'Star'} shortcut="s" onClick={() => onAction(starred ? 'unstar' : 'star')} />
        <ToolbarButton label="Mark unread" shortcut="⇧U" onClick={() => onAction('markUnread')} />
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-10 pt-5 md:px-12">
        <p className="meta flex items-center gap-2">
          {starred && <StarIcon filled width={12} height={12} className="text-marker" />}
          Correspondence · {thread.messages.length} {thread.messages.length === 1 ? 'letter' : 'letters'}
        </p>
        <h1 className="mb-7 mt-1 max-w-3xl font-display text-[2.1rem] font-semibold leading-[1.08] tracking-tight [text-wrap:balance] md:text-[2.6rem]">
          {thread.subject || '(no subject)'}
        </h1>
        <ol className="max-w-3xl space-y-4">
          {thread.messages.map((message, i) => (
            <MessageCard key={message.id} message={message} defaultOpen={i === thread.messages.length - 1 || message.unread} onRespond={onRespond} onUnsubscribe={onUnsubscribe} />
          ))}
        </ol>

        {last && (
          <div className="mt-7 flex max-w-3xl flex-wrap gap-2">
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
    <li className={open
      ? 'border border-border bg-letter shadow-[0_1px_0_var(--border),0_18px_36px_-24px_rgba(40,30,10,0.45)]'
      : 'border border-dashed border-border'}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex w-full items-start gap-3 px-5 pb-2 pt-4 text-left md:px-7">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-display text-[1.12rem] font-semibold">{sender}</span>
            {open && message.from && <span className="hidden truncate font-mono text-[0.7rem] text-muted sm:inline">{message.from.address}</span>}
            <time className="meta ml-auto shrink-0" dateTime={message.date}>{formatFullDate(message.date)}</time>
          </div>
          {open
            ? <p className="truncate text-[0.92rem] italic text-muted">to {[...message.to, ...message.cc].map(AddressUtility.displayName).join(', ') || 'undisclosed recipients'}</p>
            : <p className="truncate italic text-muted">{preview}</p>}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 md:px-7">
          {message.unsubscribe && (
            <div className="mb-3 flex items-center justify-between gap-3 border-y border-dotted border-border py-1.5 text-[0.92rem] italic text-muted">
              <span>This came from a mailing list.</span>
              <button type="button" onClick={() => onUnsubscribe(message)} className="meta not-italic text-marker hover:text-foreground">Unsubscribe</button>
            </div>
          )}
          <MessageBody html={message.htmlBody} text={message.textBody} />

          {files.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-3" aria-label="Attachments">
              {files.map(file => (
                <li key={file.index}>
                  <a href={mailApi.attachmentUrl(message.id, file.index)} download={file.filename}
                    className="flex -rotate-1 items-center gap-2 border border-foreground bg-background px-3 py-2 font-mono text-xs transition hover:rotate-0">
                    <PaperclipIcon width={14} height={14} />
                    <span className="max-w-80 truncate">Enclosed: {file.filename}</span>
                    <span className="text-muted">{formatBytes(file.size)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex gap-1 text-muted">
            <IconButton label="Reply" onClick={() => onRespond(message, 'reply')}><ReplyIcon width={17} height={17} /></IconButton>
            <IconButton label="Reply all" onClick={() => onRespond(message, 'replyAll')}><ReplyAllIcon width={17} height={17} /></IconButton>
            <IconButton label="Forward" onClick={() => onRespond(message, 'forward')}><ForwardIcon width={17} height={17} /></IconButton>
          </div>
        </div>
      )}
    </li>
  )
}

function ToolbarButton({ label, shortcut, title, onClick }: { label: string; shortcut?: string; title?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title={shortcut ? `${title ?? label} (${shortcut})` : title ?? label}
      className="border-b border-foreground pb-0.5 font-mono text-[0.72rem] uppercase tracking-[0.06em] transition hover:border-marker hover:text-marker">
      {shortcut && <span aria-hidden="true" className="mr-1.5 text-marker">{shortcut}</span>}{label}
    </button>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="p-1.5 hover:bg-surface-muted hover:text-foreground">
      {children}
    </button>
  )
}

function RespondButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2 border border-foreground px-4 py-2 font-display font-semibold transition hover:bg-foreground hover:text-background">
      {children}
    </button>
  )
}
