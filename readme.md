# lucky-cafe

`lucky-cafe` is a library for retrieving ordered interleaved pages of items from multiple asynchronous paginated sources.
It returns items according to a well defined ordering function and ensures API requests are made lazily (as and when they are needed).

## Example

```typescript
const lc = new LuckyCafe(
  [
    {
      fetch: async (continuationToken: string | null) => {
        // this provides dummy data asynchronously to show the ordering works
        // usually this callback would call an API via fetch/axios etc.
        const first = parseInt(continuationToken ?? '1')
        const items: string[] = []
        for (let i = 0; i < 3; ++i) {
          items.push((first + i).toString())
        }
        const nextContinuationToken = first + 3 >= 6 ? null : (first + 3).toString()
        return { items, continuationToken: nextContinuationToken }
      },
      getOrderField: (item: string) => item,
    },
    {
      fetch: async (continuationToken: string | null) => {
        const first = parseInt(continuationToken ?? '1')
        // skip 4 to show the library can deal with it
        if (first === 4) ++first
        const items: number[] = []
        for (let i = 0; i < 3; ++i) {
          items.push(first + i)
          if (first + i === 8) break
        }
        const nextContinuationToken = first + 3 >= 9 ? null : (first + 3).toString()
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

const { items: items5, finished: finished5 } = await lc.fetchNextPage()
expect(items5).toEqual([8])
expect(finished5).toEqual(true)
```

The `pageSize` config determines how many items should be returned by each call to `fextNextPage`.

The `fetch` callbacks must return an object with an `items` field and a `continuationToken` string (or `null` when there is no continuation token i.e. there are no more pages).
If the API does not return data in this format a wrapper function can be used around the call which retrieves the data.

`getOrderField` is used to grab a field from the page items, this item is compared to other order fields using `<` to determine the ordering of the data in the pages returned by `fetchNextPage`.
The config option `descending` can be set to `true` to compare order fields with `>` instead of `<`.

It may be useful to know which source each item came from, when this is needed add this field via the `fetch` function, creating a wrapper as needed if the existing fetch function does not contain this data.
