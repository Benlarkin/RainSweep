import type { MailAddress } from '@/types'

// Deliberately permissive: catches typos without rejecting valid-but-unusual addresses.
const ADDRESS_PATTERN = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/

export class AddressUtility {
  /** Parse a header-style list: `"Doe, Jane" <jane@x.com>, bob@y.com; Ann <ann@z.org>` */
  static parseList(input: string | null | undefined): MailAddress[] {
    if (!input) return []
    return AddressUtility.splitList(input)
      .map(part => AddressUtility.parseOne(part))
      .filter((a): a is MailAddress => a !== null)
  }

  static parseOne(input: string): MailAddress | null {
    const trimmed = input.trim()
    if (!trimmed) return null
    const angle = trimmed.match(/^(.*?)<\s*([^<>]+?)\s*>\s*$/)
    if (angle) {
      const name = AddressUtility.unquote(angle[1].trim())
      return { name: name || null, address: angle[2].trim() }
    }
    return { name: null, address: AddressUtility.unquote(trimmed) }
  }

  static isValid(address: string): boolean {
    return ADDRESS_PATTERN.test(address)
  }

  static format(address: MailAddress): string {
    if (!address.name) return address.address
    const needsQuotes = /[",;:<>()@[\]\\]/.test(address.name)
    const name = needsQuotes ? `"${address.name.replace(/(["\\])/g, '\\$1')}"` : address.name
    return `${name} <${address.address}>`
  }

  static formatList(addresses: readonly MailAddress[]): string {
    return addresses.map(AddressUtility.format).join(', ')
  }

  static displayName(address: MailAddress): string {
    return address.name ?? address.address.split('@')[0]
  }

  static sameAddress(a: MailAddress, b: MailAddress): boolean {
    return a.address.toLowerCase() === b.address.toLowerCase()
  }

  /** Removes duplicates (case-insensitive on address), keeping first occurrence. */
  static dedupe(addresses: readonly MailAddress[]): MailAddress[] {
    const seen = new Set<string>()
    return addresses.filter(a => {
      const key = a.address.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private static splitList(input: string): string[] {
    const parts: string[] = []
    let current = ''
    let inQuotes = false
    let depth = 0
    for (let i = 0; i < input.length; i++) {
      const ch = input[i]
      if (ch === '\\' && inQuotes && i + 1 < input.length) {
        current += ch + input[++i]
        continue
      }
      if (ch === '"') inQuotes = !inQuotes
      else if (!inQuotes && ch === '<') depth++
      else if (!inQuotes && ch === '>') depth = Math.max(0, depth - 1)
      if ((ch === ',' || ch === ';') && !inQuotes && depth === 0) {
        parts.push(current)
        current = ''
      } else {
        current += ch
      }
    }
    parts.push(current)
    return parts
  }

  private static unquote(value: string): string {
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1).replace(/\\(.)/g, '$1')
    }
    return value
  }
}
