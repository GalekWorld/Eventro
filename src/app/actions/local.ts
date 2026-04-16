"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireRole } from "@/lib/auth";
import type { ActionState } from "@/lib/http";
import { createEventSchema, type TicketTypeInput, updateEventBasicsSchema } from "@/features/events/event.schemas";
import { createEventForLocal, updateEventBasicsForLocal } from "@/features/events/event.service";
import { savePublicImage } from "@/lib/upload";
import { parseCoordinate } from "@/lib/geo";
import { db } from "@/lib/db";
import { assertRateLimit } from "@/lib/rate-limit";
import { sendTelegramAlert } from "@/lib/telegram";
import { createAdminAuditLog } from "@/lib/admin-audit";
import { normalizeUsername } from "@/lib/username";

function normalize(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function combineDateAndTime(dateValue: FormDataEntryValue | null, timeValue: FormDataEntryValue | null) {
  const date = normalize(dateValue);
  const time = normalize(timeValue);

  if (!date || !time) return undefined;

  const value = new Date(`${date}T${time}`);
  if (Number.isNaN(value.getTime())) {
    return undefined;
  }

  return value.toISOString();
}

function parseOptionalDateTime(value: string | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return undefined;

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function parseTicketTypes(value: FormDataEntryValue | null): TicketTypeInput[] {
  const raw = normalize(value);
  if (!raw) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.map((ticketType) => {
    const item = typeof ticketType === "object" && ticketType ? (ticketType as Record<string, unknown>) : {};

    return {
      name: String(item.name ?? ""),
      description: String(item.description ?? "").trim() || undefined,
      price: Number(item.price ?? 0),
      capacity: Number(item.capacity ?? 0),
      includedDrinks: Number(item.includedDrinks ?? 0),
      salesStart: parseOptionalDateTime(typeof item.salesStart === "string" ? item.salesStart : undefined),
      salesEnd: parseOptionalDateTime(typeof item.salesEnd === "string" ? item.salesEnd : undefined),
      isVisible: item.isVisible !== false,
    };
  });
}

export async function createEventAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireRole(["VENUE"]);
    await assertRateLimit({
      key: `event:create:${user.id}`,
      limit: 15,
      windowMs: 60 * 60 * 1000,
      message: "Has creado demasiados eventos en poco tiempo.",
      userId: user.id,
    });

    const imageFile = formData.get("image");
    let imageUrl = "";

    if (imageFile instanceof File && imageFile.size > 0) {
      imageUrl = await savePublicImage(imageFile, "events");
    }

    const input = createEventSchema.parse({
      title: formData.get("title"),
      description: formData.get("description"),
      hasReservations: formData.get("hasReservations") === "true",
      reservationInfo: normalize(formData.get("reservationInfo")) || undefined,
      location: formData.get("location"),
      city: formData.get("city"),
      latitude: parseCoordinate(formData.get("latitude"), "lat"),
      longitude: parseCoordinate(formData.get("longitude"), "lng"),
      date: combineDateAndTime(formData.get("eventDate"), formData.get("startTime")),
      endDate: combineDateAndTime(formData.get("eventDate"), formData.get("endTime")),
      imageUrl,
      published: formData.get("published") === "true",
      ticketTypes: parseTicketTypes(formData.get("ticketTypes")),
    });

    await createEventForLocal(user.id, input);
    revalidatePath("/local/dashboard");
    revalidatePath("/events");
    revalidatePath("/map");

    return { success: "Evento creado correctamente" };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        error: error.issues[0]?.message ?? "Revisa los datos del evento.",
      };
    }

    return {
      error: error instanceof Error ? error.message : "No se pudo crear el evento",
    };
  }
}

export async function updateEventBasicsAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireRole(["VENUE"]);
    const eventId = normalize(formData.get("eventId"));
    if (!eventId) {
      return { error: "No se ha encontrado el evento." };
    }

    const imageFile = formData.get("image");
    let imageUrl = "";

    if (imageFile instanceof File && imageFile.size > 0) {
      imageUrl = await savePublicImage(imageFile, "events");
    }

    const input = updateEventBasicsSchema.parse({
      title: formData.get("title"),
      description: formData.get("description"),
      hasReservations: formData.get("hasReservations") === "true",
      reservationInfo: normalize(formData.get("reservationInfo")) || undefined,
      location: formData.get("location"),
      city: formData.get("city"),
      latitude: parseCoordinate(formData.get("latitude"), "lat"),
      longitude: parseCoordinate(formData.get("longitude"), "lng"),
      date: combineDateAndTime(formData.get("eventDate"), formData.get("startTime")),
      endDate: combineDateAndTime(formData.get("eventDate"), formData.get("endTime")),
      imageUrl,
      published: formData.get("published") === "true",
    });

    const result = await updateEventBasicsForLocal({
      eventId,
      ownerId: user.id,
      input,
    });

    if (result.count < 1) {
      return { error: "No puedes editar este evento." };
    }

    revalidatePath("/local/dashboard");
    revalidatePath(`/local/events/${eventId}/edit`);
    revalidatePath(`/local/events/${eventId}/tickets`);
    revalidatePath("/events");
    revalidatePath("/map");

    return { success: "Evento actualizado correctamente" };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        error: error.issues[0]?.message ?? "Revisa los datos del evento.",
      };
    }

    return {
      error: error instanceof Error ? error.message : "No se pudo actualizar el evento",
    };
  }
}

