# lucky-cafe

`lucky-cafe` is a library for iterating through multiple sources of paginated data, ensuring that the items are delivered according to a well defined ordering and the minimum number of API requests possible are made.

## Example

```typescript
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
        const first = parseInt(continuationToken ?? '1')
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
expect(items3).toEqual(['4', 4, '5'])
expect(finished3).toEqual(false)

const { items: items4, finished: finished4 } = await lc.fetchNextPage()
expect(items4).toEqual([5, '6', 6])
expect(finished4).toEqual(false)

const { items: items5, finished: finished5 } = await lc.fetchNextPage()
expect(items5).toEqual([7, 8])
expect(finished5).toEqual(true)
```

The `pageSize` for each source is used to tell `lucky-cafe` how many items will be returned by each page request.

The global `pageSize` config determines how many items should be returned by each call to `fextNextPage`.

The `fetch` callbacks must return an object with an `items` field and a `continuationToken` string (or `null` when there is no continuation token i.e. there are no more pages).
If the API does not return data in this format a wrapper function can be used around the call which retrieves the data.

`fetchOrderField` is used to grab a field from the page items, this item is compared to other order fields using `<` to determine the ordering of the data in the pages returned by `fetchNextPage`.

It may be useful to know which source each item came from, when this is needed add this field via the `fetch` function, creating a wrapper as needed if the existing fetch function does not contain this data.
