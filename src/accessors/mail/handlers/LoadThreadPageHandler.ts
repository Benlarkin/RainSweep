import type { IHandler } from '@/common/resolver/IHandler'
import type { MailAddress, ThreadSummary } from '@/types'
import { AddressUtility } from '@/utilities/AddressUtility'
import { ConcurrencyUtility } from '@/utilities/ConcurrencyUtility'
import type { GmailClient } from '../gmail/GmailClient'
import { isRecord } from '../gmail/GmailClient'
import { FLAG_LABELS, header, readIdList, readMessageMeta, toIso, type GmailMessageMeta } from '../gmail/gmailTypes'
import { LoadThreadPageRequest } from '../MailRequests'
import { LoadThreadPageResponse } from '../MailResponses'

const MAX_PAGE_SIZE = 50

export class LoadThreadPageHandler implements IHandler<LoadThreadPageRequest> {
  constructor(private readonly gmail: GmailClient) {}

  async handle(request: LoadThreadPageRequest): Promise<LoadThreadPageResponse> {
    const { accessToken, query } = request
    const list = await this.gmail.get(accessToken, '/threads', {
      labelIds: query.labelId ? [query.labelId] : null,
      q: query.search.trim() || null,
      pageToken: query.pageToken,
      maxResults: Math.min(Math.max(query.pageSize, 1), MAX_PAGE_SIZE),
    })
    if (!list.ok) return new LoadThreadPageResponse(request.correlationId, null, list.failure)

    const { ids, nextPageToken, resultSizeEstimate } = readIdList(list.data, 'threads')

    const summaries = await ConcurrencyUtility.mapWithLimit(ids, 8, async id => {
      const result = await this.gmail.get(accessToken, `/threads/${encodeURIComponent(id)}`, {
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      })
      if (!result.ok || !isRecord(result.data) || !Array.isArray(result.data.messages)) return null
      const messages = result.data.messages.map(readMessageMeta).filter(m => m !== null)
      return messages.length ? toSummary(id, messages) : null
    })

    return new LoadThreadPageResponse(request.correlationId, {
      threads: summaries.filter(s => s !== null),
      nextPageToken,
      resultSizeEstimate,
    })
  }
}

function toSummary(id: string, messages: GmailMessageMeta[]): ThreadSummary {
  const first = messages[0]
  const last = messages[messages.length - 1]
  const labelIds = new Set(messages.flatMap(m => m.labelIds))
  const participants: MailAddress[] = AddressUtility.dedupe(
    messages.flatMap(m => AddressUtility.parseList(header(m.headers, 'From'))),
  )

  return {
    id,
    subject: header(first.headers, 'Subject'),
    snippet: decodeEntities(last.snippet),
    participants,
    lastMessageAt: toIso(last.internalDate),
    messageCount: messages.length,
    unread: labelIds.has('UNREAD'),
    starred: labelIds.has('STARRED'),
    labelIds: [...labelIds].filter(l => !FLAG_LABELS.has(l)),
  }
}

// Gmail snippets arrive HTML-escaped.
function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}
