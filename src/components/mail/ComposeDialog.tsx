'use client'

import { useEffect, useRef, useState } from 'react'
import { AddressUtility } from '@/utilities/AddressUtility'
import { formatBytes } from '@/lib/client/format'
import { CloseIcon, PaperclipIcon, SendIcon, TrashIcon } from '@/components/ui/Icons'
import { MAX_ATTACHMENT_BYTES, isDirty, saveLocalDraft, type ComposeState } from './composeState'

interface ComposeDialogProps {
  initial: ComposeState
  offline: boolean
  onSend: (state: ComposeState) => void
  onDiscard: () => void
}

const TITLES = { new: 'New message', reply: 'Reply', replyAll: 'Reply all', forward: 'Forward' } as const

export function ComposeDialog({ initial, offline, onSend, onDiscard }: ComposeDialogProps) {
  const [state, setState] = useState<ComposeState>(initial)
  const [showCc, setShowCc] = useState(Boolean(initial.cc || initial.bcc))
  const [error, setError] = useState<string | null>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const set = <K extends keyof ComposeState>(key: K, value: ComposeState[K]) => setState(s => ({ ...s, [key]: value }))

  // Autosave locally so a closed tab or lost connection doesn't lose the draft.
  useEffect(() => {
    const timer = setTimeout(() => { if (isDirty(state)) saveLocalDraft(state) }, 500)
    return () => clearTimeout(timer)
  }, [state])

  useEffect(() => {
    // Replies start with the cursor above the quote; new mail starts at "To".
    const target = state.mode === 'new' || state.mode === 'forward' ? 'compose-to' : 'compose-body'
    const el = document.getElementById(target)
    el?.focus()
    if (el instanceof HTMLTextAreaElement) el.setSelectionRange(0, 0)
    // Only on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const attachmentBytes = state.attachments.reduce((sum, f) => sum + f.size, 0)

  function validateAndSend() {
    const all = [state.to, state.cc, state.bcc].flatMap(AddressUtility.parseList)
    if (all.length === 0) return setError('Add at least one recipient.')
    const invalid = all.filter(a => !AddressUtility.isValid(a.address))
    if (invalid.length) return setError(`Check these addresses: ${invalid.map(a => a.address).join(', ')}`)
    if (attachmentBytes > MAX_ATTACHMENT_BYTES) return setError(`Attachments can total at most ${formatBytes(MAX_ATTACHMENT_BYTES)}.`)
    if (!state.subject.trim() && !window.confirm('Send this message without a subject?')) return
    onSend(state)
  }

  function discard() {
    if (isDirty(state) && !window.confirm('Discard this draft?')) return
    onDiscard()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); validateAndSend() }
    if (e.key === 'Escape') { e.preventDefault(); discard() }
  }

  const inputClass = 'w-full bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted'

  return (
    <div ref={dialog} role="dialog" aria-modal="false" aria-label={TITLES[state.mode]} onKeyDown={onKeyDown}
      className="fixed inset-0 z-40 flex flex-col bg-surface shadow-2xl md:inset-auto md:bottom-0 md:right-6 md:h-[min(640px,85vh)] md:w-[560px] md:rounded-t-xl md:border md:border-border">
      <header className="flex items-center justify-between rounded-t-xl bg-surface-muted px-4 py-2.5">
        <h2 className="text-sm font-semibold">{TITLES[state.mode]}</h2>
        <button type="button" aria-label="Close and discard" onClick={discard} className="rounded p-1 text-muted hover:text-foreground"><CloseIcon width={18} height={18} /></button>
      </header>

      <div className="flex items-center gap-2 border-b border-border px-4">
        <label htmlFor="compose-to" className="text-sm text-muted">To</label>
        <input id="compose-to" className={inputClass} value={state.to} onChange={e => set('to', e.target.value)} autoComplete="email" multiple />
        {!showCc && <button type="button" onClick={() => setShowCc(true)} className="text-sm text-muted hover:text-foreground">Cc/Bcc</button>}
      </div>
      {showCc && (
        <>
          <div className="flex items-center gap-2 border-b border-border px-4">
            <label htmlFor="compose-cc" className="text-sm text-muted">Cc</label>
            <input id="compose-cc" className={inputClass} value={state.cc} onChange={e => set('cc', e.target.value)} />
          </div>
          <div className="flex items-center gap-2 border-b border-border px-4">
            <label htmlFor="compose-bcc" className="text-sm text-muted">Bcc</label>
            <input id="compose-bcc" className={inputClass} value={state.bcc} onChange={e => set('bcc', e.target.value)} />
          </div>
        </>
      )}
      <div className="border-b border-border px-4">
        <input aria-label="Subject" placeholder="Subject" className={inputClass} value={state.subject} onChange={e => set('subject', e.target.value)} />
      </div>
      <textarea id="compose-body" aria-label="Message" value={state.body} onChange={e => set('body', e.target.value)}
        className="flex-1 resize-none bg-transparent px-5 py-3 font-sans text-sm leading-relaxed outline-none" />

      {state.attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2 px-4 pb-2">
          {state.attachments.map((file, i) => (
            <li key={`${file.name}-${i}`} className="flex items-center gap-2 rounded-lg bg-surface-muted px-2.5 py-1 text-xs">
              <span className="max-w-40 truncate">{file.name}</span>
              <span className="text-muted">{formatBytes(file.size)}</span>
              <button type="button" aria-label={`Remove ${file.name}`} onClick={() => set('attachments', state.attachments.filter((_, j) => j !== i))}>
                <CloseIcon width={14} height={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p role="alert" className="px-4 pb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <footer className="flex items-center gap-2 border-t border-border px-4 py-3">
        <button type="button" onClick={validateAndSend} disabled={offline}
          title={offline ? 'You are offline. Your draft is saved on this device.' : 'Send (Ctrl/⌘+Enter)'}
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-50">
          Send <SendIcon width={16} height={16} />
        </button>
        <input ref={fileInput} type="file" multiple hidden onChange={e => {
          const files = Array.from(e.target.files ?? [])
          set('attachments', [...state.attachments, ...files])
          e.target.value = ''
        }} />
        <button type="button" aria-label="Attach files" title="Attach files" onClick={() => fileInput.current?.click()}
          className="rounded-full p-2 text-muted hover:bg-surface-muted hover:text-foreground">
          <PaperclipIcon width={18} height={18} />
        </button>
        {offline && <span className="text-xs text-muted">Offline: draft saved on this device</span>}
        <button type="button" aria-label="Discard draft" title="Discard draft" onClick={discard}
          className="ml-auto rounded-full p-2 text-muted hover:bg-surface-muted hover:text-foreground">
          <TrashIcon width={18} height={18} />
        </button>
      </footer>
    </div>
  )
}
