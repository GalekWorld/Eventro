import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { blockUserAction, followUserAction, openDirectConversationAction } from "@/app/actions/social";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { getVerificationTone, isPubliclyVerified } from "@/lib/user-display";
import { ReportForm } from "@/components/forms/report-form";
import { isBlockedBetween } from "@/lib/privacy";
import { purgeExpiredStories } from "@/lib/stories";

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  await purgeExpiredStories();
  const { username } = await params;
  const currentUser = await getCurrentUser();
  const now = new Date();

  const profile = await db.user.findFirst({
    where: {
      username,
    },
    include: {
      posts: {
        where: { hiddenAt: null, showOnProfile: true },
        orderBy: { createdAt: "desc" },
      },
      stories: {
        where: {
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
      },
      followers: currentUser ? { where: { followerId: currentUser.id } } : true,
      following: currentUser ? { where: { followingId: currentUser.id } } : false,
      _count: {
        select: {
          followers: true,
          following: true,
          posts: { where: { hiddenAt: null, showOnProfile: true } },
        },
      },
    },
  });

  if (!profile) notFound();
  if (currentUser && (await isBlockedBetween(currentUser.id, profile.id))) notFound();

  const isOwnProfile = currentUser?.id === profile.id;
  const isFollowing = !isOwnProfile && Array.isArray(profile.followers) && profile.followers.length > 0;
  const isFriend = !isOwnProfile && Array.isArray(profile.following) && profile.following.length > 0 && isFollowing;
  const isBlocked = currentUser
    ? await db.userBlock.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: currentUser.id,
            blockedId: profile.id,
          },
        },
      }).then(Boolean)
    : false;

  return (
    <div className="mx-auto max-w-[935px] space-y-4">
      <section className="app-card p-5 sm:p-7">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="mx-auto sm:mx-0">
            <div className="app-story-ring rounded-full p-[3px]">
              <UserAvatar user={profile} className="h-24 w-24 sm:h-36 sm:w-36" textClassName="text-3xl" />
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
                  <form action={followUserAction}>
                    <input type="hidden" name="targetUserId" value={profile.id} />
                    <input type="hidden" name="redirectPath" value={`/u/${profile.username}`} />
                    <button className={isFollowing ? "app-button-secondary" : "app-button-primary"} type="submit">
                      {isFriend ? "Amigos" : isFollowing ? "Siguiendo" : "Seguir"}
                    </button>
                  </form>
                  <form action={openDirectConversationAction}>
                    <input type="hidden" name="targetUserId" value={profile.id} />
                    <button className="app-button-secondary" type="submit">
                      Mensaje
                    </button>
                  </form>
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
              <p className="font-semibold text-slate-950">{profile.name ?? "Usuario"}</p>
              <p className="text-sm leading-6 text-slate-600">{profile.bio ?? "Todavía no ha añadido una biografía."}</p>
              {profile.city ? <p className="text-sm text-slate-500">{profile.city}</p> : null}
            </div>

            {currentUser && !isOwnProfile ? <ReportForm mode="user" targetField="reportedUserId" targetId={profile.id} /> : null}
          </div>
        </div>
      </section>

      {profile.stories.length > 0 ? (
        <section className="app-card overflow-x-auto p-4">
          <div className="flex gap-4">
            {profile.stories.map((story) => (
              <Link key={story.id} href={`/stories/${story.id}`} className="min-w-[90px] text-center">
                <div className="app-story-ring mx-auto rounded-full p-[2px]">
                  <div className="h-[82px] w-[82px] overflow-hidden rounded-full bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={story.imageUrl} alt={story.caption ?? "story"} className="h-full w-full object-cover" />
                  </div>
                </div>
                <p className="mt-2 truncate text-xs text-slate-500">{story.caption ?? "Historia"}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-3 gap-1 sm:gap-3">
        {profile.posts.map((post) => (
          <article key={post.id} className="overflow-hidden bg-neutral-100">
            {post.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.imageUrl} alt={post.content} className="aspect-square w-full object-cover" />
            ) : (
              <div className="flex aspect-square items-center justify-center p-4 text-center text-sm text-slate-500">
                {post.content}
              </div>
            )}
          </article>
        ))}

        {profile.posts.length === 0 ? (
          <div className="col-span-3 app-card p-5 text-center text-sm text-slate-500">Este usuario aún no ha publicado nada.</div>
        ) : null}
      </section>
    </div>
  );
}
