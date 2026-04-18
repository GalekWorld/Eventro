import Link from "next/link";
import { requireAuth } from "@/lib/permissions";
import { db } from "@/lib/db";
import { markNotificationsReadAction } from "@/app/actions/social";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { PaginationControls } from "@/components/pagination-controls";
import { BrowserNotificationToggle } from "@/components/browser-notification-toggle";
import { PushNotificationToggle } from "@/components/push-notification-toggle";
import { UserAvatar } from "@/components/user-avatar";

type SearchParams = Promise<{ page?: string }>;

const NOTIFICATIONS_PER_PAGE = 20;

function parsePage(value?: string) {
  const page = Number(value ?? "1");
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default async function NotificationsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireAuth();
  const params = await searchParams;
  const page = parsePage(params.page);

  const [notificationCount, notifications] = await Promise.all([
    db.notification.count({
      where: { recipientId: user.id },
    }),
    db.notification.findMany({
      where: { recipientId: user.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * NOTIFICATIONS_PER_PAGE,
        take: NOTIFICATIONS_PER_PAGE,
        include: {
          actor: {
            select: {
              avatarUrl: true,
              username: true,
              name: true,
            },
          },
        },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(notificationCount / NOTIFICATIONS_PER_PAGE));

  return (
    <div className="mx-auto max-w-[935px] space-y-4">
      <RealtimeRefresh topics={[`user:${user.id}`]} fallbackIntervalMs={10000} />

      <section className="app-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="app-screen-title">Notificaciones</h1>
            <p className="mt-2 app-screen-subtitle">Toda la actividad reciente de follows, likes, comentarios, grupos y mensajes.</p>
          </div>
          <form action={markNotificationsReadAction}>
            <button className="app-button-secondary w-full sm:w-auto" type="submit">
              Marcar leídas
            </button>
          </form>
        </div>
        <div className="mt-3">
          <BrowserNotificationToggle />
        </div>
        <div className="mt-3">
          <PushNotificationToggle />
        </div>
      </section>

      <section className="grid gap-3">
        {notifications.map((notification) => (
          <article
            key={notification.id}
            className={`app-card p-4 transition sm:p-5 ${notification.readAt ? "bg-white" : "border-sky-200 bg-sky-50/60"}`}
          >
            <div className="flex items-start gap-3">
              <div className="app-story-ring rounded-full p-[2px]">
                <UserAvatar
                  user={notification.actor ?? { name: "Sistema" }}
                  className="h-12 w-12 bg-neutral-100"
                  textClassName="text-sm"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">{notification.title}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {notification.actor?.username ? `@${notification.actor.username}` : notification.actor?.name ?? "Sistema"}
                    </p>
                  </div>
                  {!notification.readAt ? <span className="app-pill bg-sky-100 text-sky-700">Nueva</span> : null}
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-600">{notification.body ?? "Sin detalles."}</p>

                {notification.link ? (
                  <Link href={notification.link} className="mt-4 inline-flex text-sm font-semibold text-sky-500 hover:text-sky-600">
                    Abrir
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        ))}

        {notifications.length === 0 ? <div className="app-card p-5 text-sm text-slate-500">Todavía no tienes notificaciones.</div> : null}
      </section>

      <PaginationControls pathname="/notifications" currentPage={page} totalPages={totalPages} />
    </div>
  );
}
