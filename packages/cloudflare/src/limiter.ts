import type { Env, Input, MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";
import type { ConfigType } from "./types";

/**
 *
 * Create an instance of rate-limiting middleware for Hono.
 *
 * @param config x{ConfigType} - Options to configure the rate limiter.
 *
 * @returns - The middleware that rate-limits clients based on your configuration.
 *
 * @public
 */
export function cloudflareRateLimiter<
  E extends Env = Env,
  P extends string = string,
  I extends Input = Input,
>(
  config: Pick<ConfigType<E, P, I>, "rateLimitBinding" | "keyGenerator"> &
    Partial<Omit<ConfigType<E, P, I>, "rateLimitBinding" | "keyGenerator">>,
): MiddlewareHandler<E, P, I> {
  const {
    message = "Too many requests, please try again later.",
    statusCode = 429,
    rateLimitBinding,
    keyGenerator,
    skip = () => false,
    handler = async (c, _, options) => {
      c.status(options.statusCode);

      const responseMessage =
        typeof options.message === "function"
          ? await options.message(c)
          : options.message;

      if (typeof responseMessage === "string") return c.text(responseMessage);
      return c.json(responseMessage);
    },
  } = config;

  const options = {
    message,
    statusCode,
    rateLimitBinding,
    keyGenerator,
    skip,
    handler,
  };

  return createMiddleware<E, P, I>(async (c, next) => {
    // First check if we should skip the request
    const isSkippable = await skip(c);

    if (isSkippable) {
      await next();
      return;
    }

    // Get a unique key for the client
    const key = await keyGenerator(c);

    // Getting the response
    const { success } = await rateLimitBinding.limit({ key: key });

    // If the client has exceeded their rate limit, set the Retry-After header
    // and call the `handler` function.
    if (!success) {
      return handler(c, next, options);
    }

    await next();
  });
}