export async function deleteAdminEventAction(formData: FormData): Promise<void> {
  const admin = await requireRole(["ADMIN"]);
  const eventId = normalize(formData.get("eventId"));
  if (!eventId) return;

  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      owner: {
        select: {
          username: true,
          email: true,
        },
      },
    },
  });

  if (!event) return;

  await db.event.delete({
    where: { id: eventId },
  }).catch(() => null);

  await createAdminAuditLog({
    adminId: admin.id,
    action: "delete_event",
    targetType: "event",
    targetId: eventId,
    details: event.title,
  });

  await sendTelegramAlert({
    title: "Anuncio eliminado por admin",
    lines: [
      `Admin: ${admin.username ?? admin.email}`,
      `Evento: ${event.title}`,
      `Local: ${event.owner.username ?? event.owner.email}`,
      `Ciudad: ${event.city}`,
    ],
  });

  revalidatePath("/admin/venue-requests");
  revalidatePath("/events");
  revalidatePath("/map");
  revalidatePath("/dashboard");
}

export async function featureAdminEventAction(formData: FormData): Promise<void> {
  const admin = await requireRole(["ADMIN"]);
  const eventId = normalize(formData.get("eventId"));
  const mode = normalize(formData.get("mode"));
  if (!eventId) return;

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
    },
  });

  if (!event) return;

  await createAdminAuditLog({
    adminId: admin.id,
    action: mode === "off" ? "unfeature_event" : "feature_event",
    targetType: "event",
    targetId: event.id,
    details: event.title,
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin/venue-requests");
}

export async function addDoorStaffAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const venue = await requireRole(["VENUE"]);
    const username = normalizeUsername(normalize(formData.get("username")));
    const eventId = normalize(formData.get("eventId")) || null;

    if (username.length < 3) {
      return { error: "Indica un username válido." };
    }

    const user = await db.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        role: true,
      },
    });

    if (!user || user.role === "VENUE" || user.role === "VENUE_PENDING") {
      return { error: "Solo puedes añadir cuentas normales como porteros." };
    }

    if (eventId) {
      const ownsEvent = await db.event.findFirst({
        where: {
          id: eventId,
          ownerId: venue.id,
        },
        select: { id: true },
      });

      if (!ownsEvent) {
        return { error: "Solo puedes asignar porteros a eventos de tu propio local." };
      }
    }

    const existing = await db.venueDoorStaff.findFirst({
      where: {
        venueId: venue.id,
        staffUserId: user.id,
        ...(eventId ? { eventId } : { eventId: null }),
      },
      select: { id: true },
    });

    if (existing) {
      return { error: "Ese usuario ya tiene acceso de portero en este alcance." };
    }

    await db.venueDoorStaff.create({
      data: {
        venueId: venue.id,
        staffUserId: user.id,
        addedById: venue.id,
        eventId,
      },
    });

    revalidatePath("/local/staff");
    if (eventId) {
      revalidatePath(`/local/events/${eventId}/tickets`);
      revalidatePath(`/scanner/${eventId}`);
    }
    revalidatePath("/scanner");

    return { success: `@${user.username} ya puede escanear entradas.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo añadir al portero." };
  }
}

export async function removeDoorStaffAction(formData: FormData): Promise<void> {
  const venue = await requireRole(["VENUE"]);
  const assignmentId = normalize(formData.get("assignmentId"));
  const eventId = normalize(formData.get("eventId"));
  if (!assignmentId) return;

  const assignment = await db.venueDoorStaff.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      venueId: true,
    },
  });

  if (!assignment || assignment.venueId !== venue.id) return;

  await db.venueDoorStaff.delete({
    where: { id: assignmentId },
  }).catch(() => null);

  revalidatePath("/local/staff");
  if (eventId) {
    revalidatePath(`/local/events/${eventId}/tickets`);
    revalidatePath(`/scanner/${eventId}`);
  }
  revalidatePath("/scanner");
}
