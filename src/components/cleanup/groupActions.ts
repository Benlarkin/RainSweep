'use client'

import type { BulkMessageAction, MailGroup } from '@/types'
import { confirmAndUnsubscribe, type Notify } from '@/components/mail/unsubscribe'

export type Apply = (messageIds: string[], action: BulkMessageAction, description: string) => Promise<void>

const VERBS: Partial<Record<BulkMessageAction, string>> = {
  trash: 'Moved {n} messages to Trash.',
  archive: 'Archived {n} messages.',
  markRead: 'Marked {n} messages as read.',
}

export function describe(action: BulkMessageAction): string {
  return VERBS[action] ?? 'Updated {n} messages.'
}

export function runGroupAction(groups: MailGroup[], action: BulkMessageAction, apply: Apply): Promise<void> {
  const ids = groups.flatMap(g => g.messageIds)
  if (action === 'trash' && ids.length > 50
    && !window.confirm(`Move ${ids.length.toLocaleString()} messages to Trash? Gmail empties Trash after 30 days.`)) {
    return Promise.resolve()
  }
  return apply(ids, action, describe(action))
}

/** Unsubscribes using the newest message's headers, then optionally trashes the whole group. */
export async function unsubscribeGroup(group: MailGroup, notify: Notify, apply: Apply, alsoTrash: boolean): Promise<boolean> {
  const result = await confirmAndUnsubscribe(group.sampleMessageId, group.label, notify)
  if (result && alsoTrash) {
    await apply(group.messageIds, 'trash', `Unsubscribed from ${group.label} and moved {n} messages to Trash.`)
  }
  return result?.completed ?? false
}
