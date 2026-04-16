import { db } from "@/lib/db";
import { deletePublicFile } from "@/lib/upload";

const TEMPORARY_POST_RETENTION_HOURS = 72;
const TEMPORARY_POST_LIMIT = 100;

export async function purgeTemporaryPosts() {
  const temporaryPostsCount = await db.post.count({
    where: {
      showOnProfile: false,
      hiddenAt: null,
    },
  });

  if (temporaryPostsCount <= TEMPORARY_POST_LIMIT) {
    return;
  }

  const cutoff = new Date(Date.now() - TEMPORARY_POST_RETENTION_HOURS * 60 * 60 * 1000);
  const expiredTemporaryPosts = await db.post.findMany({
    where: {
      showOnProfile: false,
      hiddenAt: null,
      createdAt: {
        lte: cutoff,
      },
    },
    select: {
      id: true,
      imageUrl: true,
    },
  });

  if (expiredTemporaryPosts.length === 0) {
    return;
  }

  await db.post.deleteMany({
    where: {
      id: {
        in: expiredTemporaryPosts.map((post) => post.id),
      },
    },
  });

  await Promise.all(
    expiredTemporaryPosts.map(async (post) => {
      if (post.imageUrl) {
        await deletePublicFile(post.imageUrl);
      }
    }),
  );
}
