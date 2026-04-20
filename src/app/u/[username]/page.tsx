import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { blockUserAction, openDirectConversationAction } from "@/app/actions/social";
import { FollowToggleButton } from "@/components/follow-toggle-button";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { getVerificationTone, isPubliclyVerified } from "@/lib/user-display";
import { ReportForm } from "@/components/forms/report-form";
import { isBlockedBetween } from "@/lib/privacy";
import { purgeExpiredStories } from "@/lib/stories";
import { getEventPath } from "@/lib/event-path";
import { formatEventDate, formatPrice } from "@/lib/utils";
import { getPrimaryTicketSummary } from "@/lib/event-pricing";
import { parsePostContent } from "@/lib/post-content";
import { purgeTemporaryPosts } from "@/lib/post-maintenance";
import { parseVipSpace } from "@/lib/vip-space";
import { listHighlightedStoryIdsForUser } from "@/lib/story-metadata";
import { ProfileStoryLauncher } from "@/components/profile-story-launcher";
import { StoryCardLink } from "@/components/story-card-link";
import { getEventVisibilityCutoffDate } from "@/lib/event-visibility";
import { purgeExpiredEvents } from "@/lib/event-maintenance";
import { measureQuery } from "@/lib/query-timing";

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  void purgeTemporaryPosts().catch(() => null);
  void purgeExpiredStories().catch(() => null);
  void purgeExpiredEvents().catch(() => null);
  const { username } = await params;
  const currentUser = await getCurrentUser();
  const now = new Date();
  const eventVisibilityCutoff = getEventVisibilityCutoffDate(now);

  const profile = await measureQuery("public-profile:base", () =>
    db.user.findFirst({
      where: {
        username,
      },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        city: true,
        avatarUrl: true,
        isVerified: true,
        role: true,
        _count: {
          select: {
            followers: true,
            following: true,
            posts: { where: { hiddenAt: null, showOnProfile: true } },
          },
        },
      },
    }),
  );

  if (!profile) notFound();

  const isOwnProfile = currentUser?.id === profile.id;

  const [blockedBetween, highlightedStoryIds, isBlocked, existingConversationId, currentUserFollowsProfile, profileFollowsCurrentUser, posts, stories, events] = await Promise.all([
    currentUser ? isBlockedBetween(currentUser.id, profile.id) : Promise.resolve(false),
    listHighlightedStoryIdsForUser(profile.id),
    currentUser && !isOwnProfile
      ? db.userBlock
          .findUnique({
            where: {
              blockerId_blockedId: {
                blockerId: currentUser.id,
                blockedId: profile.id,
              },
            },
          })
          .then(Boolean)
      : Promise.resolve(false),
    currentUser && !isOwnProfile
      ? db.directConversation
          .findFirst({
            where: {
              OR: [
                { userAId: currentUser.id, userBId: profile.id },
                { userAId: profile.id, userBId: currentUser.id },
              ],
            },
            select: {
              id: true,
            },
          })
          .then((conversation) => conversation?.id ?? null)
      : Promise.resolve<string | null>(null),
    currentUser && !isOwnProfile
      ? db.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: currentUser.id,
              followingId: profile.id,
            },
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    currentUser && !isOwnProfile
      ? db.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: profile.id,
              followingId: currentUser.id,
            },
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    measureQuery("public-profile:posts", () =>
      db.post.findMany({
        where: {
          authorId: profile.id,
          hiddenAt: null,
          showOnProfile: true,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          content: true,
          imageUrl: true,
        },
      }),
    ),
    measureQuery("public-profile:stories", () =>
      db.story.findMany({
        where: {
          authorId: profile.id,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          imageUrl: true,
          caption: true,
        },
      }),
    ),
    profile.role === "VENUE" || profile.role === "VENUE_PENDING"
      ? measureQuery("public-profile:events", () =>
          db.event.findMany({
            where: {
              ownerId: profile.id,
              published: true,
              OR: [{ endDate: { gt: eventVisibilityCutoff } }, { endDate: null, date: { gt: eventVisibilityCutoff } }],
            },
            orderBy: { date: "desc" },
            take: 6,
            select: {
              id: true,
              slug: true,
              title: true,
              reservationInfo: true,
              date: true,
              city: true,
              price: true,
              ticketTypes: {
                orderBy: { sortOrder: "asc" },
                select: {
                  name: true,
                  description: true,
                  price: true,
                  isVisible: true,
                },
              },
            },
          }),
        )
      : Promise.resolve([]),
  ]);

  if (blockedBetween) notFound();

  const highlightedStories = highlightedStoryIds.length
    ? await measureQuery("public-profile:highlighted-stories", () =>
        db.story.findMany({
          where: {
            id: { in: highlightedStoryIds },
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            imageUrl: true,
            caption: true,
          },
        }),
      )
    : [];

  const isFollowing = !isOwnProfile && Boolean(currentUserFollowsProfile);
  const isFriend = !isOwnProfile && Boolean(profileFollowsCurrentUser) && isFollowing;

  return (
    <div className="mx-auto max-w-[935px] space-y-4">
      <section className="app-card p-5 sm:p-7">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="mx-auto sm:mx-0">
            <div className="relative">
              {isOwnProfile ? (
                <ProfileStoryLauncher>
                  <div className="app-story-ring rounded-full p-[3px]">
                    <UserAvatar user={profile} className="h-24 w-24 sm:h-36 sm:w-36" textClassName="text-3xl" />
                  </div>
                </ProfileStoryLauncher>
              ) : (
                <div className="app-story-ring rounded-full p-[3px]">
                  <UserAvatar user={profile} className="h-24 w-24 sm:h-36 sm:w-36" textClassName="text-3xl" />
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-slate-950">@{profile.username}</h1>
                {isPubliclyVerified(profile) ? <VerifiedBadge label tone={getVerificationTone(profile)} /> : null}
              </div>
                {currentUser && !isOwnProfile ? (
                <div className="flex flex-wrap gap-2">
                  <FollowToggleButton
                    targetUserId={profile.id}
                    redirectPath={`/u/${profile.username}`}
                    username={`@${profile.username ?? "usuario"}`}
                    initialFollowing={isFollowing}
                    activeLabel={isFriend ? "Amigos" : "Siguiendo"}
                  />
                  {existingConversationId ? (
                    <Link href={`/messages/${existingConversationId}`} className="app-button-secondary">
                      Mensaje
                    </Link>
                  ) : (
                    <form action={openDirectConversationAction}>
                      <input type="hidden" name="targetUserId" value={profile.id} />
                      <button className="app-button-secondary" type="submit">
                        Mensaje
                      </button>
                    </form>
                  )}
                  <form action={blockUserAction}>
                    <input type="hidden" name="targetUserId" value={profile.id} />
                    <input type="hidden" name="redirectPath" value={`/u/${profile.username}`} />
                    <button className="app-button-secondary" type="submit">
                      {isBlocked ? "Desbloquear" : "Bloquear"}
                    </button>
                  </form>
                </div>
              ) : isOwnProfile ? (
                <Link href="/profile/private" className="app-button-secondary">
                  Ir al perfil privado
                </Link>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-5 text-sm">
              <span>
                <strong className="text-slate-950">{profile._count.posts}</strong> publicaciones
              </span>
              <span>
                <strong className="text-slate-950">{profile._count.followers}</strong> seguidores
              </span>
              <span>
                <strong className="text-slate-950">{profile._count.following}</strong> siguiendo
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {profile.name ? <p className="font-semibold text-slate-950">{profile.name}</p> : null}
              <p className="text-sm leading-6 text-slate-600">{profile.bio ?? "Todavía no ha añadido una biografía."}</p>
              {profile.city ? <p className="text-sm text-slate-500">{profile.city}</p> : null}
            </div>

            {currentUser && !isOwnProfile ? <ReportForm mode="user" targetField="reportedUserId" targetId={profile.id} /> : null}
          </div>
        </div>
      </section>

      {currentUser && stories.length > 0 ? (
        <section className="app-card overflow-x-auto p-4">
          <div className="flex gap-4">
            {stories.map((story) => (
              <StoryCardLink key={story.id} href={`/stories/${story.id}`} className="min-w-[104px] max-w-[104px] text-center sm:min-w-[116px] sm:max-w-[116px]">
                <div className="app-story-ring rounded-[28px] p-[2px]">
                  <div className="aspect-[9/16] overflow-hidden rounded-[26px] bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={story.imageUrl} alt={story.caption ?? "story"} className="h-full w-full object-cover" />
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-slate-500">{story.caption ?? "Historia"}</p>
              </StoryCardLink>
            ))}
          </div>
        </section>
      ) : null}

      {currentUser && highlightedStories.length > 0 ? (
        <section className="app-card overflow-x-auto p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-950">Historias destacadas</h2>
            <span className="app-pill">{highlightedStories.length}</span>
          </div>
          <div className="flex gap-4">
            {highlightedStories.map((story) => (
              <StoryCardLink key={story.id} href={`/stories/${story.id}`} className="block min-w-[108px] max-w-[108px] sm:min-w-[124px] sm:max-w-[124px]">
                <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-neutral-50">
                  <div className="aspect-[9/16] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={story.imageUrl} alt={story.caption ?? "Historia destacada"} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-xs text-slate-600">{story.caption ?? "Historia destacada"}</p>
                  </div>
                </div>
              </StoryCardLink>
            ))}
          </div>
        </section>
      ) : null}

      {(profile.role === "VENUE" || profile.role === "VENUE_PENDING") && events.length > 0 ? (
        <section className="app-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Anuncios del local</h2>
              <p className="mt-1 text-sm text-slate-500">Eventos y planes publicados en este perfil.</p>
            </div>
            <span className="app-pill">{events.length}</span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {events.map((event) => (
              <Link key={event.id} href={getEventPath(event)} className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4 transition hover:bg-neutral-100">
                {(() => {
                  const pricing = getPrimaryTicketSummary(event);
                  const vipSpace = parseVipSpace(event.reservationInfo);
                  return (
                    <>
                      <p className="line-clamp-1 text-base font-semibold text-slate-950">{event.title}</p>
                      {pricing.message ? <p className="mt-1 line-clamp-2 text-sm text-slate-500">{pricing.message}</p> : null}
                      {vipSpace?.adultsOnly ? <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-rose-600">+18</p> : null}
                      <p className="mt-1 text-sm text-slate-500">{formatEventDate(event.date)}</p>
                      <p className="mt-1 text-sm text-slate-500">{event.city}</p>
                      <p className="mt-3 text-sm font-medium text-slate-700">
                        {pricing.price == null ? "Gratis" : `Desde ${formatPrice(pricing.price) ?? "Gratis"}`}
                      </p>
                    </>
                  );
                })()}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-3 gap-1 sm:gap-3">
        {posts.map((post) => {
          const parsedPost = parsePostContent(post.content);

          return (
            <Link key={post.id} href={`/posts/${post.id}`} className="block overflow-hidden rounded-[18px] bg-neutral-100 transition hover:opacity-95">
              {post.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.imageUrl} alt={parsedPost.content} className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square flex-col items-center justify-center p-4 text-center text-sm text-slate-500">
                  <span>{parsedPost.content}</span>
                  {parsedPost.location ? <span className="mt-2 text-xs font-medium text-slate-400">{parsedPost.location}</span> : null}
                </div>
              )}
            </Link>
          );
        })}

        {posts.length === 0 ? (
          <div className="col-span-3 app-card p-5 text-center text-sm text-slate-500">Este usuario aún no ha publicado nada.</div>
        ) : null}
      </section>
    </div>
  );
}
