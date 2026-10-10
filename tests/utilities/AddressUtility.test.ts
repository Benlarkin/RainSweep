import { describe, expect, it } from 'vitest'
import { AddressUtility } from '@/utilities/AddressUtility'

describe('AddressUtility', () => {
  it('parses quoted names containing commas', () => {
    expect(AddressUtility.parseList('"Doe, Jane" <jane@x.com>, bob@y.com; Ann <ann@z.org>')).toEqual([
      { name: 'Doe, Jane', address: 'jane@x.com' },
      { name: null, address: 'bob@y.com' },
      { name: 'Ann', address: 'ann@z.org' },
    ])
  })

  it('ignores empty entries', () => {
    expect(AddressUtility.parseList(' , a@b.co ,, ')).toEqual([{ name: null, address: 'a@b.co' }])
  })

  it('validates addresses permissively', () => {
    expect(AddressUtility.isValid('first.last+tag@sub.example.co.uk')).toBe(true)
    expect(AddressUtility.isValid('not-an-address')).toBe(false)
    expect(AddressUtility.isValid('a@b')).toBe(false)
  })

  it('formats and quotes display names that need it', () => {
    expect(AddressUtility.format({ name: 'Doe, Jane', address: 'j@x.com' })).toBe('"Doe, Jane" <j@x.com>')
    expect(AddressUtility.format({ name: 'Jane', address: 'j@x.com' })).toBe('Jane <j@x.com>')
  })

  it('dedupes case-insensitively', () => {
    expect(AddressUtility.dedupe([{ name: null, address: 'A@x.com' }, { name: 'A', address: 'a@x.com' }])).toHaveLength(1)
  })
})
