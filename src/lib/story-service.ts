import { NotificationType } from "@prisma/client";
import { db } from "@/lib/db";
import { assertRateLimit } from "@/lib/rate-limit";
import { savePublicImage } from "@/lib/upload";
import { clampFormValue, readFormValue } from "@/lib/form-data";

export async function createStoryForUser(user: { id: string; username?: string | null }, formData: FormData) {
  await assertRateLimit({
    key: `story:create:${user.id}`,
    limit: 10,
    windowMs: 24 * 60 * 60 * 1000,
    message: "Has subido demasiadas historias hoy. Espera un poco.",
    userId: user.id,
  });

  const caption = clampFormValue(formData.get("caption"), 140);
  const file = formData.get("image");
  const durationValue = Number(readFormValue(formData.get("durationSec")) || "10");
  const durationSec = Number.isFinite(durationValue) ? Math.min(Math.max(Math.round(durationValue), 5), 15) : 10;

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecciona una imagen para tu historia.");
  }

  const imageUrl = await savePublicImage(file, "stories");

  const story = await db.story.create({
    data: {
      authorId: user.id,
      imageUrl,
      caption: caption || null,
      durationSec,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return {
    story,
    notificationType: NotificationType.STORY_PUBLISHED,
  };
}
