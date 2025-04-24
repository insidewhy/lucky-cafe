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

  hasFirstPage = false

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
    if (!this.hasFirstPage) {
      await Promise.all(
        this.sources.map(async (source) => {
          // if an exception was thrown before when fetching the first pages then the
          // queue may have been populated for some sources
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
      this.hasFirstPage = true
    }

    while (this.currentPage.length < this.config.pageSize) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let maxQueueHead: any | undefined = undefined
      let maxSource: LuckyCafeSource | undefined = undefined

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

        const queueHead = source.config.getOrderField(source.queue[0]!)
        if (
          !maxQueueHead ||
          (this.config.descending ? queueHead > maxQueueHead : queueHead < maxQueueHead)
        ) {
          maxQueueHead = queueHead
          maxSource = source
        }
      }

      if (!maxSource) break
      this.currentPage.push(maxSource.queue.shift())
    }

    return { items: this.currentPage.splice(0), finished: !this.sources.length }
  }
}
