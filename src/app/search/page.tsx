import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { followUserAction } from "@/app/actions/social";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { getVerificationTone, isPubliclyVerified } from "@/lib/user-display";
import { getBlockedUserIds } from "@/lib/privacy";

type SearchParams = Promise<{ q?: string }>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  const query = String(params.q ?? "").trim().toLowerCase();
  const blockedUserIds = currentUser ? await getBlockedUserIds(currentUser.id) : [];

  const users = await db.user.findMany({
    where: {
      ...(query
        ? {
            OR: [
              { username: { contains: query, mode: "insensitive" } },
              { name: { contains: query, mode: "insensitive" } },
            ],
          }
        : {
            username: { not: null },
          }),
      ...(currentUser ? { id: { not: currentUser.id } } : {}),
      ...(blockedUserIds.length ? { id: { notIn: blockedUserIds } } : {}),
    },
    take: 20,
    orderBy: query ? [{ username: "asc" }, { createdAt: "desc" }] : { createdAt: "desc" },
    include: {
      followers: currentUser
        ? {
            where: {
              followerId: currentUser.id,
            },
          }
        : false,
      _count: {
        select: {
          followers: true,
          posts: true,
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-[935px] space-y-4">
      <section className="app-card p-5">
        <h1 className="app-screen-title">Buscar</h1>
        <form className="mt-4">
          <input name="q" defaultValue={params.q} className="app-input" placeholder="Busca cuentas por username o nombre" />
        </form>
      </section>

      <section className="grid gap-3">
        {users.map((user) => {
          const isFollowing = Array.isArray(user.followers) && user.followers.length > 0;

          return (
            <article key={user.id} className="app-card p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <UserAvatar user={user} className="h-14 w-14 bg-neutral-100" textClassName="text-lg" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Link href={`/u/${user.username ?? ""}`} className="text-sm font-semibold text-slate-950">
                        @{user.username ?? "sin-username"}
                      </Link>
                      {isPubliclyVerified(user) ? <VerifiedBadge tone={getVerificationTone(user)} /> : null}
                    </div>
                    <p className="text-sm text-slate-500">{user.name ?? "Usuario"}</p>
                    <p className="text-xs text-slate-400">
                      {user._count.followers} seguidores · {user._count.posts} publicaciones
                    </p>
                  </div>
                </div>

                {currentUser ? (
                  <form action={followUserAction}>
                    <input type="hidden" name="targetUserId" value={user.id} />
                    <input type="hidden" name="redirectPath" value={`/search${query ? `?q=${encodeURIComponent(query)}` : ""}`} />
                    <button className={isFollowing ? "app-button-secondary" : "app-button-primary"} type="submit">
                      {isFollowing ? "Siguiendo" : "Seguir"}
                    </button>
                  </form>
                ) : null}
              </div>
            </article>
          );
        })}

        {users.length === 0 ? <div className="app-card p-5 text-sm text-slate-500">No se han encontrado usuarios.</div> : null}
      </section>
    </div>
  );
}
