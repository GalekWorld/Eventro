import { cache } from "react";
import { db } from "@/lib/db";

export const getMutualFriendIds = cache(async (userId: string) => {
  const [following, followers] = await Promise.all([
    db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    }),
    db.follow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    }),
  ]);

  const followerIds = new Set(followers.map((item) => item.followerId));
  return following.map((item) => item.followingId).filter((id) => followerIds.has(id));
});
