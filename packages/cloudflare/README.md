# <div align="center">`@trpc-rate-limiter/cloudflare`</div>

This package includes [`WorkersKV`](https://developers.cloudflare.com/kv/) and [Durable Object](https://developers.cloudflare.com/durable-objects/) store for the [`trpc-rate-limiter`](https://github.com/j3sch/tRPC-rate-limiter).

## Installation

```sh
# Using npm/yarn/pnpm/bun
npm add @trpc-rate-limiter/cloudflare
```

## Usage

### Examples

#### Using `WorkersKVStore`

```toml
# wrangler.toml
[[kv_namespaces]]
binding = "CACHE"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

For more info on setting up your `WorkersKV` you can check out [Get Started Guide](https://developers.cloudflare.com/kv/get-started) on cloudflare.

```ts
// index.ts
import { WorkersKVStore } from "@trpc-rate-limiter/cloudflare";
import { trpcRateLimiter } from "@trpc-rate-limiter/hono";
import { KVNamespace } from "cloudflare:worker";

// Add this in Hono app
type Bindings = {
  CACHE: KVNamespace;
  // ... other binding types
};

const app = new Hono<{ Bindings: Bindings }>();

const t = initTRPC.context<TRPCContext>().create();

// Apply the rate limiter to the tRPC middleware
const rateLimiterMiddleware = t.middleware(async ({ ctx, next }) => {
  const { c } = ctx;

  await trpcRateLimiter<AppRouter>({
    config: {
      "auth.signIn": {
        windowMs: 5 * 60 * 1000,
        limit: 5,
      },
      default: { windowMs: 60 * 1000, limit: 5 },
    },
    store: new WorkersKVStore({ namespace: c.env.CACHE }), // Here CACHE is your WorkersKV Binding.
  })(c);

  return next();
});
```

#### Using `DurableObjectStore`

```toml
# wrangler.toml
[[durable_objects.bindings]]
name = "CACHE"
class_name = "DurableObjectRateLimiter"

[[migrations]]
tag = "v1" # Should be unique for each entry
new_classes = ["DurableObjectRateLimiter"]
```

For more info on setting up your `Durable Objects` you can check out [Get Started Guide](https://developers.cloudflare.com/durable-objects/get-started/) on cloudflare.

```ts
// index.ts
import { DurableObjectStore, DurableObjectRateLimiter } from "@trpc-rate-limiter/cloudflare";
import { trpcRateLimiter } from "@trpc-rate-limiter/hono";
import { Context, Next } from "hono";
import { DurableObjectNamespace } from "cloudflare:worker";

// Add this in Hono app
type Bindings = {
  CACHE: DurableObjectNamespace<DurableObjectRateLimiter>;
  // ... other binding types
};

const app = new Hono<{ Bindings: Bindings }>();

const t = initTRPC.context<TRPCContext>().create();

// Apply the rate limiter to the tRPC middleware
const rateLimiterMiddleware = t.middleware(async ({ ctx, next }) => {
  const { c } = ctx;

  await trpcRateLimiter<AppRouter>({
    config: {
      "auth.signIn": {
        windowMs: 5 * 60 * 1000,
        limit: 5,
      },
      default: { windowMs: 60 * 1000, limit: 5 },
    },
    store: new DurableObjectStore({ namespace: c.env.CACHE }), // Here CACHE is your Durable Object Binding.
  })(c);

  return next();
});

// Export DurableObjectRateLimiter in the index file of your Worker
export { DurableObjectRateLimiter };

export default app;
```

### Configuration Props of `WorkersKVStore` and `DurableObjectStore`

#### `namespace`

The KV / Durable Object namespace to use. The value you set for <BINDING_NAME> will be used to reference this database / durable object in your Worker.

#### `prefix`

The text to prepend to the key in the KV / Durable Object namespace.

Defaults to `hrl:`.

## Credits

The `@trpc-rate-limiter/cloudflare` is based on the [@hono-rate-limiter/cloudflare](https://github.com/rhinobase/hono-rate-limiter), adapted for tRPC integration.
