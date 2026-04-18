import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/request-security";

export async function GET(_request: Request, { params }: { params: Promise<{ notificationId: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("UNAUTHORIZED", 401);
  }

  const { notificationId } = await params;
  if (!notificationId || notificationId.length > 128) {
    return jsonError("INVALID_NOTIFICATION_ID", 400);
  }

  const notification = await db.notification.findFirst({
    where: {
      id: notificationId,
      recipientId: user.id,
    },
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      link: true,
    },
  });

  if (!notification) {
    return jsonError("NOT_FOUND", 404);
  }

  return NextResponse.json(notification, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
