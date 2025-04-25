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
        const limit = first + 3
        const items: string[] = []
        for (let i = first; i < limit; ++i) {
          items.push(i.toString())
        }
        const nextContinuationToken = limit >= 6 ? null : (first + 3).toString()
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

const { items: items5, finished: finished5 } = await lc.fetchNextPage()
expect(items5).toEqual([8])
expect(finished5).toEqual(true)
```

The `pageSize` configuration determines how many items should be returned by each call to `fextNextPage`.

The `fetch` callbacks must return an object with an `items` array and a `continuationToken` string (or `null` when there is no continuation token i.e. there are no more pages).
For each source, the continuation token returned by `fetch` will be passed to the subsequent call and a `continuationToken` of `null` will signal that the last page has been reached, after which `fetch` will not be called again (unless `reset()` is used).
Some APIs return a non-null continuation token even though the next call will fetch an empty page of data, this situation is also handled by this library and is taken as a signal that the last page has been reached.
If the underlying API does not return data in the `items`/`continuationToken` format a wrapper function can be used to adapt the data according to the interface of this library.

`getOrderField` is used to grab a field from the page items, this item is compared to other order fields using `<` to determine the ordering of the data in the pages returned by `fetchNextPage`.
The configuration option `descending` can be set to `true` to compare order fields with `>` instead of `<`.

It may be useful to know which source each item came from, when this is needed add this field via the `fetch` function, creating a wrapper as needed if the existing fetch function does not contain this data.

The method `reset` can be used to reset the state stored by the class while maintaining the source configurations.
After this the next call to `fetchNextPage` will start paginating from the beginning of all sources.
