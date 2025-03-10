<h1 align="center"> <code>trpc-rate-limiter</code> </h1>

<div align="center">

[![Bundle Size](https://img.shields.io/bundlephobia/min/@trpc-rate-limiter/hono@0.1.0)](https://bundlephobia.com/result?p=@trpc-rate-limiter/hono@0.1.0)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@trpc-rate-limiter/hono@0.1.0)](https://bundlephobia.com/result?p=@trpc-rate-limiter/hono@0.1.0)
[![license](https://img.shields.io/npm/l/@trpc-rate-limiter/hono@0.1.0)](LICENSE)

</div>

Rate limiting function for tRPC. For defining in the trpc middleware which producers should be limited and at what rate.

> This library currently only works for the Hono backend framework. Please create an issue if you wish it for another framework.

<video src="https://youtu.be/k722Aca4zp4" controls="controls" style="max-width: 100%;"></video>

## Installation

```sh
# Using npm/yarn/pnpm/bun
npm add @trpc-rate-limiter/hono
```

## Usage

### Rest APIs

```ts
import { AppRouter } from "./router";
import { trpcRateLimiter } from "@trpc-rate-limiter/hono";

// You can define tiers for reuse
export const RateLimitTier = {
  BASIC: { windowMs: 60_000, limit: 5 },
  STANDARD: { windowMs: 15 * 60 * 1000, limit: 10 },
  PREMIUM: { windowMs: 60 * 60 * 1000, limit: 30 },
};

// // Time constants for better readability
const MINUTE_IN_MS = 60 * 1000;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;

// Create a tRPC middleware
const rateLimiterMiddleware = t.middleware(async ({ ctx, next }) => {
  // Extract the Hono Context
  // Make sure that you have created a tRPC context (https://trpc.io/docs/server/context)
  // and have passed the Hono context so that it can be extracted here
  const { c } = ctx;

  // Pass the type of your tRPC router for type safety
  await trpcRateLimiter<AppRouter>({
    config: {
      "auth.signUp": {
        windowMs: 15 * MINUTE_IN_MS, // 15m
        limit: 5,
      },
      "auth.signIn": {
        windowMs: 5 * MINUTE_IN_MS, // 5m
        limit: 5,
      },
      "auth.requestPasswordReset": {
        windowMs: 1 * HOUR_IN_MS, // 1h
        limit: 3,
      },
      // Default tier applied to all other procedures
      default: RateLimitTier.BASIC,
    },
    // Custom key generator function
    // If not provided, it defaults to using the procedure path and IP
    // You can customize this to use any identifier you prefer
    keyGenerator: (c, path) => `${path}:${<userId>}`,
  })(c);

  return next();
});
```

## Data Stores

By default, `MemoryStore` is used. However, in order to synchronize the hit counts across instances, an external storage should be used.

If you deploy your service serverless or with multiple process or servers, then you need an external storage to store the hit counts.

The following stores are supported:

| Name                                                                               | Description                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MemoryStore                                                                        | (default) Simple in-memory option. Does not share state when the app has multiple processes or servers.                                                                                            |
| [@trpc-rate-limiter/cloudflare](https://www.npm.im/@trpc-rate-limiter/cloudflare)  | A [Cloudflare](https://www.cloudflare.com/)-backed store, used with [Durable Object](https://developers.cloudflare.com/durable-objects/) and [WorkersKV](https://developers.cloudflare.com/kv/).   |
| [@hono-rate-limiter/redis](https://www.npm.im/@hono-rate-limiter/redis)            | A [Redis](https://redis.io/)-backed store, used with [`@vercel/kv`](https://www.npmjs.com/package/@vercel/kv) and [`@upstash/redis`](https://www.npmjs.com/package/@upstash/redis) .               |
| [rate-limit-redis](https://npm.im/rate-limit-redis)                                | A [Redis](https://redis.io/)-backed store, more suitable for large or demanding deployments.                                                                                                       |
| [rate-limit-postgresql](https://www.npm.im/@acpr/rate-limit-postgresql)            | A [PostgreSQL](https://www.postgresql.org/)-backed store.                                                                                                                                          |
| [rate-limit-memcached](https://npmjs.org/package/rate-limit-memcached)             | A [Memcached](https://memcached.org/)-backed store.                                                                                                                                                |
| [cluster-memory-store](https://npm.im/@express-rate-limit/cluster-memory-store)    | A memory-store wrapper that shares state across all processes on a single server via the [node:cluster](https://nodejs.org/api/cluster.html) module. Does not share state across multiple servers. |
| [precise-memory-rate-limit](https://www.npm.im/precise-memory-rate-limit)          | A memory store similar to the built-in one, except that it stores a distinct timestamp for each key.                                                                                               |
| [typeorm-rate-limit-store](https://www.npmjs.com/package/typeorm-rate-limit-store) | Supports a variety of databases via [TypeORM](https://typeorm.io/): MySQL, MariaDB, CockroachDB, SQLite, Microsoft SQL Server, Oracle, SAP Hana, and more.                                         |
| [@rlimit/storage](https://www.npmjs.com/package/@rlimit/storage)                   | A distributed rlimit store, ideal for multi-regional deployments.                                                                                                                                  |

Take a look at this [guide](https://express-rate-limit.mintlify.app/guides/creating-a-store) if you wish to create your own store.

## Notes

- The `keyGenerator` function determines what to limit a request on, it should represent a unique characteristic of a user or class of user that you wish to rate limit. Good choices include API keys in `Authorization` headers, URL paths or routes, specific query parameters used by your application, and/or user IDs.
- It is not recommended to use IP addresses (since these can be shared by many users in many valid cases) or locations (the same), as you may find yourself unintentionally rate limiting a wider group of users than you intended.

## Credits

The `trpc-rate-limiter` project is a fork of [hono-rate-limiter](https://github.com/honojs/hono-rate-limiter), adapted specifically for tRPC integration. The original `hono-rate-limiter` project was itself inspired by [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit).
