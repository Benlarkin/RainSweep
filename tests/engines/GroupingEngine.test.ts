import { describe, expect, it } from 'vitest'
import { GroupMessagesHandler } from '@/engines/grouping/handlers/GroupMessagesHandler'
import { SummarizeInsightsHandler } from '@/engines/grouping/handlers/SummarizeInsightsHandler'
import { normalizeSubject, quoteForSearch } from '@/engines/grouping/handlers/groupingRules'
import { GroupMessagesRequest, SummarizeInsightsRequest } from '@/engines/grouping/GroupingEngineRequests'
import type { CleanupFilter, MessageMetadata } from '@/types'

const NOW = new Date('2026-10-10T00:00:00Z')
const DAY = 86_400_000
const SUB = { oneClick: true, httpUrl: 'https://news.example/u', mailto: null }

function msg(id: string, overrides: Partial<MessageMetadata> = {}): MessageMetadata {
  return {
    id, threadId: `t-${id}`, from: { name: null, address: 'someone@example.com' }, subject: 'Hello',
    date: new Date(NOW.getTime() - DAY).toISOString(), sizeEstimate: 10_000, unread: false, labelIds: ['INBOX'],
    listId: null, unsubscribe: null, ...overrides,
  }
}

const NO_FILTER: CleanupFilter = { olderThanDays: null, largerThanBytes: null, unreadOnly: false }

const mailbox: MessageMetadata[] = [
  msg('n1', { from: { name: 'Daily News', address: 'news@news.example' }, subject: 'Issue 101', listId: 'daily.news.example', unsubscribe: SUB, unread: true }),
  msg('n2', { from: { name: null, address: 'news@news.example' }, subject: 'Issue 102', listId: 'daily.news.example', unsubscribe: SUB, unread: true, date: new Date(NOW.getTime() - 400 * DAY).toISOString() }),
  msg('n3', { from: { name: 'Daily News', address: 'news@news.example' }, subject: 'Issue 103', listId: 'daily.news.example', unsubscribe: SUB, unread: true, sizeEstimate: 6 * 1024 * 1024 }),
  msg('a1', { from: { name: 'Alice', address: 'alice@example.org' }, subject: 'Re: Order #1182 shipped' }),
  msg('a2', { from: { name: 'Alice', address: 'alice@example.org' }, subject: 'Order #1190 shipped', date: new Date(NOW.getTime() - 40 * DAY).toISOString() }),
  msg('b1', { from: { name: 'Bob', address: 'bob@example.net' }, subject: 'One-off', sizeEstimate: 12 * 1024 * 1024 }),
]

async function group(filter = NO_FILTER) {
  return new GroupMessagesHandler().handle(new GroupMessagesRequest(mailbox, filter, NOW))
}

describe('GroupingEngine', () => {
  it('groups by sender, largest first, with a Gmail search for each', async () => {
    const { groups } = await group()
    expect(groups.sender.map(g => g.id)).toEqual(['sender:news@news.example', 'sender:alice@example.org', 'sender:bob@example.net'])
    const news = groups.sender[0]
    expect(news).toMatchObject({ label: 'Daily News', detail: 'news@news.example', messageCount: 3, unreadCount: 3, searchQuery: 'from:news@news.example' })
    expect(news.unsubscribe).toEqual(SUB)
    expect(news.totalBytes).toBe(20_000 + 6 * 1024 * 1024)
    // Newest first, so the sample message carries the freshest headers.
    expect(news.messageIds[news.messageIds.length - 1]).toBe('n2')
  })

  it('groups mailing lists by List-Id', async () => {
    const { groups } = await group()
    expect(groups.list).toHaveLength(1)
    expect(groups.list[0]).toMatchObject({ id: 'list:daily.news.example', messageCount: 3, searchQuery: 'list:daily.news.example' })
  })

  it('groups recurring subjects that differ only in numbers, ignoring one-offs', async () => {
    const { groups } = await group()
    const labels = groups.subject.map(g => g.label)
    expect(labels).toContain('Issue #')
    expect(labels).toContain('Order ## shipped')
    expect(labels).not.toContain('One-off')
    expect(groups.subject.find(g => g.label === 'Issue #')?.messageCount).toBe(3)
  })

  it('buckets by size and age', async () => {
    const { groups } = await group()
    expect(groups.size.map(g => [g.id, g.messageCount])).toEqual([['size:10mb', 1], ['size:5mb', 1], ['size:small', 4]])
    expect(groups.age.map(g => [g.id, g.messageCount])).toEqual([['age:1y', 1], ['age:30d', 1], ['age:recent', 4]])
  })

  it('combines filters before grouping', async () => {
    const { groups, messages } = await group({ olderThanDays: 30, largerThanBytes: null, unreadOnly: true })
    expect(messages.map(m => m.id)).toEqual(['n2'])
    expect(groups.sender).toHaveLength(1)
    const big = await group({ olderThanDays: null, largerThanBytes: 5 * 1024 * 1024, unreadOnly: false })
    expect(big.messages.map(m => m.id).sort()).toEqual(['b1', 'n3'])
  })

  it('summarizes insights, flagging subscriptions that were never opened', async () => {
    const { groups, messages } = await group()
    const { insights } = await new SummarizeInsightsHandler().handle(new SummarizeInsightsRequest(messages, groups.sender))
    expect(insights).toMatchObject({ messageCount: 6, unreadCount: 3, subscriptionCount: 1 })
    expect(insights.unopenedSubscriptions.map(g => g.id)).toEqual(['sender:news@news.example'])
    expect(insights.largestSenders[0].id).toBe('sender:bob@example.net')
    expect(insights.oldestMessages[0].id).toBe('n2')
  })

  it('normalizes subjects and quotes search values', () => {
    expect(normalizeSubject('Fwd: RE:  Invoice 2026-10 ready')).toBe('Invoice # ready')
    expect(quoteForSearch('news@news.example')).toBe('news@news.example')
    expect(quoteForSearch('weird "list" id')).toBe('"weird list id"')
  })
})
