import type { MailAddress, MailMessage } from '@/types'
import { AddressUtility } from '@/utilities/AddressUtility'

export function prefixSubject(subject: string, prefix: 'Re' | 'Fwd'): string {
  const pattern = prefix === 'Re' ? /^\s*re\s*:/i : /^\s*(fwd?|fw)\s*:/i
  const trimmed = subject.trim()
  if (pattern.test(trimmed)) return trimmed
  return `${prefix}: ${trimmed}`
}

export function formatDate(iso: string, timeZone: string): string {
  const date = new Date(iso)
  try {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(date)
  } catch {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(date) + ' UTC'
  }
}

export function plainTextOf(message: MailMessage): string {
  if (message.textBody !== null) return message.textBody.replace(/\r\n/g, '\n').trimEnd()
  if (message.htmlBody !== null) return htmlToText(message.htmlBody)
  return ''
}

export function quote(text: string): string {
  return text.split('\n').map(line => (line.startsWith('>') ? `>${line}` : `> ${line}`)).join('\n')
}

export function describe(address: MailAddress | null): string {
  return address ? AddressUtility.format(address) : 'unknown sender'
}

/** Good-enough HTML → text for quoting; the HTML itself is never executed. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
