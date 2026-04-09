import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError, validateJsonApiRequest } from "@/lib/request-security";

const bodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export async function POST(request: Request) {
  const validationError = validateJsonApiRequest(request);
  if (validationError) {
    return validationError;
  }

  const user = await getCurrentUser();

  if (!user) {
    return jsonError("UNAUTHORIZED", 401);
  }

  if (user.locationSharingMode === "GHOST") {
    return jsonError("LOCATION_DISABLED", 403);
  }

  const parsed = bodySchema.safeParse(await request.json());

  if (!parsed.success) {
    return jsonError("INVALID_LOCATION", 400);
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      locationSharedAt: new Date(),
    },
  });

  return NextResponse.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
