import type { Address, Attachment } from 'postal-mime'
import type { MailAddress } from '@/types'

export function toMailAddresses(addresses: Address[] | undefined): MailAddress[] {
  if (!addresses) return []
  return addresses.flatMap(a =>
    a.group
      ? a.group.map(m => ({ name: m.name || null, address: m.address }))
      : [{ name: a.name || null, address: a.address }],
  ).filter(a => a.address)
}

export function attachmentBytes(attachment: Attachment): Uint8Array {
  const { content } = attachment
  if (typeof content === 'string') {
    return attachment.encoding === 'base64'
      ? Uint8Array.from(atob(content), c => c.charCodeAt(0))
      : new TextEncoder().encode(content)
  }
  return content instanceof Uint8Array ? content : new Uint8Array(content)
}

/** Message-IDs in References/In-Reply-To headers: `<a@b> <c@d>` → ['<a@b>', '<c@d>'] */
export function parseMessageIds(header: string | undefined): string[] {
  return header?.match(/<[^<>\s]+>/g) ?? []
}
