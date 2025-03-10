import type { AnyRouter } from '@trpc/server'
import type { Context } from 'hono'
import type { InitStoreOptions, RateLimitConfigs, Store, TRPCPaths } from './types'

export const isValidStore = (value: Store): value is Store => !!value?.increment

export function initStore(store: Store, options: InitStoreOptions) {
  // Checking if store is valid
  if (!isValidStore(store)) {
    throw new Error('The store is not correctly implemented!')
  }

  // Call the `init` method on the store, if it exists
  if (typeof store.init === 'function') {
    store.init(options)
  }
}

export async function incrementKey(
  key: string,
  store: Store,
): Promise<{ totalHits: number; resetTime?: Date }> {
  const { totalHits, resetTime } = await store.increment(key)

  return { totalHits, resetTime }
}

export function getPath<Paths>(c: Context) {
  const url = new URL(c.req.url)
  const pathMatch = url.pathname.match(/\/trpc\/([^\/]+)/)
  const path = pathMatch ? pathMatch[1] : 'default'
  return path as Paths | 'default'
}

export async function getRateLimiterSettings<TRouter extends AnyRouter>({
  path,
  config,
  windowMs,
  limit,
  c,
}: {
  path: TRPCPaths<TRouter> | 'default'
  config?: RateLimitConfigs<TRouter>
  windowMs?: number
  limit?: number | ((c: Context) => Promise<number>)
  c: Context
}) {
  if (config) {
    const currWindowMs = config[path]?.windowMs || config.default?.windowMs
    const currLimitConfig = config[path]?.limit || config.default?.limit

    if (currWindowMs && currLimitConfig !== undefined) {
      const currLimit =
        typeof currLimitConfig === 'function' ? await currLimitConfig(c) : currLimitConfig

      return { currWindowMs, currLimit }
    }

    if (
      (currWindowMs && currLimitConfig === undefined) ||
      (!currWindowMs && currLimitConfig !== undefined)
    ) {
      throw new Error(`Missing windowMs or limit for path ${path}`)
    }
    return
  }

  if (windowMs && limit !== undefined) {
    const currLimit = typeof limit === 'function' ? await limit(c) : limit

    return { currWindowMs: windowMs, currLimit }
  }

  if ((windowMs && limit === undefined) || (!windowMs && limit !== undefined)) {
    throw new Error('Missing windowMs or limit')
  }

  throw new Error('No rate limiter settings found')
}
