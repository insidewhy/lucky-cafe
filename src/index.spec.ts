import { describe, expect, it } from 'vitest'

import { LuckyCafe } from '.'

describe('LuckyCafe', () => {
  it('can paginate through multiple sources in the correct order', async () => {
    const lc = new LuckyCafe(
      [
        {
          fetch: async (continuationToken: string | undefined) => {
            const first = parseInt(continuationToken ?? '1')
            const items: string[] = []
            for (let i = 0; i < 3; ++i) {
              items.push((first + i).toString())
            }
            const nextContinuationToken = first + 3 >= 6 ? null : (first + 3).toString()
            return { items, continuationToken: nextContinuationToken }
          },
          pageSize: 5,
          fetchOrderField: (item: string) => item,
        },
        {
          fetch: async (continuationToken: string | undefined) => {
            let first = parseInt(continuationToken ?? '1')
            if (first === 4) ++first
            const items: number[] = []
            for (let i = 0; i < 3; ++i) {
              items.push(first + i)
              if (first + i === 8) break
            }
            const nextContinuationToken = first + 3 >= 9 ? null : (first + 3).toString()
            return { items, continuationToken: nextContinuationToken }
          },
          pageSize: 3,
          fetchOrderField: (item: number) => item.toString(),
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

    const { items: items5, finished: finished5 } = await lc.fetchNextPage()
    expect(items5).toEqual([8])
    expect(finished5).toEqual(true)
  })
})
