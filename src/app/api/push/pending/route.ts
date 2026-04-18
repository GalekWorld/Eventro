import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertRateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/request-security";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("UNAUTHORIZED", 401);
  }

  try {
    await assertRateLimit({
      key: `api:push-pending:${user.id}`,
      limit: 120,
      windowMs: 10 * 60 * 1000,
      message: "Demasiadas comprobaciones de notificaciones push.",
      userId: user.id,
    });
  } catch {
    return jsonError("RATE_LIMITED", 429);
  }

  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint");

  if (!endpoint) {
    return jsonError("MISSING_ENDPOINT", 400);
  }

  if (endpoint.length > 2048) {
    return jsonError("INVALID_ENDPOINT", 400);
  }

  const subscription = await db.pushSubscription.findFirst({
    where: {
      endpoint,
      userId: user.id,
    },
    select: {
      id: true,
    },
  });

  if (!subscription) {
    return jsonError("SUBSCRIPTION_NOT_FOUND", 404);
  }

  const delivery = await db.pushDelivery.findFirst({
    where: {
      subscriptionId: subscription.id,
      deliveredAt: null,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      title: true,
      body: true,
      link: true,
    },
  });

  if (!delivery) {
    return new NextResponse(null, { status: 204 });
  }

  await db.pushDelivery.update({
    where: { id: delivery.id },
    data: { deliveredAt: new Date() },
  }).catch(() => null);

  return NextResponse.json(delivery, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
