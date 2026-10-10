import type { MailAddress } from '@/types'
import { AddressUtility } from './AddressUtility'

export interface MailtoFields {
  to: MailAddress[]
  cc: MailAddress[]
  bcc: MailAddress[]
  subject: string
  body: string
}

/** Parses RFC 6068 mailto: URLs, used when the app is the system's mail handler. */
export class MailtoUtility {
  static parse(url: string): MailtoFields | null {
    if (!/^mailto:/i.test(url)) return null
    const withoutScheme = url.slice('mailto:'.length)
    const [pathPart, queryPart = ''] = withoutScheme.split('?', 2)
    const params = new URLSearchParams(queryPart)
    const get = (key: string): string => {
      for (const [k, v] of params) if (k.toLowerCase() === key) return v
      return ''
    }
    return {
      to: [...AddressUtility.parseList(decodeURIComponent(pathPart)), ...AddressUtility.parseList(get('to'))],
      cc: AddressUtility.parseList(get('cc')),
      bcc: AddressUtility.parseList(get('bcc')),
      subject: get('subject'),
      body: get('body'),
    }
  }
}
