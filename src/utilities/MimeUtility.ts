import type { MailAddress, OutgoingMessage, AttachmentContent } from '@/types'
import { Base64UrlUtility } from './Base64UrlUtility'

const CRLF = '\r\n'
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Serializes an OutgoingMessage to RFC 5322 / MIME. Pure formatting with no
 * policy: what goes into the message is decided by CompositionEngine.
 */
export class MimeUtility {
  static build(message: OutgoingMessage, boundarySeed: string = crypto.randomUUID()): string {
    const headers: string[] = [
      `From: ${MimeUtility.encodeAddress(message.from)}`,
    ]
    if (message.to.length) headers.push(`To: ${MimeUtility.encodeAddressList(message.to)}`)
    if (message.cc.length) headers.push(`Cc: ${MimeUtility.encodeAddressList(message.cc)}`)
    if (message.bcc.length) headers.push(`Bcc: ${MimeUtility.encodeAddressList(message.bcc)}`)
    headers.push(
      `Subject: ${MimeUtility.encodeHeaderText(message.subject)}`,
      `Date: ${MimeUtility.formatDate(message.date)}`,
      `Message-ID: ${MimeUtility.sanitize(message.messageId)}`,
    )
    if (message.inReplyTo) headers.push(`In-Reply-To: ${MimeUtility.sanitize(message.inReplyTo)}`)
    if (message.references.length) headers.push(`References: ${message.references.map(MimeUtility.sanitize).join(' ')}`)
    headers.push('MIME-Version: 1.0')

    const body = MimeUtility.buildBody(message, boundarySeed)
    return [...headers, ...body.headers].join(CRLF) + CRLF + CRLF + body.content
  }

  static formatDate(date: Date): string {
    const pad = (n: number): string => String(n).padStart(2, '0')
    const offsetMinutes = -date.getTimezoneOffset()
    const sign = offsetMinutes >= 0 ? '+' : '-'
    const abs = Math.abs(offsetMinutes)
    return `${DAYS[date.getDay()]}, ${pad(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()} ` +
      `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${sign}${pad(Math.floor(abs / 60))}${pad(abs % 60)}`
  }

  /** RFC 2047 encoded-word for non-ASCII header text; ASCII passes through. */
  static encodeHeaderText(value: string): string {
    const clean = MimeUtility.sanitize(value)
    if (/^[\x20-\x7e]*$/.test(clean)) return clean
    return `=?UTF-8?B?${Base64UrlUtility.toBase64(new TextEncoder().encode(clean))}?=`
  }

  static encodeAddress(address: MailAddress): string {
    const email = MimeUtility.sanitize(address.address)
    if (!address.name) return email
    const name = MimeUtility.sanitize(address.name)
    const display = /^[\x20-\x7e]*$/.test(name)
      ? `"${name.replace(/(["\\])/g, '\\$1')}"`
      : MimeUtility.encodeHeaderText(name)
    return `${display} <${email}>`
  }

  static encodeAddressList(addresses: readonly MailAddress[]): string {
    return addresses.map(MimeUtility.encodeAddress).join(', ')
  }

  /** Strips CR/LF so user input can never inject extra headers. */
  static sanitize(value: string): string {
    return value.replace(/[\r\n]+/g, ' ')
  }

  private static buildBody(message: OutgoingMessage, seed: string): { headers: string[]; content: string } {
    const textPart = MimeUtility.leaf('text/plain; charset=UTF-8', new TextEncoder().encode(message.textBody))
    const alternative = message.htmlBody === null
      ? textPart
      : MimeUtility.multipart('alternative', `alt-${seed}`, [
          textPart,
          MimeUtility.leaf('text/html; charset=UTF-8', new TextEncoder().encode(message.htmlBody)),
        ])

    if (message.attachments.length === 0) return alternative

    return MimeUtility.multipart('mixed', `mixed-${seed}`, [
      alternative,
      ...message.attachments.map(MimeUtility.attachment),
    ])
  }

  private static leaf(contentType: string, bytes: Uint8Array, extraHeaders: string[] = []): { headers: string[]; content: string } {
    return {
      headers: [`Content-Type: ${contentType}`, 'Content-Transfer-Encoding: base64', ...extraHeaders],
      content: MimeUtility.wrapBase64(Base64UrlUtility.toBase64(bytes)),
    }
  }

  private static attachment(file: AttachmentContent): { headers: string[]; content: string } {
    const filename = MimeUtility.encodeHeaderText(file.filename).replace(/"/g, '')
    return MimeUtility.leaf(
      `${MimeUtility.sanitize(file.mimeType) || 'application/octet-stream'}; name="${filename}"`,
      file.content,
      [`Content-Disposition: attachment; filename="${filename}"`],
    )
  }

  private static multipart(
    subtype: 'alternative' | 'mixed',
    boundary: string,
    parts: { headers: string[]; content: string }[],
  ): { headers: string[]; content: string } {
    const body = parts
      .map(part => `--${boundary}${CRLF}${part.headers.join(CRLF)}${CRLF}${CRLF}${part.content}`)
      .join(CRLF)
    return {
      headers: [`Content-Type: multipart/${subtype}; boundary="${boundary}"`],
      content: `${body}${CRLF}--${boundary}--`,
    }
  }

  private static wrapBase64(base64: string): string {
    return base64.match(/.{1,76}/g)?.join(CRLF) ?? ''
  }
}
