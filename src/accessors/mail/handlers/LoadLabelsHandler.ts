import type { IHandler } from '@/common/resolver/IHandler'
import type { MailLabel } from '@/types'
import { ConcurrencyUtility } from '@/utilities/ConcurrencyUtility'
import type { GmailClient } from '../gmail/GmailClient'
import { isRecord } from '../gmail/GmailClient'
import { readLabel } from '../gmail/gmailTypes'
import { LoadLabelsRequest } from '../MailRequests'
import { LoadLabelsResponse } from '../MailResponses'

/** System labels shown in the sidebar, in display order, with friendly names. */
const SYSTEM_LABELS: ReadonlyArray<[string, string]> = [
  ['INBOX', 'Inbox'],
  ['STARRED', 'Starred'],
  ['IMPORTANT', 'Important'],
  ['SENT', 'Sent'],
  ['DRAFT', 'Drafts'],
  ['SPAM', 'Spam'],
  ['TRASH', 'Trash'],
]

export class LoadLabelsHandler implements IHandler<LoadLabelsRequest> {
  constructor(private readonly gmail: GmailClient) {}

  async handle(request: LoadLabelsRequest): Promise<LoadLabelsResponse> {
    const list = await this.gmail.get(request.accessToken, '/labels')
    if (!list.ok) return new LoadLabelsResponse(request.correlationId, [], list.failure)

    const all = (isRecord(list.data) && Array.isArray(list.data.labels) ? list.data.labels : [])
      .map(readLabel)
      .filter(l => l !== null)

    const systemIds = new Set(SYSTEM_LABELS.map(([id]) => id))
    const wanted = [
      ...SYSTEM_LABELS.filter(([id]) => all.some(l => l.id === id)).map(([id]) => id),
      ...all.filter(l => l.type === 'user').sort((a, b) => a.name.localeCompare(b.name)).map(l => l.id),
    ]

    // labels.list omits counts; labels.get has them. Fetch a few at a time to
    // stay inside Gmail's per-user quota.
    const detailed = await ConcurrencyUtility.mapWithLimit(wanted, 5, async id => {
      const result = await this.gmail.get(request.accessToken, `/labels/${encodeURIComponent(id)}`)
      return result.ok ? readLabel(result.data) : all.find(l => l.id === id) ?? null
    })

    const labels: MailLabel[] = detailed
      .filter(l => l !== null)
      .map(l => ({
        id: l.id,
        name: systemIds.has(l.id) ? SYSTEM_LABELS.find(([id]) => id === l.id)?.[1] ?? l.name : l.name,
        kind: l.type,
        unreadCount: l.messagesUnread,
        totalCount: l.threadsTotal,
      }))

    return new LoadLabelsResponse(request.correlationId, labels)
  }
}
