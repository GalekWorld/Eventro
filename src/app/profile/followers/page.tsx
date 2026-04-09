import Link from "next/link";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { getVerificationTone, isPubliclyVerified } from "@/lib/user-display";
import { getBlockedUserIds } from "@/lib/privacy";

export default async function ProfileFollowersPage() {
  const currentUser = await requireAuth();
  const blockedUserIds = await getBlockedUserIds(currentUser.id);

  const followers = await db.follow.findMany({
    where: {
      followingId: currentUser.id,
      ...(blockedUserIds.length ? { followerId: { notIn: blockedUserIds } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      follower: {
        select: {
          id: true,
          username: true,
          name: true,
          avatarUrl: true,
          isVerified: true,
          role: true,
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-[935px] space-y-4">
      <section className="app-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="app-screen-title">Seguidores</h1>
            <p className="mt-1 text-sm text-slate-500">La gente que sigue tu perfil.</p>
          </div>
          <Link href="/profile" className="app-button-secondary">
            Volver al perfil
          </Link>
        </div>
      </section>

      <section className="grid gap-3">
        {followers.map(({ follower }) => (
          <Link
            key={follower.id}
            href={`/u/${follower.username ?? ""}`}
            className="app-card flex items-center gap-3 p-4 transition hover:-translate-y-0.5"
          >
            <UserAvatar user={follower} className="h-14 w-14 bg-neutral-100" textClassName="text-lg" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-semibold text-slate-950">@{follower.username ?? "usuario"}</p>
                {isPubliclyVerified(follower) ? <VerifiedBadge tone={getVerificationTone(follower)} /> : null}
              </div>
              <p className="truncate text-sm text-slate-500">{follower.name ?? "Usuario"}</p>
            </div>
          </Link>
        ))}

        {followers.length === 0 ? (
          <div className="app-card p-5 text-sm text-slate-500">Todavía no tienes seguidores.</div>
        ) : null}
      </section>
    </div>
  );
}
