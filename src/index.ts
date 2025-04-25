export interface LuckyCafeSourceConfig<T, U> {
  fetch: (continuationToken: string | null) => Promise<{
    items: T[]
    continuationToken: string | null
  }>

  getOrderField: (result: T) => U
}

export interface LuckyCafeConfig {
  pageSize: number
  descending?: boolean
}

interface LuckyCafeSource {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: LuckyCafeSourceConfig<any, any>

  continuationToken: string | null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queue: any[]
}

export interface LuckyCafeResult<T> {
  items: T[]
  finished: boolean
}

export class LuckyCafe<
  T,
  U,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  V extends readonly LuckyCafeSourceConfig<any, U>[],
> {
  sources: LuckyCafeSource[]

  hasFirstPages = false

  // the current page is usually populated and then fully drained by fetchNextPage() but
  // if a fetch throws an error it's important to keep it stored as a member so a future
  // call to fetchNextPage() can resume from where it left off
  currentPage: Array<T | Awaited<ReturnType<V[number]['fetch']>>['items']> = []

  constructor(
    sourceConfigs: [LuckyCafeSourceConfig<T, U>, ...V],
    private config: LuckyCafeConfig,
  ) {
    this.sources = sourceConfigs.map((config) => ({
      config,
      continuationToken: null,
      queue: [],
    }))
  }

  async fetchNextPage(): Promise<
    LuckyCafeResult<T | Awaited<ReturnType<V[number]['fetch']>>['items']>
  > {
    if (!this.hasFirstPages) {
      // the first pages can be populated in parallel
      await Promise.all(
        this.sources.map(async (source) => {
          // if an exception was thrown on a previous call to fetchNextPage when fetching
          // the first pages then the queue may have been populated for some sources
          if (source.queue.length) return

          const { items, continuationToken } = await source.config.fetch(null)
          if (!items.length) {
            this.sources = this.sources.filter((existingSource) => existingSource !== source)
          } else {
            source.queue = items
            source.continuationToken = continuationToken
          }
        }),
      )
      this.hasFirstPages = true
    }

    while (this.currentPage.length < this.config.pageSize) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let nextPageItem: any | undefined = undefined
      let nextSource: LuckyCafeSource | undefined = undefined

      if (!this.sources.length) break

      for (const source of this.sources) {
        if (!source.queue.length) {
          if (!source.continuationToken) {
            this.sources = this.sources.filter((existingSource) => existingSource !== source)
            continue
          } else {
            const { items, continuationToken } = await source.config.fetch(source.continuationToken)
            if (!items.length) {
              this.sources = this.sources.filter((existingSource) => existingSource !== source)
              continue
            } else {
              source.queue.push(...items)
              source.continuationToken = continuationToken
            }
          }
        }

        const queueHead = source.config.getOrderField(source.queue[0])
        if (
          !nextPageItem ||
          (this.config.descending ? queueHead > nextPageItem : queueHead < nextPageItem)
        ) {
          nextPageItem = queueHead
          nextSource = source
        }
      }

      if (!nextSource) break

      this.currentPage.push(nextSource.queue.shift())
      nextPageItem = undefined

      if (!nextSource.queue.length && !nextSource.continuationToken) {
        this.sources = this.sources.filter((existingSource) => existingSource !== nextSource)
      }
    }

    return {
      items: this.currentPage.splice(0),
      finished: !this.sources.length,
    }
  }
}
