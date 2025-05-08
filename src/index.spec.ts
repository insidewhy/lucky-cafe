import { describe, expect, it } from 'vitest'

import { LuckyCafe } from '.'

describe('LuckyCafe', () => {
  it('can paginate through multiple sources in ascending order according to getOrderField', async () => {
    const lc = new LuckyCafe(
      [
        {
          fetch: async (continuationToken: string | null) => {
            const first = parseInt(continuationToken ?? '1')
            const limit = first + 3
            const items: string[] = []
            for (let i = first; i < limit; ++i) {
              items.push(i.toString())
            }
            const nextContinuationToken = limit >= 6 ? null : limit.toString()
            return { items, continuationToken: nextContinuationToken }
          },
          getOrderField: (item: string) => item,
        },
        {
          fetch: async (continuationToken: string | null) => {
            let first = parseInt(continuationToken ?? '1')
            // skip 4 to show the library can deal with it
            if (first === 4) ++first
            const limit = first + 3
            const items: number[] = []
            for (let i = first; i < limit; ++i) {
              items.push(i)
              if (i === 8) break
            }
            const nextContinuationToken = limit >= 9 ? null : limit.toString()
            return { items, continuationToken: nextContinuationToken }
          },
          getOrderField: (item: number) => item.toString(),
        },
      ],
      { pageSize: 3 },
    )

    const { items, finished } = await lc.fetchNextPage()
    expect(items).toEqual(['1', 1, '2'])
    expect(finished).toEqual(false)

    const { items: items2, finished: finished2 } = await lc.fetchNextPage()
    expect(items2).toEqual([2, '3', 3])
    expect(finished2).toEqual(false)

    const { items: items3, finished: finished3 } = await lc.fetchNextPage()
    expect(items3).toEqual(['4', '5', 5])
    expect(finished3).toEqual(false)

    const { items: items4, finished: finished4 } = await lc.fetchNextPage()
    expect(items4).toEqual(['6', 6, 7])
    expect(finished4).toEqual(false)
    expect(lc.finished()).toEqual(false)

    const { items: items5, finished: finished5 } = await lc.fetchNextPage()
    expect(items5).toEqual([8])
    expect(finished5).toEqual(true)
    expect(lc.finished()).toEqual(true)
  })

  it('can paginate through multiple sources in descending order according to getOrderField', async () => {
    interface StringItem {
      id: string
    }
    interface IntItem {
      id: number
    }

    const lc = new LuckyCafe(
      [
        {
          fetch: async (continuationToken: string | null) => {
            const first = parseInt(continuationToken ?? '6')
            const limit = first - 3

            const items: StringItem[] = []
            for (let i = first; i > limit; --i) {
              items.push({ id: i.toString() })
            }
            const nextContinuationToken = limit <= 2 ? null : limit.toString()
            return { items, continuationToken: nextContinuationToken }
          },
          getOrderField: (item: StringItem) => item.id,
        },
        {
          fetch: async (continuationToken: string | null) => {
            const first = parseInt(continuationToken ?? '8')
            const limit = first - 3
            const items: IntItem[] = []
            for (let i = first; i > limit; --i) {
              items.push({ id: i })
            }
            const nextContinuationToken = limit <= 3 ? null : limit.toString()
            return { items, continuationToken: nextContinuationToken }
          },
          getOrderField: (item: IntItem) => item.id.toString(),
        },
      ],
      { pageSize: 3, descending: true },
    )

    const { items, finished } = await lc.fetchNextPage()
    expect(items).toEqual([{ id: 8 }, { id: 7 }, { id: '6' }])
    expect(finished).toEqual(false)

    const { items: items2, finished: finished2 } = await lc.fetchNextPage()
    expect(items2).toEqual([{ id: 6 }, { id: '5' }, { id: 5 }])
    expect(finished2).toEqual(false)

    const { items: items3, finished: finished3 } = await lc.fetchNextPage()
    expect(items3).toEqual([{ id: '4' }, { id: 4 }, { id: '3' }])
    expect(finished3).toEqual(false)

    const { items: items4, finished: finished4 } = await lc.fetchNextPage()
    expect(items4).toEqual([{ id: 3 }, { id: '2' }, { id: '1' }])
    expect(finished4).toEqual(true)

    // ensure that calling fetchNextPage again after already finished returns an empty
    // page and finished = true again
    const { items: items5, finished: finished5 } = await lc.fetchNextPage()
    expect(items5).toEqual([])
    expect(finished5).toEqual(true)
  })

  it('can paginate through a single source that ends on a page boundary', async () => {
    const lc = new LuckyCafe(
      [
        {
          fetch: async (continuationToken: string | null) => {
            const first = parseInt(continuationToken ?? '1')
            const limit = first + 3
            const items: number[] = []
            for (let i = first; i < limit; ++i) {
              items.push(i)
            }
            const nextContinuationToken = limit >= 6 ? null : (first + 3).toString()
            return { items, continuationToken: nextContinuationToken }
          },
          getOrderField: (item) => item.toString(),
        },
      ],
      { pageSize: 3 },
    )

    const { items, finished } = await lc.fetchNextPage()
    expect(items).toEqual([1, 2, 3])
    expect(finished).toEqual(false)

    const { items: items2, finished: finished2 } = await lc.fetchNextPage()
    expect(items2).toEqual([4, 5, 6])
    expect(finished2).toEqual(true)
  })

  it('can paginate through a single source that ends after a page boundary', async () => {
    const lc = new LuckyCafe(
      [
        {
          fetch: async (continuationToken: string | null) => {
            const first = parseInt(continuationToken ?? '1')
            const limit = first + 3
            const items: number[] = []
            for (let i = first; i < limit; ++i) {
              items.push(i)
              if (i === 7) break
            }
            const nextContinuationToken = limit >= 9 ? null : (first + 3).toString()
            return { items, continuationToken: nextContinuationToken }
          },
          getOrderField: (item) => item.toString(),
        },
      ],
      { pageSize: 3 },
    )

    const { items, finished } = await lc.fetchNextPage()
    expect(items).toEqual([1, 2, 3])
    expect(finished).toEqual(false)

    const { items: items2, finished: finished2 } = await lc.fetchNextPage()
    expect(items2).toEqual([4, 5, 6])
    expect(finished2).toEqual(false)

    const { items: items3, finished: finished3 } = await lc.fetchNextPage()
    expect(items3).toEqual([7])
    expect(finished3).toEqual(true)
  })
})
