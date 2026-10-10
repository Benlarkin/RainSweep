import { describe, expect, it } from 'vitest'
import { readListId, readListName, readUnsubscribe } from '@/engines/messageParsing/handlers/unsubscribeRules'
import { ParseMetadataHandler } from '@/engines/messageParsing/handlers/ParseMetadataHandler'
import { ParseMetadataRequest } from '@/engines/messageParsing/MessageParsingEngineRequests'

describe('List-Unsubscribe parsing', () => {
  it('reads one-click https plus mailto', () => {
    expect(readUnsubscribe('<mailto:leave@list.example?subject=unsubscribe>, <https://list.example/u/abc>', 'List-Unsubscribe=One-Click'))
      .toEqual({ oneClick: true, httpUrl: 'https://list.example/u/abc', mailto: 'mailto:leave@list.example?subject=unsubscribe' })
  })

  it('does not treat plain http as one-click', () => {
    expect(readUnsubscribe('<http://list.example/u>', 'List-Unsubscribe=One-Click'))
      .toEqual({ oneClick: false, httpUrl: 'http://list.example/u', mailto: null })
  })

  it('needs the Post header for one-click', () => {
    expect(readUnsubscribe('<https://list.example/u>', undefined)?.oneClick).toBe(false)
  })

  it('ignores headers without usable targets', () => {
    expect(readUnsubscribe(undefined, undefined)).toBeNull()
    expect(readUnsubscribe('<javascript:alert(1)>', undefined)).toBeNull()
  })

  it('reads List-Id', () => {
    expect(readListId('"Weekly News" <Weekly.News.Example>')).toBe('weekly.news.example')
    expect(readListName('"Weekly News" <weekly.news.example>')).toBe('Weekly News')
    expect(readListId(undefined)).toBeNull()
  })
})

describe('ParseMetadata', () => {
  it('turns raw headers into cleanup metadata', async () => {
    const { messages } = await new ParseMetadataHandler().handle(new ParseMetadataRequest([{
      id: 'm1', threadId: 't1', labelIds: ['INBOX'], unread: true, sizeEstimate: 2048,
      receivedAt: '2026-10-01T12:00:00.000Z',
      headers: {
        from: '=?UTF-8?Q?Caf=C3=A9_News?= <news@cafe.example>',
        subject: '=?UTF-8?B?V2Vla2x5IGRlYWxz?=',
        date: 'garbage',
        'list-id': '<cafe.example>',
        'list-unsubscribe': '<https://cafe.example/u>',
        'list-unsubscribe-post': 'List-Unsubscribe=One-Click',
      },
    }]))
    expect(messages[0]).toMatchObject({
      id: 'm1',
      from: { name: 'Café News', address: 'news@cafe.example' },
      subject: 'Weekly deals',
      date: '2026-10-01T12:00:00.000Z',
      listId: 'cafe.example',
      unsubscribe: { oneClick: true, httpUrl: 'https://cafe.example/u', mailto: null },
    })
  })
})
