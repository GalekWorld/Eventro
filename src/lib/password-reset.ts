import "server-only";

import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await db.passwordResetToken.deleteMany({
    where: { userId },
  });

  await db.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function getPasswordResetTokenRecord(token: string) {
  const tokenHash = hashToken(token);

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!record) {
    return null;
  }

  if (record.expiresAt <= new Date()) {
    await db.passwordResetToken.delete({
      where: { id: record.id },
    }).catch(() => null);
    return null;
  }

  return record;
}
