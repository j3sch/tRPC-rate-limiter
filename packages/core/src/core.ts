import type { AnyRouter } from '@trpc/server'
import { TRPCError } from '@trpc/server'
import type { Context } from 'hono'
import MemoryStore from './store'
import type { RateLimiterOptions, TRPCPaths } from './types'
import { getPath, getRateLimiterSettings, incrementKey, initStore } from './utils'

export function trpcRateLimiter<TRouter extends AnyRouter>({
  config,
  windowMs,
  limit,
  message = 'Too many requests, please try again later.',
  keyGenerator = (c: Context, path: string) => {
    const cfIp = c.req.header('cf-connecting-ip')
    if (cfIp) {
      return `${path}:${cfIp}`
    }

    const forwardedIp = c.req.header('x-forwarded-for')?.split(',')[0].trim()
    return `${path}:${forwardedIp || 'unknown'}`
  },
  store = new MemoryStore(),
  skip = () => false,
}: RateLimiterOptions<TRouter>) {
  return async (c: Context) => {
    if ((windowMs || limit) && config) {
      throw new Error("You can't use both `windowMs` and `limit` with `config` at the same time.")
    }

    const shouldSkip = await skip(c)
    if (shouldSkip) {
      return
    }

    const path = getPath<TRPCPaths<TRouter>>(c)

    const { currWindowMs, currLimit } =
      (await getRateLimiterSettings<TRouter>({
        path,
        config,
        windowMs,
        limit,
        c,
      })) || {}

    // either no rate limit settings for current path or invalid options
    if (!currWindowMs || !currLimit) {
      return
    }

    initStore(store, {
      windowMs: currWindowMs,
    })

    const key = await keyGenerator(c, path)
    const { totalHits, resetTime } = await incrementKey(key, store)

    if (totalHits > currLimit) {
      const errorMessage = (async () => {
        try {
          if (typeof message === 'function') {
            const result = await message(c)
            return typeof result === 'string' ? result : JSON.stringify(result)
          }
          if (typeof message === 'string') {
            return message
          }
          return JSON.stringify(message)
        } catch (err) {
          console.error('Error processing rate-limiter message:', err)
          return 'Too many requests, please try again later.'
        }
      })()

      const retryAfterSeconds = resetTime
        ? Math.ceil((resetTime.getTime() - Date.now()) / 1000)
        : undefined

      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: await errorMessage,
        cause: { retryAfter: retryAfterSeconds },
      })
    }
  }
}
