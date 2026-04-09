import { db } from "@/lib/db";

export async function toggleSavedEvent(userId: string, eventId: string) {
  await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  await db.event.findUnique({
    where: { id: eventId },
    select: { id: true },
  });

  return { saved: false };
}

export async function listSavedEvents(userId: string) {
  await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  return [];
}

export async function isEventSaved(userId: string, eventId: string) {
  await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  await db.event.findUnique({
    where: { id: eventId },
    select: { id: true },
  });

  return false;
}
