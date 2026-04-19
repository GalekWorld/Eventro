import Link from "next/link";
import { Bell, Heart, MapPin, MessageCircle, QrCode, Send, ShieldCheck, Sparkles, UserPlus, Users } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PostComposer } from "@/components/forms/post-composer";
import { PostCommentForm } from "@/components/forms/post-comment-form";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { getVerificationTone, isPubliclyVerified } from "@/lib/user-display";
import { PostActions } from "@/components/post-actions";
import { CommentActions } from "@/components/comment-actions";
import { getBlockedUserIds } from "@/lib/privacy";
import { getMutualFriendIds } from "@/lib/social-graph";
import { getEventPath } from "@/lib/event-path";
import { purgeExpiredStories } from "@/lib/stories";
import { PaginationControls } from "@/components/pagination-controls";
import { parsePostContent } from "@/lib/post-content";
import { purgeTemporaryPosts } from "@/lib/post-maintenance";
import { PostLikeButton } from "@/components/post-like-button";
import { DashboardFeedFilters } from "@/components/dashboard-feed-filters";
import { StoryCardLink } from "@/components/story-card-link";
import { getVisiblePublishedEventsWhere } from "@/lib/event-visibility";
import { purgeExpiredEvents } from "@/lib/event-maintenance";

type SearchParams = Promise<{ tab?: string; city?: string; page?: string }>;

const POSTS_PER_PAGE = 8;

