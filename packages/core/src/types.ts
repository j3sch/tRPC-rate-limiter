import type { AnyRouter } from '@trpc/server'
import type { Context, Env, Input, Next } from 'hono'

/**
 * Data returned from the `Store` when a client's hit counter is incremented.
 *
 * @property totalHits {number} - The number of hits for that client so far.
 * @property resetTime {Date | undefined} - The time when the counter resets.
 */
export type ClientRateLimitInfo = {
  totalHits: number
  resetTime?: Date
}

/**
 * An interface that all hit counter stores must implement.
 */
export type Store = {
  /**
   * Method that initializes the store, and has access to the options passed to
   * the middleware too.
   *
   * @param options {ConfigType} - The options used to setup the middleware.
   */
  init?: (options: InitStoreOptions) => void

  /**
   * Method to fetch a client's hit count and reset time.
   *
   * @param key {string} - The identifier for a client.
   *
   * @returns {ClientRateLimitInfo} - The number of hits and reset time for that client.
   */
  get?: (key: string) => Promise<ClientRateLimitInfo | undefined>

  /**
   * Method to increment a client's hit counter.
   *
   * @param key {string} - The identifier for a client.
   *
   * @returns {ClientRateLimitInfo | undefined} - The number of hits and reset time for that client.
   */
  increment: (key: string) => Promise<ClientRateLimitInfo>

  /**
   * Method to decrement a client's hit counter.
   *
   * @param key {string} - The identifier for a client.
   */
  decrement: (key: string) => Promise<void>

  /**
   * Method to reset a client's hit counter.
   *
   * @param key {string} - The identifier for a client.
   */
  resetKey: (key: string) => Promise<void>

  /**
   * Method to reset everyone's hit counter.
   */
  resetAll?: () => Promise<void>

  /**
   * Method to shutdown the store, stop timers, and release all resources.
   */
  shutdown?: () => Promise<void>

  /**
   * Flag to indicate that keys incremented in one instance of this store can
   * not affect other instances. Typically false if a database is used, true for
   * MemoryStore.
   *
   * Used to help detect double-counting misconfigurations.
   */
  localKeys?: boolean

  /**
   * Optional value that the store prepends to keys
   *
   * Used by the double-count check to avoid false-positives when a key is counted twice, but with different prefixes
   */
  prefix?: string
}

type TRPCRouters<TRouter extends AnyRouter> = TRouter['_def']['procedures']
type TRPCProcedures<
  TRouter extends AnyRouter,
  T extends keyof TRPCRouters<TRouter>,
> = TRPCRouters<TRouter>[T]['_def']['procedures']

export type TRPCPaths<TRouter extends AnyRouter> = {
  [R in keyof TRPCRouters<TRouter>]: `${R & string}.${keyof TRPCProcedures<TRouter, R> & string}`
}[keyof TRPCRouters<TRouter>]

export type RateLimitConfig = {
  windowMs: number
  limit: number | ((c: Context) => Promise<number>)
}

export type RateLimitConfigs<TRouter extends AnyRouter> = Partial<
  Record<TRPCPaths<TRouter> | 'default', RateLimitConfig>
>

type MultiRouteRateLimiterOptions<TRouter extends AnyRouter> = {
  config: RateLimitConfigs<TRouter>
  windowMs?: never
  limit?: never
  message?:
    | string
    | Record<string, unknown>
    | ((c: Context) => Promise<string | Record<string, unknown>>)
  keyGenerator?: (c: Context, path: string) => string | Promise<string>
  store: Store
  skip?: (c: Context) => boolean | Promise<boolean>
}

type SingleRouteRateLimiterOptions = {
  config?: never
  windowMs: number
  limit: number | ((c: Context) => Promise<number>)
  message?:
    | string
    | Record<string, unknown>
    | ((c: Context) => Promise<string | Record<string, unknown>>)
  keyGenerator?: (c: Context, path: string) => string | Promise<string>
  store: Store
  skip?: (c: Context) => boolean | Promise<boolean>
}

export type RateLimiterOptions<TRouter extends AnyRouter> =
  | MultiRouteRateLimiterOptions<TRouter>
  | SingleRouteRateLimiterOptions

export interface StoreInitOptions {
  windowMs: number
}

export interface InitStoreOptions {
  windowMs: number
}
