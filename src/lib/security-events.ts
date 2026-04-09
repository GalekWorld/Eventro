import "server-only";

import { SecurityEventLevel } from "@prisma/client";
import { db } from "@/lib/db";
import { hasTelegramAlertsConfigured, sendTelegramAlert } from "@/lib/telegram";
import { getActorLabel } from "@/lib/user-display";

type SecurityEventInput = {
  type: string;
  level?: SecurityEventLevel;
  key?: string;
  userId?: string | null;
  message: string;
  metadata?: Record<string, unknown> | null;
  notifyTelegram?: boolean;
};

const TELEGRAM_MIN_LEVEL = (process.env.TELEGRAM_SECURITY_MIN_LEVEL || "CRITICAL").toUpperCase();
const LEVEL_WEIGHT: Record<SecurityEventLevel, number> = {
  INFO: 1,
  WARN: 2,
  CRITICAL: 3,
};

function stringifyMetadata(metadata?: Record<string, unknown> | null) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return null;
  }

  try {
    return JSON.stringify(metadata);
  } catch {
    return null;
  }
}

function getConsoleMethod(level: SecurityEventLevel) {
  if (level === "CRITICAL") return console.error;
  if (level === "WARN") return console.warn;
  return console.info;
}

function getSecurityTitle(type: string) {
  if (type.includes("rate_limit")) return "Seguridad | Rate limit";
  if (type.includes("upload")) return "Seguridad | Upload rechazado";
  if (type.includes("fallback")) return "Seguridad | Fallback";
  return "Seguridad | Evento";
}

function shouldNotifyTelegram(level: SecurityEventLevel, forceNotify: boolean) {
  if (forceNotify) {
    return true;
  }

  const configuredWeight = LEVEL_WEIGHT[(TELEGRAM_MIN_LEVEL as SecurityEventLevel) || "CRITICAL"] ?? LEVEL_WEIGHT.CRITICAL;
  return LEVEL_WEIGHT[level] >= configuredWeight;
}

export async function recordSecurityEvent({
  type,
  level = "INFO",
  key,
  userId,
  message,
  metadata,
  notifyTelegram = false,
}: SecurityEventInput) {
  const metadataString = stringifyMetadata(metadata);
  const actor = userId
    ? await db.user
        .findUnique({
          where: { id: userId },
          select: {
            username: true,
            name: true,
            email: true,
          },
        })
        .catch(() => null)
    : null;
  const technicalPayload = {
    scope: "security-event",
    type,
    level,
    key: key ?? null,
    userId: userId ?? null,
    actor: actor ? getActorLabel(actor) : null,
    message,
    metadata: metadata ?? null,
    createdAt: new Date().toISOString(),
  };

  getConsoleMethod(level)(JSON.stringify(technicalPayload));

  await db.securityEvent
    .create({
      data: {
        type,
        level,
        key: key ?? null,
        userId: userId ?? null,
        message,
        metadata: metadataString,
      },
    })
    .catch(() => null);

  if (hasTelegramAlertsConfigured() && shouldNotifyTelegram(level, notifyTelegram)) {
    await sendTelegramAlert({
      title: getSecurityTitle(type),
      lines: [
        `Nivel: ${level}`,
        `Tipo: ${type}`,
        key ? `Clave: ${key}` : "",
        actor ? `Usuario: ${getActorLabel(actor)}` : userId ? `Usuario ID: ${userId}` : "",
        `Mensaje: ${message}`,
        metadataString ? `Metadata: ${metadataString.slice(0, 280)}` : "",
      ].filter(Boolean),
    });
  }
}
