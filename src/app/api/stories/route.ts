import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isAllowedSameOriginRequest } from "@/lib/request-origin";
import { createStoryForUser } from "@/lib/story-service";

export async function POST(request: Request) {
  if (!isAllowedSameOriginRequest(request)) {
    return NextResponse.json({ error: "ORIGIN_NOT_ALLOWED" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Necesitas iniciar sesion." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const formData = await request.formData();
    const { story } = await createStoryForUser(user, formData);

    return NextResponse.json(
      { ok: true, storyId: story.id, success: "Historia publicada." },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo publicar la historia." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
