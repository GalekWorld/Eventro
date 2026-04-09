import { db } from "@/lib/db";

export async function purgeExpiredStories() {
  await db.story.deleteMany({
    where: {
      expiresAt: {
        lte: new Date(),
      },
    },
  });
}
