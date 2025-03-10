/**
 * The configuration options for the store.
 */
export type Options<Binding> = {
  /**
   * The KV namespace to use.
   */
  namespace: Binding

  /**
   * The text to prepend to the key in Redis.
   */
  readonly prefix?: string
}
