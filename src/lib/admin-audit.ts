import { db } from "@/lib/db";
import { sendTelegramAlert } from "@/lib/telegram";
import { getActorLabel } from "@/lib/user-display";

export async function createAdminAuditLog({
  adminId,
  action,
  targetType,
  targetId,
  details,
}: {
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: string;
}) {
  const admin = await db.user
    .findUnique({
      where: { id: adminId },
      select: {
        username: true,
        name: true,
        email: true,
      },
    })
    .catch(() => null);

  const log = await db.adminAuditLog
    .create({
      data: {
        adminId,
        action,
        targetType,
        targetId,
        details: details || null,
      },
    })
    .catch(() => null);

  if (!log) return;

  await sendTelegramAlert({
    title: "Acción admin registrada",
    lines: [
      `Admin: ${getActorLabel(admin)}`,
      `Admin ID: ${adminId}`,
      `Acción: ${action}`,
      `Objetivo: ${targetType} ${targetId}`,
      details ? `Detalle: ${details}` : "",
    ],
  });
}
