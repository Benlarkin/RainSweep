'use client'

import type { UnsubscribeResult } from '@/types'
import { mailApi } from '@/lib/client/mailApi'

export type Notify = (message: string, action?: { label: string; run: () => void }, tone?: 'error') => void

/**
 * Asks once, then unsubscribes through the strongest method the sender offers.
 * A link-only sender needs the user's own click to open their page, since
 * browsers block windows opened after an await.
 */
export async function confirmAndUnsubscribe(messageId: string, senderLabel: string, notify: Notify): Promise<UnsubscribeResult | null> {
  if (!window.confirm(`Unsubscribe from ${senderLabel}?`)) return null
  try {
    const { result } = await mailApi.unsubscribe(messageId)
    if (result.completed) {
      notify(result.method === 'mailto'
        ? `Unsubscribe request emailed to ${senderLabel}.`
        : `Unsubscribed from ${senderLabel}.`)
    } else if (result.url) {
      const url = result.url
      notify(`${senderLabel} needs you to confirm on their site.`, {
        label: 'Open page',
        run: () => { window.open(url, '_blank', 'noopener,noreferrer') },
      })
    }
    return result
  } catch (err) {
    notify(err instanceof Error ? err.message : 'Unsubscribe failed.', undefined, 'error')
    return null
  }
}
