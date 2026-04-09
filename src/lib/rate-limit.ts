import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { recordSecurityEvent } from "@/lib/security-events";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  message: string;
  userId?: string;
};

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

function getScopedKey(key: string) {
  return `rate-limit:${key}`;
}

function canUseRedisRateLimit() {
  return Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);
}

async function incrementRedisBucket(key: string, windowMs: number) {
  const response = await fetch(`${UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([["INCR", key], ["PEXPIRE", key, windowMs, "NX"], ["PTTL", key]]),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Redis rate limit request failed with ${response.status}`);
  }

  const result = (await response.json().catch(() => null)) as Array<{ result?: unknown }> | null;
  const count = Number(result?.[0]?.result ?? 0);
  const ttl = Number(result?.[2]?.result ?? windowMs);

  if (!Number.isFinite(count) || count <= 0) {
    throw new Error("Redis rate limit returned an invalid count");
  }

  return {
    count,
    ttlMs: Number.isFinite(ttl) && ttl > 0 ? ttl : windowMs,
  };
}

async function assertRedisRateLimit({ key, limit, windowMs, message, userId }: RateLimitOptions) {
  const { count, ttlMs } = await incrementRedisBucket(getScopedKey(key), windowMs);

  if (count > limit) {
    await recordSecurityEvent({
      type: "rate_limit_exceeded",
      level: limit >= 20 ? "CRITICAL" : "WARN",
      key,
      userId,
      message,
      metadata: {
        backend: "redis",
        limit,
        windowMs,
        ttlMs,
        count,
      },
      notifyTelegram: limit >= 20,
    });
    throw new Error(message);
  }
}

async function assertDatabaseRateLimit({ key, limit, windowMs, message, userId }: RateLimitOptions) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const scopedKey = getScopedKey(key);

  const bucket = await db.rateLimitBucket.findUnique({
    where: { key: scopedKey },
    select: {
      key: true,
      count: true,
      resetAt: true,
    },
  });

  if (!bucket) {
    try {
      await db.rateLimitBucket.create({
        data: {
          key: scopedKey,
          count: 1,
          resetAt,
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        throw error;
      }
    }
    return;
  }

  if (bucket.resetAt <= now) {
    await db.rateLimitBucket.update({
      where: { key: scopedKey },
      data: {
        count: 1,
        resetAt,
      },
    });
    return;
  }

  if (bucket.count >= limit) {
    await recordSecurityEvent({
      type: "rate_limit_exceeded",
      level: limit >= 20 ? "CRITICAL" : "WARN",
      key,
      userId,
      message,
      metadata: {
        backend: "database",
        limit,
        windowMs,
        resetAt: bucket.resetAt.toISOString(),
        count: bucket.count,
      },
      notifyTelegram: limit >= 20,
    });
    throw new Error(message);
  }

  await db.rateLimitBucket.update({
    where: { key: scopedKey },
    data: {
      count: {
        increment: 1,
      },
    },
  });
}

export async function assertRateLimit(options: RateLimitOptions) {
  if (canUseRedisRateLimit()) {
    try {
      await assertRedisRateLimit(options);
      return;
    } catch (error) {
      await recordSecurityEvent({
        type: "rate_limit_backend_fallback",
        level: "WARN",
        key: options.key,
        userId: options.userId,
        message: "El backend Redis del rate limit ha fallado. Se usa la base de datos como respaldo.",
        metadata: {
          backend: "redis",
          error: error instanceof Error ? error.message : "unknown_error",
        },
      });
    }
  }

  await assertDatabaseRateLimit(options);
}
