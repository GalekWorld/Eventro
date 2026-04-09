import "server-only";

import { importJWK, SignJWT } from "jose";
import { NotificationType } from "@prisma/client";
import { db } from "@/lib/db";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
const subject = process.env.VAPID_SUBJECT ?? "mailto:no-reply@example.com";

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(padded, "base64");
}

function getPublicKeyCoordinates() {
  const raw = base64UrlDecode(publicKey);

  if (raw.length !== 65 || raw[0] !== 4) {
    throw new Error("INVALID_VAPID_PUBLIC_KEY");
  }

  return {
    x: raw.subarray(1, 33).toString("base64url"),
    y: raw.subarray(33, 65).toString("base64url"),
  };
}

export function isWebPushConfigured() {
  return Boolean(publicKey && privateKey && subject);
}

async function createVapidJwt(audience: string) {
  const { x, y } = getPublicKeyCoordinates();
  const privateJwk = {
    kty: "EC",
    crv: "P-256",
    d: privateKey,
    x,
    y,
  };

  const key = await importJWK(privateJwk, "ES256");

  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", typ: "JWT" })
    .setAudience(audience)
    .setSubject(subject)
    .setExpirationTime("12h")
    .sign(key);
}

async function sendPushTickle(endpoint: string) {
  const audience = new URL(endpoint).origin;
  const token = await createVapidJwt(audience);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      TTL: "60",
      Authorization: `vapid t=${token}, k=${publicKey}`,
      "Content-Length": "0",
    },
  });

  return response;
}

export async function queuePushNotificationForUser(args: {
  recipientId: string;
  notificationId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
}) {
  if (!isWebPushConfigured()) {
    return;
  }

  const subscriptions = await db.pushSubscription.findMany({
    where: { userId: args.recipientId },
    select: {
      id: true,
      endpoint: true,
    },
  });

  if (subscriptions.length === 0) {
    return;
  }

  await db.pushDelivery.createMany({
    data: subscriptions.map((subscription) => ({
      subscriptionId: subscription.id,
      notificationId: args.notificationId ?? null,
      type: args.type,
      title: args.title,
      body: args.body ?? null,
      link: args.link ?? null,
    })),
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        const response = await sendPushTickle(subscription.endpoint);

        if (response.status === 404 || response.status === 410) {
          await db.pushSubscription.delete({
            where: { id: subscription.id },
          }).catch(() => null);
        }
      } catch {
        // Ignore push transport errors. The delivery stays queued for the next successful push.
      }
    }),
  );
}
