import Link from "next/link";
import { requireAuth } from "@/lib/permissions";
import { db } from "@/lib/db";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { getVerificationTone, isPubliclyVerified } from "@/lib/user-display";
import { getBlockedUserIds } from "@/lib/privacy";
import { getMutualFriendIds } from "@/lib/social-graph";

export default async function FriendsPage() {
  const currentUser = await requireAuth();
  const blockedUserIds = await getBlockedUserIds(currentUser.id);

  const friendIds = await getMutualFriendIds(currentUser.id);

  const friends = await db.user.findMany({
    where: {
      id: {
        in: friendIds,
        ...(blockedUserIds.length ? { notIn: blockedUserIds } : {}),
      },
    },
    orderBy: { username: "asc" },
    select: {
      id: true,
      username: true,
      name: true,
      city: true,
      avatarUrl: true,
      isVerified: true,
      role: true,
    },
  });

  return (
    <div className="mx-auto max-w-[935px] space-y-4">
      <section className="app-card p-5">
        <h1 className="app-screen-title">Amigos</h1>
        <p className="mt-2 app-screen-subtitle">Aquí ves a la gente con la que os seguís mutuamente.</p>
      </section>

      <section className="grid gap-3">
        {friends.map((friend) => (
          <Link
            key={friend.id}
            href={`/u/${friend.username ?? ""}`}
            className="app-card flex items-center gap-3 p-4 transition hover:-translate-y-0.5"
          >
            <UserAvatar user={friend} className="h-14 w-14 bg-neutral-100" textClassName="text-lg" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-semibold text-slate-950">@{friend.username ?? "usuario"}</p>
                {isPubliclyVerified(friend) ? <VerifiedBadge tone={getVerificationTone(friend)} /> : null}
              </div>
              {friend.name ? <p className="truncate text-sm text-slate-500">{friend.name}</p> : null}
              {friend.city ? <p className="truncate text-xs text-slate-400">{friend.city}</p> : null}
            </div>
          </Link>
        ))}

        {friends.length === 0 ? (
          <div className="app-card p-5 text-sm text-slate-500">Aún no tienes amigos añadidos.</div>
        ) : null}
      </section>
    </div>
  );
}
