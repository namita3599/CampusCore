import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Global cache to prevent multiple instantiations in Next.js dev hot-reloads
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
  ratelimit: Ratelimit | undefined;
};

const hasRedisEnv =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis =
  globalForRedis.redis ??
  (hasRedisEnv
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : undefined);

export const ratelimit =
  globalForRedis.ratelimit ??
  (redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "60 s"),
        analytics: true,
        prefix: "@upstash/ratelimit/campuscore",
      })
    : undefined);

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
  globalForRedis.ratelimit = ratelimit;
}
