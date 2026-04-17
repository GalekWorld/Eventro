import Link from "next/link";
import { Grid3X3, MapPin, QrCode, Store, UserPlus, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import { ProfileForm } from "@/components/forms/profile-form";
import { StoryForm } from "@/components/forms/story-form";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { getVerificationTone, isPubliclyVerified } from "@/lib/user-display";
import { getBlockedUserIds } from "@/lib/privacy";
import { purgeExpiredStories } from "@/lib/stories";
import { LogoutButton } from "@/components/logout-button";
import { StoryDeleteButton } from "@/components/story-delete-button";
import { PasswordResetRequestForm } from "@/components/forms/password-reset-request-form";
import { isEmailDeliveryConfigured } from "@/lib/email";
import { LiveLocationSync } from "@/components/live-location-sync";
import { getEventPath } from "@/lib/event-path";
import { formatEventDate, formatPrice } from "@/lib/utils";
import { getPrimaryTicketSummary } from "@/lib/event-pricing";
import { parsePostContent } from "@/lib/post-content";
import { purgeTemporaryPosts } from "@/lib/post-maintenance";
import { parseVipSpace } from "@/lib/vip-space";
import { getStoryViewSummaries, listHighlightedStoryIdsForUser } from "@/lib/story-metadata";

export default async function PrivateProfilePage() {
  await purgeTemporaryPosts();
  await purgeExpiredStories();
  const user = await requireAuth();
  const now = new Date();
  const blockedUserIds = await getBlockedUserIds(user.id);
  const isVenueProfile = user.role === "VENUE" || user.role === "VENUE_PENDING";
  const canScan =
    user.role === "ADMIN" ||
    Boolean(
      await db.venueDoorStaff.findFirst({
        where: { staffUserId: user.id },
        select: { id: true },
      }),
    );

  const profile = await db.user.findUnique({
    where: { id: user.id },
    include: {
      posts: {
        where: { showOnProfile: true },
        orderBy: { createdAt: "desc" },
      },
      stories: {
        where: {
          expiresAt: {
            gt: now,
          },
        },
        orderBy: { createdAt: "desc" },
      },
      events: {
        where: { published: true },
        orderBy: { date: "desc" },
        take: 6,
        include: {
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
      },
      followers: {
        take: 12,
        orderBy: { createdAt: "desc" },
        ...(blockedUserIds.length ? { where: { followerId: { notIn: blockedUserIds } } } : {}),
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
      },
      _count: {
        select: {
          followers: true,
          following: true,
          posts: { where: { showOnProfile: true } },
          events: true,
        },
      },
      venueRequest: true,
    },
  });

  if (!profile) return null;

  const highlightedStoryIds = await listHighlightedStoryIdsForUser(user.id);
  const highlightedStories = highlightedStoryIds.length
    ? await db.story.findMany({
        where: {
          id: { in: highlightedStoryIds },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const storyViewSummaries = await getStoryViewSummaries(profile.stories.map((story) => story.id));

  const emailConfigured = isEmailDeliveryConfigured();
  const usernameChangesUsed = await db.usernameChange.count({
    where: {
      userId: user.id,
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
  });
  const usernameChangesRemaining = profile.role === "ADMIN" ? Number.POSITIVE_INFINITY : Math.max(0, 3 - usernameChangesUsed);
  const quickLinks = [{ href: "/tickets", label: "Mis entradas", icon: QrCode }];

  if (profile.role === "VENUE") {
    quickLinks.push({ href: "/local/dashboard", label: "Panel local", icon: Store });
  }

  if (profile.role === "ADMIN") {
    quickLinks.push({ href: "/admin/venue-requests", label: "Admin", icon: Store });
  }

  if (canScan) {
    quickLinks.push({ href: "/scanner", label: "Escáner", icon: QrCode });
  }

  quickLinks.push({ href: "/legal/privacy", label: "Privacidad", icon: Users });

  return (
    <div className="mx-auto max-w-[935px] space-y-4">
      {!isVenueProfile ? <LiveLocationSync enabled={profile.locationSharingMode !== "GHOST"} /> : null}

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
                <h1 className="text-2xl font-semibold text-slate-950">@{profile.username ?? "usuario"}</h1>
                {isPubliclyVerified(profile) ? <VerifiedBadge label tone={getVerificationTone(profile)} /> : null}
              </div>
              {profile.username ? (
                <Link href={`/u/${profile.username}`} className="app-button-secondary">
                  Ver perfil público
                </Link>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-5 text-sm">
              <span>
                <strong className="text-slate-950">{profile._count.posts}</strong> publicaciones
              </span>
              <Link href="/profile/followers" className="transition hover:text-slate-950">
                <strong className="text-slate-950">{profile._count.followers}</strong> seguidores
              </Link>
              <span>
                <strong className="text-slate-950">{profile._count.following}</strong> siguiendo
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {profile.name ? <p className="font-semibold text-slate-950">{profile.name}</p> : null}
              <p className="text-sm leading-6 text-slate-600">{profile.bio ?? "Todavía no has añadido una biografía."}</p>
              <div className="flex flex-wrap gap-2">
                <span className="app-pill">Rol: {profile.role}</span>
                {profile.city ? (
                  <span className="app-pill">
                    <MapPin className="mr-2 h-4 w-4" />
                    {profile.city}
                  </span>
                ) : null}
                {profile.venueRequest ? <span className="app-pill">Solicitud local: {profile.venueRequest.status}</span> : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/profile/followers" className="app-card p-5 transition hover:-translate-y-0.5">
          <Users className="h-5 w-5 text-slate-500" />
          <p className="mt-4 text-2xl font-semibold text-slate-950">{profile._count.followers}</p>
          <p className="mt-1 text-sm text-slate-500">seguidores</p>
        </Link>
        <div className="app-card p-5">
          <UserPlus className="h-5 w-5 text-slate-500" />
          <p className="mt-4 text-2xl font-semibold text-slate-950">{profile._count.following}</p>
          <p className="mt-1 text-sm text-slate-500">siguiendo</p>
        </div>
        <div className="app-card p-5">
          <Store className="h-5 w-5 text-slate-500" />
          <p className="mt-4 text-2xl font-semibold text-slate-950">{profile._count.events}</p>
          <p className="mt-1 text-sm text-slate-500">eventos</p>
        </div>
        <div className="app-card p-5">
          <Grid3X3 className="h-5 w-5 text-slate-500" />
          <p className="mt-4 text-2xl font-semibold text-slate-950">{profile._count.posts}</p>
          <p className="mt-1 text-sm text-slate-500">posts</p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((item) => {
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href} className="app-card flex items-center justify-between gap-3 p-5 transition hover:-translate-y-0.5">
              <div>
                <p className="text-base font-semibold text-slate-950">{item.label}</p>
                <p className="mt-1 text-sm text-slate-500">Acceso rápido desde tu perfil privado.</p>
              </div>
              <Icon className="h-6 w-6 text-slate-500" />
            </Link>
          );
        })}
      </section>

      <section className="space-y-3">
        <details open className="app-card overflow-hidden">
          <summary className="cursor-pointer list-none px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-950">Editar perfil</p>
                <p className="mt-1 text-sm text-slate-500">Nombre, username, foto, bio y ubicación.</p>
              </div>
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Perfil</span>
            </div>
          </summary>
          <div className="border-t border-neutral-200 p-4">
            <ProfileForm
              defaults={{
                name: profile.name,
                username: profile.username,
                bio: profile.bio,
                city: profile.city,
                latitude: isVenueProfile ? profile.venueRequest?.latitude : profile.latitude,
                longitude: isVenueProfile ? profile.venueRequest?.longitude : profile.longitude,
                locationAddress: profile.venueRequest?.address,
                shareLocation: profile.shareLocation,
                locationSharingMode: profile.locationSharingMode,
              }}
              usernameChangesRemaining={usernameChangesRemaining}
              isVenue={isVenueProfile}
            />
          </div>
        </details>

        <details className="app-card overflow-hidden">
          <summary className="cursor-pointer list-none px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-950">Contenido</p>
                <p className="mt-1 text-sm text-slate-500">Sube historias y gestiona las que siguen activas.</p>
              </div>
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Historias</span>
            </div>
          </summary>
          <div className="grid gap-4 border-t border-neutral-200 p-4 lg:grid-cols-[0.95fr_1.05fr]">
            <StoryForm />
            <div className="app-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Tus historias activas</h2>
                  <p className="mt-1 text-sm text-slate-500">Puedes borrarlas en cualquier momento.</p>
                </div>
                <span className="app-pill">{profile.stories.length}</span>
              </div>

              {profile.stories.length > 0 ? (
                <div className="mt-4 flex gap-4 overflow-x-auto pb-1">
                  {profile.stories.map((story) => {
                    const views = storyViewSummaries.get(story.id) ?? { count: 0, viewers: [] };

                    return (
                      <div key={story.id} className="min-w-[104px] max-w-[104px] text-center sm:min-w-[116px] sm:max-w-[116px]">
                        <Link href={`/stories/${story.id}?from=profile-private`} className="block">
                          <div className="app-story-ring rounded-[28px] p-[2px]">
                            <div className="aspect-[9/16] overflow-hidden rounded-[26px] bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={story.imageUrl} alt={story.caption ?? "Historia"} className="h-full w-full object-cover" />
                            </div>
                          </div>
                        </Link>
                        <p className="mt-2 line-clamp-2 text-xs text-slate-500">{story.caption ?? "Historia"}</p>
                        <p className="mt-1 text-[11px] font-medium text-slate-400">{views.count} vista{views.count === 1 ? "" : "s"}</p>
                        <div className="mt-2 flex justify-center">
                          <StoryDeleteButton storyId={story.id} isHighlighted={highlightedStoryIds.includes(story.id)} viewCount={views.count} viewers={views.viewers} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No tienes historias activas ahora mismo.</p>
              )}
            </div>
          </div>
        </details>

        {highlightedStories.length > 0 ? (
          <section className="app-card border-t border-neutral-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-950">Historias destacadas</p>
                <p className="mt-1 text-sm text-slate-500">Se quedan visibles en tu perfil aunque pasen las 24 horas.</p>
              </div>
              <span className="app-pill">{highlightedStories.length}</span>
            </div>
            <div className="mt-4 flex gap-4 overflow-x-auto pb-1">
              {highlightedStories.map((story) => (
                <Link key={story.id} href={`/stories/${story.id}?from=profile-private`} className="block min-w-[108px] max-w-[108px] sm:min-w-[124px] sm:max-w-[124px]">
                  <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-neutral-50">
                    <div className="aspect-[9/16] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={story.imageUrl} alt={story.caption ?? "Historia destacada"} className="h-full w-full object-cover" />
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 text-xs text-slate-600">{story.caption ?? "Historia destacada"}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <details className="app-card overflow-hidden">
          <summary className="cursor-pointer list-none px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-950">Seguridad</p>
                <p className="mt-1 text-sm text-slate-500">Cambio de contraseña y control de sesión.</p>
              </div>
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Cuenta</span>
            </div>
          </summary>
          <div className="grid gap-4 border-t border-neutral-200 p-4 lg:grid-cols-[1fr_auto]">
            <PasswordResetRequestForm emailConfigured={emailConfigured} />
            <div className="app-card p-5 sm:min-w-[240px]">
              <p className="text-sm font-semibold text-slate-950">Sesión</p>
              <p className="mt-2 text-sm text-slate-500">Cierra sesión desde aquí cuando uses la app en tu móvil o en un equipo compartido.</p>
              <div className="mt-4">
                <LogoutButton />
              </div>
            </div>
          </div>
        </details>
      </section>

      {profile.followers.length > 0 ? (
        <section className="app-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-950">Seguidores recientes</h2>
            <Link href="/profile/followers" className="text-sm font-medium text-sky-600">
              Ver todos
            </Link>
          </div>
          <div className="mt-4 grid gap-3">
            {profile.followers.map(({ follower }) => (
              <Link
                key={follower.id}
                href={`/u/${follower.username ?? ""}`}
                className="flex items-center gap-3 rounded-2xl bg-neutral-50 p-3 transition hover:bg-neutral-100"
              >
                <UserAvatar user={follower} className="h-11 w-11 bg-neutral-100" textClassName="text-sm" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-slate-950">@{follower.username ?? "usuario"}</p>
                    {isPubliclyVerified(follower) ? <VerifiedBadge tone={getVerificationTone(follower)} /> : null}
                  </div>
                  {follower.name ? <p className="truncate text-xs text-slate-500">{follower.name}</p> : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {isVenueProfile && profile.events.length > 0 ? (
        <section className="app-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Anuncios del local</h2>
              <p className="mt-1 text-sm text-slate-500">Estos eventos publicados también se muestran en tu perfil público.</p>
            </div>
            <span className="app-pill">{profile.events.length}</span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {profile.events.map((event) => (
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

      <section className="border-t border-neutral-200 pt-4">
        <div className="mb-4 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          <Grid3X3 className="h-4 w-4" />
          Publicaciones
        </div>

        <div className="grid grid-cols-3 gap-1 sm:gap-3">
          {profile.posts.map((post) => {
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

          {profile.posts.length === 0 ? (
            <div className="col-span-3 app-card p-5 text-center text-sm text-slate-500">Aún no has publicado nada.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
