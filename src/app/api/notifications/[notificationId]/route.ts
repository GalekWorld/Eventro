import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ notificationId: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { notificationId } = await params;

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
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(notification, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
