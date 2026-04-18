import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertRateLimit } from "@/lib/rate-limit";
import { jsonError, validateJsonApiRequest } from "@/lib/request-security";

const bodySchema = z.object({
  endpoint: z.string().url().max(2048).refine((value) => value.startsWith("https://"), "Push endpoint must use https"),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
});

export async function POST(request: Request) {
  const validationError = validateJsonApiRequest(request);
  if (validationError) {
    return validationError;
  }

  const user = await getCurrentUser();
  if (!user) {
    return jsonError("UNAUTHORIZED", 401);
  }

  try {
    await assertRateLimit({
      key: `api:push-subscribe:${user.id}`,
      limit: 40,
      windowMs: 10 * 60 * 1000,
      message: "Demasiadas operaciones de push en poco tiempo.",
      userId: user.id,
    });
  } catch {
    return jsonError("RATE_LIMITED", 429);
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError("INVALID_PUSH_SUBSCRIPTION", 400);
  }

  await db.pushSubscription.upsert({
    where: {
      endpoint: parsed.data.endpoint,
    },
    update: {
      userId: user.id,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      lastSeenAt: new Date(),
    },
    create: {
      userId: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      lastSeenAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  const validationError = validateJsonApiRequest(request);
  if (validationError) {
    return validationError;
  }

  const user = await getCurrentUser();
  if (!user) {
    return jsonError("UNAUTHORIZED", 401);
  }

  try {
    await assertRateLimit({
      key: `api:push-unsubscribe:${user.id}`,
      limit: 40,
      windowMs: 10 * 60 * 1000,
      message: "Demasiadas operaciones de push en poco tiempo.",
      userId: user.id,
    });
  } catch {
    return jsonError("RATE_LIMITED", 429);
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError("INVALID_PUSH_SUBSCRIPTION", 400);
  }

  await db.pushSubscription.deleteMany({
    where: {
      endpoint: parsed.data.endpoint,
      userId: user.id,
    },
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