function parsePage(value?: string) {
  const page = Number(value ?? "1");
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  void purgeTemporaryPosts().catch(() => null);
  void purgeExpiredStories().catch(() => null);
  void purgeExpiredEvents().catch(() => null);

  const params = await searchParams;
  const user = await getCurrentUser();
  const now = new Date();
  const activeTab = params.tab === "friends" ? "friends" : "discover";
  const cityFilter = String(params.city ?? "").trim();
  const page = parsePage(params.page);

  const [blockedUserIds, friendIds] = await Promise.all([
    user ? getBlockedUserIds(user.id) : Promise.resolve<string[]>([]),
    user ? getMutualFriendIds(user.id) : Promise.resolve<string[]>([]),
  ]);

  const redirectPath = `/dashboard?tab=${activeTab}${cityFilter ? `&city=${encodeURIComponent(cityFilter)}` : ""}${page > 1 ? `&page=${page}` : ""}`;
  const postWhere = {
    hiddenAt: null,
    authorId: { notIn: blockedUserIds },
    ...(activeTab === "friends"
      ? {
          authorId: {
            in: friendIds.length > 0 ? friendIds : ["__no_friends__"],
          },
        }
      : {}),
    ...(cityFilter
      ? {
          author: {
            city: {
              contains: cityFilter,
              mode: "insensitive" as const,
            },
          },
        }
      : {}),
  };

  const [candidateEvents, featuredAuditLogs, posts, postCount, stories, suggestedUsers, friendUsers, groups] = await Promise.all([
    db.event.findMany({
      where: {
        ...getVisiblePublishedEventsWhere(now),
        ...(cityFilter
          ? {
              city: {
                contains: cityFilter,
                mode: "insensitive",
              },
            }
          : {}),
      },
      orderBy: { date: "asc" },
      take: 20,
      select: {
        id: true,
        slug: true,
        title: true,
        city: true,
        date: true,
        _count: {
          select: {
            views: true,
          },
        },
      },
    }),
    db.adminAuditLog.findMany({
      where: {
        action: {
          in: ["feature_event", "unfeature_event"],
        },
        targetType: "event",
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        action: true,
        targetId: true,
      },
    }),
    db.post.findMany({
      where: postWhere,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * POSTS_PER_PAGE,
      take: POSTS_PER_PAGE,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            city: true,
            isVerified: true,
            role: true,
            avatarUrl: true,
          },
        },
        likes: user ? { where: { userId: user.id }, select: { id: true } } : false,
        comments: {
          where: {
            hiddenAt: null,
            authorId: { notIn: blockedUserIds },
          },
          orderBy: { createdAt: "asc" },
          take: 6,
          include: {
            author: {
              select: {
                id: true,
                username: true,
                name: true,
                avatarUrl: true,
                isVerified: true,
                role: true,
              },
            },
            likes: user ? { where: { userId: user.id }, select: { id: true } } : false,
            _count: {
              select: { likes: true },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            comments: {
              where: { hiddenAt: null },
            },
          },
        },
      },
    }),
    db.post.count({ where: postWhere }),
    db.story.findMany({
      where: {
        expiresAt: { gt: now },
        authorId: { notIn: blockedUserIds },
        ...(activeTab === "friends" && user
          ? {
              authorId: {
                in: friendIds.length > 0 ? friendIds : ["__no_friends__"],
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            isVerified: true,
            role: true,
          },
        },
      },
    }),
    db.user.findMany({
      where: {
        username: { not: null },
        id: { notIn: [...blockedUserIds, ...(user ? [user.id] : [])] },
      },
      take: 6,
      select: {
        id: true,
        username: true,
        name: true,
        city: true,
        isVerified: true,
        role: true,
        avatarUrl: true,
      },
    }),
    friendIds.length > 0
      ? db.user.findMany({
          where: {
            id: {
              in: friendIds,
            },
          },
          take: 4,
          select: {
            id: true,
            username: true,
            name: true,
          },
        })
      : Promise.resolve([]),
    db.group.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        _count: {
          select: { memberships: true, messages: { where: { hiddenAt: null } } },
        },
      },
    }),
  ]);

  const featuredState = new Map<string, boolean>();
  for (const log of featuredAuditLogs) {
    if (!featuredState.has(log.targetId)) {
      featuredState.set(log.targetId, log.action === "feature_event");
    }
  }

  const events = candidateEvents
    .slice()
    .sort((left, right) => {
      const leftManual = featuredState.get(left.id) ? 1 : 0;
      const rightManual = featuredState.get(right.id) ? 1 : 0;

      if (leftManual !== rightManual) {
        return rightManual - leftManual;
      }

      if (left._count.views !== right._count.views) {
        return right._count.views - left._count.views;
      }

      return new Date(left.date).getTime() - new Date(right.date).getTime();
    })
    .slice(0, 3);

  const totalPages = Math.max(1, Math.ceil(postCount / POSTS_PER_PAGE));

  const shortcuts = [
    { href: "/events", label: "Eventos", icon: MapPin },
    { href: "/groups", label: "Grupos", icon: Users },
    { href: "/notifications", label: "Avisos", icon: Bell },
    { href: "/friends", label: "Amigos", icon: UserPlus },
  ];

  if (user?.role === "VENUE") {
    shortcuts.push({ href: "/local/dashboard", label: "Local", icon: Sparkles });
  }

  if (user?.role === "ADMIN") {
    shortcuts.push({ href: "/admin/venue-requests", label: "Admin", icon: ShieldCheck });
  }

  if (user && (user.role === "ADMIN" || user.role === "VENUE")) {
    shortcuts.push({ href: "/scanner", label: "Escáner", icon: QrCode });
  }

  return (
    <div className="mx-auto grid w-full max-w-[1180px] items-start gap-3 sm:gap-4 xl:grid-cols-[minmax(0,680px)_minmax(260px,300px)] xl:justify-center xl:gap-5">
      <section className="min-w-0 space-y-3">
        <section className="app-card p-2.5 sm:p-4">
          <DashboardFeedFilters activeTab={activeTab} cityFilter={cityFilter} />
          <p className="mt-2 text-xs text-slate-500">
            {activeTab === "discover"
              ? "Descubre publicaciones de toda la comunidad."
              : "Solo ves publicaciones de usuarios que os seguís mutuamente."}
          </p>
        </section>

        <section className="app-card overflow-x-auto p-2.5 sm:p-3">
          <div className="flex gap-2">
            {shortcuts.map((shortcut) => {
              const Icon = shortcut.icon;

              return (
                <Link
                  key={shortcut.href}
                  href={shortcut.href}
                  className="flex min-w-[84px] flex-col items-center justify-center rounded-2xl bg-neutral-50 px-3 py-2.5 text-center transition hover:bg-neutral-100 sm:min-w-[92px]"
                >
                  <Icon className="h-5 w-5 text-slate-700" />
                  <span className="mt-1.5 text-[11px] font-medium text-slate-700">{shortcut.label}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="app-card overflow-x-auto p-2.5 sm:p-3">
          <div className="flex gap-3">
            {stories.map((story) => (
              <StoryCardLink key={story.id} href={`/stories/${story.id}`} className="min-w-[78px] max-w-[78px] text-center sm:min-w-[86px] sm:max-w-[86px]">
                <div className="app-story-ring rounded-[24px] p-[2px]">
                  <div className="relative aspect-[9/16] overflow-hidden rounded-[22px] bg-white text-lg font-semibold text-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={story.imageUrl} alt={story.caption ?? "story"} className="h-full w-full object-cover" />
                    {isPubliclyVerified(story.author) ? (
                      <span className="absolute bottom-1 right-1 rounded-full bg-white p-0.5 shadow-sm">
                        <VerifiedBadge tone={getVerificationTone(story.author)} />
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-1.5 truncate text-[11px] text-slate-600">@{story.author.username ?? "nuevo"}</p>
              </StoryCardLink>
            ))}

            {stories.length === 0 ? (
              <div className="flex min-h-[68px] items-center text-sm text-slate-500">
                {activeTab === "friends" ? "Aún no hay historias de tus amigos." : "Todavía no hay historias activas."}
              </div>
            ) : null}
          </div>
        </section>

        {user ? <PostComposer /> : null}

        <div className="space-y-4">
          {posts.map((post) => {
            const liked = Array.isArray(post.likes) && post.likes.length > 0;
            const parsedPost = parsePostContent(post.content);

            return (
              <article key={post.id} className="app-card overflow-hidden rounded-[18px]">
                <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="app-story-ring rounded-full p-[2px]">
                      <UserAvatar user={post.author} className="h-10 w-10" textClassName="text-sm" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/u/${post.author.username ?? ""}`} className="truncate text-sm font-semibold text-slate-950">
                          @{post.author.username ?? "usuario"}
                        </Link>
                        {isPubliclyVerified(post.author) ? <VerifiedBadge tone={getVerificationTone(post.author)} /> : null}
                      </div>
                      {post.author.name || post.author.city ? (
                        <p className="truncate text-xs text-slate-500">
                          {post.author.name ?? ""}
                          {post.author.city ? `${post.author.name ? " · " : ""}${post.author.city}` : ""}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {isPubliclyVerified(post.author) ? <span className="app-pill">Verificado</span> : null}
                </div>

                {post.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.imageUrl} alt={post.content} className="aspect-square w-full object-cover" />
                ) : null}

                <div className="p-4">
                  <div className="flex items-center gap-4 text-slate-800">
                    {user ? (
                      <PostLikeButton postId={post.id} redirectPath={redirectPath} initialLiked={liked} />
                    ) : (
                      <Heart className="h-6 w-6" />
                    )}
                    <MessageCircle className="h-6 w-6" />
                    <Link href={`/u/${post.author.username ?? ""}`} aria-label="Abrir perfil">
                      <Send className="h-6 w-6" />
                    </Link>
                  </div>

                  <p className="mt-3 text-sm font-semibold text-slate-950">
                    {post._count.likes} me gusta · {post._count.comments} comentarios
                  </p>

                  <p className="mt-3 text-sm leading-7 text-slate-800">
                    <span className="mr-2 font-semibold">@{post.author.username ?? "usuario"}</span>
                    {parsedPost.content}
                  </p>
                  {parsedPost.location ? <p className="mt-2 text-xs font-medium text-slate-500">Ubicación: {parsedPost.location}</p> : null}

                  {user && post.authorId === user.id ? (
                    <PostActions postId={post.id} initialContent={parsedPost.content} redirectPath={redirectPath} canDelete />
                  ) : null}

                  <div className="mt-3 space-y-3">
                    {post.comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <UserAvatar user={comment.author} className="h-8 w-8 bg-neutral-100" textClassName="text-xs" />
                        <div className="min-w-0 flex-1 rounded-2xl bg-neutral-50 px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <Link href={`/u/${comment.author.username ?? ""}`} className="text-xs font-semibold text-slate-950">
                              @{comment.author.username ?? "usuario"}
                            </Link>
                            {isPubliclyVerified(comment.author) ? <VerifiedBadge tone={getVerificationTone(comment.author)} /> : null}
                          </div>
                          <p className="mt-1 text-sm text-slate-700">{comment.body}</p>
                          {user ? (
                            <CommentActions
                              commentId={comment.id}
                              initialBody={comment.body}
                              redirectPath={redirectPath}
                              liked={Array.isArray(comment.likes) && comment.likes.length > 0}
                              likeCount={comment._count.likes}
                              canDelete={comment.author.id === user.id || post.author.id === user.id || user.role === "ADMIN"}
                              canEdit={comment.author.id === user.id}
                            />
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>

                  {user ? <PostCommentForm postId={post.id} redirectPath={redirectPath} /> : null}
                </div>
              </article>
            );
          })}

          {posts.length === 0 ? (
            <div className="app-card p-5 text-sm text-slate-500">
              {activeTab === "friends"
                ? "Aún no tienes publicaciones de amigos. Cuando os seguís mutuamente aparecerán aquí."
                : "No hay publicaciones con ese filtro ahora mismo."}
            </div>
          ) : null}
        </div>

        <PaginationControls
          pathname="/dashboard"
          currentPage={page}
          totalPages={totalPages}
          params={{
            tab: activeTab,
            city: cityFilter || undefined,
          }}
        />
      </section>

      <aside className="hidden w-full max-w-[300px] space-y-4 xl:block">
        <div className="app-card p-5">
          <div className="flex items-center gap-3">
            <div className="app-story-ring rounded-full p-[2px]">
              <UserAvatar user={user ?? {}} className="h-14 w-14 bg-gradient-to-br from-pink-100 to-sky-100" textClassName="text-lg" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-slate-950">@{user?.username ?? "visitante"}</p>
                {user && isPubliclyVerified(user) ? <VerifiedBadge tone={getVerificationTone(user)} /> : null}
              </div>
              {user?.name || user?.city ? (
                <p className="text-sm text-slate-500">
                  {user?.name ?? ""}
                  {user?.city ? `${user?.name ? " · " : ""}${user.city}` : ""}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="app-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Sugerencias para ti</p>
            <Link href="/search" className="text-xs font-semibold text-slate-950">
              Ver todo
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {suggestedUsers.slice(0, 5).map((suggested) => (
              <div key={suggested.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <UserAvatar user={suggested} className="h-11 w-11 bg-neutral-100" textClassName="text-sm" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-slate-950">@{suggested.username}</p>
                      {isPubliclyVerified(suggested) ? <VerifiedBadge tone={getVerificationTone(suggested)} /> : null}
                    </div>
                    {suggested.name || suggested.city ? (
                      <p className="text-xs text-slate-500">
                        {suggested.name ?? ""}
                        {suggested.city ? `${suggested.name ? " · " : ""}${suggested.city}` : ""}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Link href={`/u/${suggested.username ?? ""}`} className="text-xs font-semibold text-sky-500">
                  Ver
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="app-card p-5">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-500" />
            <p className="text-sm font-semibold text-slate-950">Eventos destacados</p>
          </div>
          <div className="mt-4 space-y-3">
            {events.slice(0, 3).map((event) => (
              <Link key={event.id} href={getEventPath(event)} className="block rounded-2xl bg-neutral-50 p-3 transition hover:bg-neutral-100">
                <p className="text-sm font-semibold text-slate-950">{event.title}</p>
                <p className="mt-1 text-xs text-slate-500">{event.city}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="app-card p-5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            <p className="text-sm font-semibold text-slate-950">Tus amigos</p>
          </div>
          <div className="mt-4 space-y-3">
            {friendUsers.length > 0 ? (
              <>
                {friendUsers.map((friend) => (
                  <Link key={friend.id} href={`/u/${friend.username ?? ""}`} className="block rounded-2xl bg-neutral-50 p-3 transition hover:bg-neutral-100">
                    <p className="text-sm font-semibold text-slate-950">@{friend.username}</p>
                    {friend.name ? <p className="mt-1 text-xs text-slate-500">{friend.name}</p> : null}
                  </Link>
                ))}
                <Link
                  href="/friends"
                  className="flex items-center justify-center rounded-2xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-neutral-50"
                >
                  Ver más
                </Link>
              </>
            ) : (
              <p className="text-sm text-slate-500">Cuando os seguís mutuamente aparecerán aquí.</p>
            )}
          </div>
        </div>

        <div className="app-card p-5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            <p className="text-sm font-semibold text-slate-950">Grupos activos</p>
          </div>
          <div className="mt-4 space-y-3">
            {groups.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`} className="block rounded-2xl bg-neutral-50 p-3 transition hover:bg-neutral-100">
                <p className="text-sm font-semibold text-slate-950">{group.name}</p>
                <p className="mt-1 text-xs text-slate-500">{group._count.memberships} miembros · {group._count.messages} mensajes</p>
              </Link>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
