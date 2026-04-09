import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError, validateJsonApiRequest } from "@/lib/request-security";

const bodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
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
