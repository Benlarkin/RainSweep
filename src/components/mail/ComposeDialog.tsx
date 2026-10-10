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

  const inputClass = 'w-full bg-transparent px-1 py-2.5 outline-none placeholder:italic placeholder:text-muted'

  return (
    <div ref={dialog} role="dialog" aria-modal="false" aria-label={TITLES[state.mode]} onKeyDown={onKeyDown}
      className="fixed inset-0 z-40 flex flex-col bg-letter shadow-[0_24px_60px_-20px_rgba(30,25,10,0.5)] md:inset-auto md:bottom-0 md:right-8 md:h-[min(640px,85vh)] md:w-[580px] md:border-[1.5px] md:border-b-0 md:border-foreground">
      <header className="flex items-center justify-between border-b-[1.5px] border-foreground px-5 py-3">
        <h2 className="font-display text-lg font-semibold">{TITLES[state.mode]}</h2>
        <button type="button" aria-label="Close and discard" onClick={discard} className="rounded p-1 text-muted hover:text-foreground"><CloseIcon width={18} height={18} /></button>
      </header>

      <div className="flex items-center gap-2 border-b border-border px-5">
        <label htmlFor="compose-to" className="meta w-8">To</label>
        <input id="compose-to" className={inputClass} value={state.to} onChange={e => set('to', e.target.value)} autoComplete="email" multiple />
        {!showCc && <button type="button" onClick={() => setShowCc(true)} className="meta hover:text-foreground">Cc/Bcc</button>}
      </div>
      {showCc && (
        <>
          <div className="flex items-center gap-2 border-b border-border px-5">
            <label htmlFor="compose-cc" className="meta w-8">Cc</label>
            <input id="compose-cc" className={inputClass} value={state.cc} onChange={e => set('cc', e.target.value)} />
          </div>
          <div className="flex items-center gap-2 border-b border-border px-5">
            <label htmlFor="compose-bcc" className="meta w-8">Bcc</label>
            <input id="compose-bcc" className={inputClass} value={state.bcc} onChange={e => set('bcc', e.target.value)} />
          </div>
        </>
      )}
      <div className="border-b border-border px-5">
        <input aria-label="Subject" placeholder="Subject" className={`${inputClass} font-display text-lg font-semibold`} value={state.subject} onChange={e => set('subject', e.target.value)} />
      </div>
      <textarea id="compose-body" aria-label="Message" value={state.body} onChange={e => set('body', e.target.value)}
        className="flex-1 resize-none bg-transparent px-6 py-4 text-[1.08rem] leading-[1.65] outline-none" />

      {state.attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2 px-4 pb-2">
          {state.attachments.map((file, i) => (
            <li key={`${file.name}-${i}`} className="flex items-center gap-2 border border-foreground bg-background px-2.5 py-1 font-mono text-xs">
              <span className="max-w-40 truncate">{file.name}</span>
              <span className="text-muted">{formatBytes(file.size)}</span>
              <button type="button" aria-label={`Remove ${file.name}`} onClick={() => set('attachments', state.attachments.filter((_, j) => j !== i))}>
                <CloseIcon width={14} height={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p role="alert" className="px-5 pb-2 italic text-marker">{error}</p>}

      <footer className="flex items-center gap-2 border-t border-border px-5 py-3">
        <button type="button" onClick={validateAndSend} disabled={offline}
          title={offline ? 'You are offline. Your draft is saved on this device.' : 'Send (Ctrl/⌘+Enter)'}
          className="flex items-center gap-2 bg-foreground px-5 py-2 font-mono text-xs uppercase tracking-[0.08em] text-background transition hover:opacity-85 disabled:opacity-50">
          Send <SendIcon width={16} height={16} />
        </button>
        <input ref={fileInput} type="file" multiple hidden onChange={e => {
          const files = Array.from(e.target.files ?? [])
          set('attachments', [...state.attachments, ...files])
          e.target.value = ''
        }} />
        <button type="button" aria-label="Attach files" title="Attach files" onClick={() => fileInput.current?.click()}
          className="p-2 text-muted hover:bg-surface-muted hover:text-foreground">
          <PaperclipIcon width={18} height={18} />
        </button>
        {offline && <span className="text-sm italic text-muted">Offline: draft saved on this device</span>}
        <button type="button" aria-label="Discard draft" title="Discard draft" onClick={discard}
          className="ml-auto p-2 text-muted hover:bg-surface-muted hover:text-foreground">
          <TrashIcon width={18} height={18} />
        </button>
      </footer>
    </div>
  )
}
