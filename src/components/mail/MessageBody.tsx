'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const REMOTE_CONTENT = /(<img[^>]+src\s*=\s*["']?\s*https?:|url\(\s*["']?\s*https?:|<link[^>]+href\s*=\s*["']?\s*https?:)/i

/**
 * Renders untrusted email HTML.
 *
 * The frame is sandboxed WITHOUT allow-scripts, so nothing in the email can
 * run. allow-same-origin is safe in that configuration and lets the parent
 * measure the content height. A CSP inside the document blocks every remote
 * load (tracking pixels included) until the reader opts in.
 */
export function MessageBody({ html, text }: { html: string | null; text: string | null }) {
  if (html) return <HtmlBody html={html} />
  return <TextBody text={text ?? ''} />
}

function HtmlBody({ html }: { html: string }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(120)
  const [showRemote, setShowRemote] = useState(false)
  const hasRemote = REMOTE_CONTENT.test(html)

  const remote = showRemote ? ' https: http:' : ''
  const csp = `default-src 'none'; img-src data: cid:${remote}; style-src 'unsafe-inline'${remote}; font-src data:${remote}; media-src data:${remote}`
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<base target="_blank">
<style>
  html,body{margin:0;padding:0;background:#fcfaf4;color:#1f2a24;font:16px/1.6 Georgia,'Iowan Old Style',serif;overflow-wrap:anywhere}
  body{padding:4px 2px}
  a{color:#3d6b4c}
  /* At night the letter stays paper: a lit sheet on a dark desk. */
  @media (prefers-color-scheme: dark){body{padding:18px 20px}}
  img{max-width:100%;height:auto}
  table{max-width:100%}
  pre{white-space:pre-wrap}
  blockquote{margin:0 0 0 .8ex;border-left:1px solid #ccc;padding-left:1ex}
</style></head><body>${html}</body></html>`

  const measure = useCallback(() => {
    const doc = frame.current?.contentDocument
    if (doc?.documentElement) setHeight(Math.max(60, doc.documentElement.scrollHeight))
  }, [])

  useEffect(() => {
    const el = frame.current
    if (!el) return
    const onLoad = () => {
      measure()
      const doc = el.contentDocument
      if (doc?.body && 'ResizeObserver' in window) {
        const observer = new ResizeObserver(measure)
        observer.observe(doc.body)
        el.addEventListener('load', () => observer.disconnect(), { once: true })
      }
      // Images finishing late change the height.
      doc?.querySelectorAll('img').forEach(img => img.addEventListener('load', measure))
    }
    el.addEventListener('load', onLoad)
    return () => el.removeEventListener('load', onLoad)
  }, [measure, srcDoc])

  return (
    <div>
      {hasRemote && !showRemote && (
        <div className="mb-3 flex items-center justify-between gap-3 border-y border-dotted border-border py-1.5 text-[0.92rem] italic text-muted">
          <span>Pictures are held back so senders can’t tell you opened this.</span>
          <button type="button" className="meta not-italic text-accent hover:text-foreground" onClick={() => setShowRemote(true)}>Show pictures</button>
        </div>
      )}
      <iframe
        ref={frame}
        title="Message content"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        srcDoc={srcDoc}
        style={{ height }}
        className="w-full bg-[#fcfaf4] dark:border dark:border-border"
      />
    </div>
  )
}

const URL_PATTERN = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]])/g

function TextBody({ text }: { text: string }) {
  const parts = text.split(URL_PATTERN)
  return (
    <div className="whitespace-pre-wrap break-words text-[1.08rem] leading-[1.65]">
      {parts.map((part, i) =>
        i % 2 === 1
          ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-accent underline">{part}</a>
          : <span key={i}>{part}</span>,
      )}
    </div>
  )
}
