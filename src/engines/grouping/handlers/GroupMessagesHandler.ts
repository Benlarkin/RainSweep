import type { IHandler } from '@/common/resolver/IHandler'
import type { GroupingKind, MailGroup, MessageMetadata } from '@/types'
import { GroupMessagesRequest } from '../GroupingEngineRequests'
import { GroupMessagesResponse } from '../GroupingEngineResponses'
import {
  AGE_BUCKETS, MAX_GROUPS_PER_KIND, SIZE_BUCKETS, ageInDays, buildGroup, normalizeSubject, passesFilter, quoteForSearch,
} from './groupingRules'

export class GroupMessagesHandler implements IHandler<GroupMessagesRequest> {
  async handle(request: GroupMessagesRequest): Promise<GroupMessagesResponse> {
    const { filter, now } = request
    const messages = request.messages
      .filter(m => passesFilter(m, filter, now))
      .sort((a, b) => b.date.localeCompare(a.date))

    const groups: Record<GroupingKind, MailGroup[]> = {
      sender: bySender(messages),
      list: byList(messages),
      subject: bySubject(messages),
      size: bySize(messages),
      age: byAge(messages, now),
    }
    return new GroupMessagesResponse(request.correlationId, messages, groups)
  }
}

function collect(messages: MessageMetadata[], keyOf: (m: MessageMetadata) => string | null): Map<string, MessageMetadata[]> {
  const buckets = new Map<string, MessageMetadata[]>()
  for (const message of messages) {
    const key = keyOf(message)
    if (key === null) continue
    const bucket = buckets.get(key)
    if (bucket) bucket.push(message)
    else buckets.set(key, [message])
  }
  return buckets
}

function largestFirst(groups: MailGroup[]): MailGroup[] {
  return groups
    .sort((a, b) => b.messageCount - a.messageCount || b.totalBytes - a.totalBytes || a.label.localeCompare(b.label))
    .slice(0, MAX_GROUPS_PER_KIND)
}

function bySender(messages: MessageMetadata[]): MailGroup[] {
  const groups = [...collect(messages, m => m.from?.address ?? null)].map(([address, items]) => {
    const name = items.find(m => m.from?.name)?.from?.name ?? null
    return buildGroup('sender', address, name ?? address, name ? address : null, items, `from:${quoteForSearch(address)}`)
  })
  return largestFirst(groups)
}

function byList(messages: MessageMetadata[]): MailGroup[] {
  const groups = [...collect(messages, m => m.listId)].map(([listId, items]) => {
    const sender = items[0].from
    const label = sender?.name ?? sender?.address ?? listId
    return buildGroup('list', listId, label, listId, items, `list:${quoteForSearch(listId)}`)
  })
  return largestFirst(groups)
}

function bySubject(messages: MessageMetadata[]): MailGroup[] {
  const groups = [...collect(messages, m => normalizeSubject(m.subject).toLowerCase() || null)]
    // A subject seen once isn't a pattern worth cleaning up.
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => {
      const label = normalizeSubject(items[0].subject)
      const senders = new Set(items.map(m => m.from?.address).filter(Boolean))
      const detail = senders.size === 1 ? items[0].from?.address ?? null : `${senders.size} senders`
      return buildGroup('subject', key, label, detail, items, null)
    })
  return largestFirst(groups)
}

function bySize(messages: MessageMetadata[]): MailGroup[] {
  return SIZE_BUCKETS.flatMap(bucket => {
    const items = messages.filter(m => m.sizeEstimate >= bucket.min && m.sizeEstimate < bucket.max)
    return items.length ? [buildGroup('size', bucket.key, bucket.label, null, items, bucket.query)] : []
  })
}

function byAge(messages: MessageMetadata[], now: Date): MailGroup[] {
  return AGE_BUCKETS.flatMap(bucket => {
    const items = messages.filter(m => {
      const age = ageInDays(m, now)
      return age >= bucket.minDays && age < bucket.maxDays
    })
    return items.length ? [buildGroup('age', bucket.key, bucket.label, null, items, bucket.query)] : []
  })
}
