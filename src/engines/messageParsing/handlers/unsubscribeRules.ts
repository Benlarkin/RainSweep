import type { UnsubscribeOptions } from '@/types'

/**
 * Reads RFC 2369 `List-Unsubscribe` and RFC 8058 `List-Unsubscribe-Post`.
 *   List-Unsubscribe: <mailto:leave@list.example?subject=unsubscribe>, <https://list.example/u/abc>
 *   List-Unsubscribe-Post: List-Unsubscribe=One-Click
 * One-click is only honoured for https URLs, as RFC 8058 requires.
 */
export function readUnsubscribe(listUnsubscribe: string | undefined, listUnsubscribePost: string | undefined): UnsubscribeOptions | null {
  if (!listUnsubscribe) return null
  const targets = [...listUnsubscribe.matchAll(/<\s*([^>\s]+)\s*>/g)].map(m => m[1])

  let httpUrl: string | null = null
  let mailto: string | null = null
  for (const target of targets) {
    if (!httpUrl && /^https?:\/\//i.test(target) && isParsableUrl(target)) httpUrl = target
    else if (!mailto && /^mailto:/i.test(target)) mailto = target
  }
  if (!httpUrl && !mailto) return null

  const oneClick = httpUrl !== null
    && httpUrl.toLowerCase().startsWith('https://')
    && /list-unsubscribe\s*=\s*one-click/i.test(listUnsubscribePost ?? '')

  return { oneClick, httpUrl, mailto }
}

/** `"Weekly News" <news.example.com>` → `Weekly News`; `<news.example.com>` → `news.example.com` */
export function readListId(listId: string | undefined): string | null {
  if (!listId) return null
  const match = listId.match(/^\s*(?:"?([^"<]*?)"?\s*)?<([^>]+)>\s*$/)
  if (!match) return listId.trim() || null
  return match[2].trim().toLowerCase()
}

export function readListName(listId: string | undefined): string | null {
  if (!listId) return null
  const name = listId.match(/^\s*"?([^"<]+?)"?\s*</)?.[1]?.trim()
  return name || null
}

function isParsableUrl(value: string): boolean {
  try { new URL(value); return true } catch { return false }
}
