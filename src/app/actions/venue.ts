"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { NotificationType, VenueRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/permissions";
import type { ActionState } from "@/lib/http";
import { parseCoordinate } from "@/lib/geo";
import { sendTelegramAlert } from "@/lib/telegram";
import { createAdminAuditLog } from "@/lib/admin-audit";
import { readFormValue } from "@/lib/form-data";

export async function submitVenueRequestAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireAuth();

    if (user.role === "VENUE" || user.role === "ADMIN") {
      return { error: "Tu cuenta ya puede públicar eventos." };
    }

    const businessName = readFormValue(formData.get("businessName"));
    const city = readFormValue(formData.get("city"));
    const latitude = parseCoordinate(formData.get("latitude"), "lat");
    const longitude = parseCoordinate(formData.get("longitude"), "lng");
    const address = readFormValue(formData.get("address"));
    const category = readFormValue(formData.get("category"));
    const description = readFormValue(formData.get("description"));
    const phone = readFormValue(formData.get("phone"));
    const website = readFormValue(formData.get("website"));
    const instagram = readFormValue(formData.get("instagram"));

    if (businessName.length < 2 || city.length < 2) {
      return { error: "El nombre del negocio y la ciudad son obligatorios." };
    }

    await prisma.venueRequest.upsert({
      where: { userId: user.id },
      update: {
        businessName,
        city,
        latitude,
        longitude,
        address: address || null,
        category: category || null,
        description: description || null,
        phone: phone || null,
        website: website || null,
        instagram: instagram || null,
        status: VenueRequestStatus.PENDING,
        rejectionReason: null,
        reviewedAt: null,
        reviewedById: null,
      },
      create: {
        userId: user.id,
        businessName,
        city,
        latitude,
        longitude,
        address: address || null,
        category: category || null,
        description: description || null,
        phone: phone || null,
        website: website || null,
        instagram: instagram || null,
        status: VenueRequestStatus.PENDING,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { role: "VENUE_PENDING", isVerified: false },
    });

    await sendTelegramAlert({
      title: "Nueva solicitud de local",
      lines: [
        `Usuario: ${user.username ?? user.email}`,
        `Negocio: ${businessName}`,
        `Ciudad: ${city}`,
      ],
    });

    revalidatePath("/dashboard");
    revalidatePath("/venue/pending");
    redirect("/venue/pending");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      error: error instanceof Error ? error.message : "No se pudo enviar la solicitud.",
    };
  }
}

export async function reviewVenueRequestAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const requestId = readFormValue(formData.get("requestId"));
  const decision = readFormValue(formData.get("decision"));
  const rejectionReason = readFormValue(formData.get("rejectionReason"));

  if (!requestId || !["approve", "reject", "ban"].includes(decision)) {
    throw new Error("Solicitud invalida.");
  }

  const request = await prisma.venueRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error("Solicitud no encontrada.");
  }

  const approved = decision === "approve";
  const banned = decision === "ban";
  const finalReason =
    approved ? null : rejectionReason || (banned ? "El local ha sido vetado por administración." : "No cumple los requisitos actuales.");

  await prisma.$transaction([
    prisma.venueRequest.update({
      where: { id: requestId },
      data: {
        status: approved ? VenueRequestStatus.APPROVED : VenueRequestStatus.REJECTED,
        rejectionReason: finalReason,
        reviewedAt: new Date(),
        reviewedById: admin.id,
      },
    }),
    prisma.user.update({
      where: { id: request.userId },
      data: {
        role: approved ? "VENUE" : "USER",
        isVerified: approved,
      },
    }),
    prisma.event.updateMany({
      where: { ownerId: request.userId },
      data: { published: approved },
    }),
    prisma.notification.create({
      data: {
        recipientId: request.userId,
        actorId: admin.id,
        type: NotificationType.VENUE_APPROVED,
        title: approved ? "Tu negocio ha sido aprobado" : banned ? "Tu local ha sido vetado" : "Tu solicitud ha sido revisada",
        body: approved
          ? "Ya puedes públicar eventos y tu perfil aparece como verificado."
          : finalReason,
        link: approved ? "/local/dashboard" : "/venue/pending",
      },
    }),
  ]);

  await createAdminAuditLog({
    adminId: admin.id,
    action: approved ? "approve_venue" : banned ? "ban_venue" : "reject_venue",
    targetType: "venue_request",
    targetId: requestId,
    details: `${request.businessName} · ${request.userId}`,
  }).catch(() => null);

  await sendTelegramAlert({
    title: approved ? "Local aprobado" : banned ? "Local vetado" : "Local rechazado",
    lines: [
      `Admin: ${admin.username ?? admin.email}`,
      `Negocio: ${request.businessName}`,
      `Usuario: ${request.userId}`,
      approved ? "Estado: aprobado y verificado" : `Motivo: ${finalReason}`,
    ],
  });

  revalidatePath("/admin/venue-requests");
  revalidatePath("/venue/pending");
  revalidatePath("/local/dashboard");
  revalidatePath("/events");
  revalidatePath("/map");
}

