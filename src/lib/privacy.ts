import { cache } from "react";
import { db } from "./db";

export const getBlockedUserIds = cache(async (userId: string) => {
  const blocks = await db.userBlock.findMany({
    where: {
      OR: [{ blockerId: userId }, { blockedId: userId }],
    },
    select: {
      blockerId: true,
      blockedId: true,
    },
  });

  return blocks.map((block) => (block.blockerId === userId ? block.blockedId : block.blockerId));
});

export const isBlockedBetween = cache(async (userIdA: string, userIdB: string) => {
  const block = await db.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: userIdA, blockedId: userIdB },
        { blockerId: userIdB, blockedId: userIdA },
      ],
    },
    select: { id: true },
  });

  return Boolean(block);
});
