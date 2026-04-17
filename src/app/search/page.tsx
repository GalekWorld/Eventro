import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { FollowToggleButton } from "@/components/follow-toggle-button";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { getVerificationTone, isPubliclyVerified } from "@/lib/user-display";
import { getBlockedUserIds } from "@/lib/privacy";
import { getEventPath } from "@/lib/event-path";

type SearchParams = Promise<{ q?: string }>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  const query = String(params.q ?? "").trim().toLowerCase();
  const blockedUserIds = currentUser ? await getBlockedUserIds(currentUser.id) : [];

  const [users, events, groups] = await Promise.all([
    db.user.findMany({
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
      take: 12,
      orderBy: query ? [{ username: "asc" }, { createdAt: "desc" }] : { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        name: true,
        city: true,
        isVerified: true,
        role: true,
        avatarUrl: true,
        followers: currentUser
          ? {
              where: {
                followerId: currentUser.id,
              },
              select: {
                id: true,
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
    }),
    db.event.findMany({
      where: {
        published: true,
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
                { city: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ date: "asc" }, { createdAt: "desc" }],
      take: 8,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        city: true,
        date: true,
        imageUrl: true,
        owner: {
          select: {
            username: true,
            name: true,
          },
        },
      },
    }),
    db.group.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { slug: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          }
        : {},
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        privacy: true,
        _count: {
          select: {
            memberships: true,
          },
        },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-[935px] space-y-4">
      <section className="app-card p-5">
        <h1 className="app-screen-title">Buscar</h1>
        <form className="mt-4">
          <input name="q" defaultValue={params.q} className="app-input" placeholder="Busca personas, eventos o grupos" />
        </form>
      </section>

      <section className="space-y-4">
        <div className="app-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-950">Personas</h2>
            <p className="text-xs text-slate-500">{users.length} resultados</p>
          </div>
          <div className="mt-4 grid gap-3">
            {users.map((user) => {
              const isFollowing = Array.isArray(user.followers) && user.followers.length > 0;

              return (
                <article key={user.id} className="rounded-3xl border border-neutral-200 p-4">
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
                        {user.name ? <p className="text-sm text-slate-500">{user.name}</p> : null}
                        <p className="text-xs text-slate-400">
                          {user._count.followers} seguidores · {user._count.posts} publicaciones
                        </p>
                      </div>
                    </div>

                    {currentUser ? (
                      <FollowToggleButton
                        targetUserId={user.id}
                        redirectPath={`/search${query ? `?q=${encodeURIComponent(query)}` : ""}`}
                        username={`@${user.username ?? "usuario"}`}
                        initialFollowing={isFollowing}
                      />
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
          {users.length === 0 ? <div className="mt-4 text-sm text-slate-500">No se han encontrado personas.</div> : null}
        </div>

        <div className="app-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-950">Eventos</h2>
            <p className="text-xs text-slate-500">{events.length} resultados</p>
          </div>
          <div className="mt-4 grid gap-3">
            {events.map((event) => (
              <Link key={event.id} href={getEventPath(event)} className="rounded-3xl border border-neutral-200 p-4 transition hover:bg-neutral-50">
                <div className="flex items-start gap-3">
                  {event.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.imageUrl} alt={event.title} className="h-16 w-16 rounded-2xl object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 text-xs font-semibold text-slate-400">
                      EVENTO
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950">{event.title}</p>
                    {event.description ? <p className="mt-1 line-clamp-2 text-sm text-slate-500">{event.description}</p> : null}
                    <p className="mt-2 text-xs text-slate-400">
                      {event.city} · {new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(event.date)}
                    </p>
                    {event.owner.username || event.owner.name ? (
                      <p className="mt-1 text-xs text-slate-400">Por {event.owner.name || `@${event.owner.username}`}</p>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {events.length === 0 ? <div className="mt-4 text-sm text-slate-500">No se han encontrado eventos.</div> : null}
        </div>

        <div className="app-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-950">Grupos</h2>
            <p className="text-xs text-slate-500">{groups.length} resultados</p>
          </div>
          <div className="mt-4 grid gap-3">
            {groups.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`} className="rounded-3xl border border-neutral-200 p-4 transition hover:bg-neutral-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950">{group.name}</p>
                    <p className="mt-1 text-xs text-slate-400">@{group.slug}</p>
                    {group.description ? <p className="mt-2 line-clamp-2 text-sm text-slate-500">{group.description}</p> : null}
                  </div>
                  <span className="app-pill shrink-0">{group.privacy === "PRIVATE" ? "Privado" : "Público"}</span>
                </div>
                <p className="mt-3 text-xs text-slate-400">{group._count.memberships} miembros</p>
              </Link>
            ))}
          </div>
          {groups.length === 0 ? <div className="mt-4 text-sm text-slate-500">No se han encontrado grupos.</div> : null}
        </div>
      </section>
    </div>
  );
}
