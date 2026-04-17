import Link from "next/link";
import { BadgeCheck, CreditCard, Flag, Search, ShieldCheck, Store, Trash2 } from "lucide-react";
import { requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { reviewVenueRequestAction } from "@/app/actions/venue";
import { deleteEventAction, featureAdminEventAction } from "@/app/actions/local";
import {
  deleteDirectMessageAction,
  deleteEventChatMessageAction,
  deleteGroupMessageAction,
  deletePostAction,
  deletePostCommentAction,
  resolveUserReportAction,
  suspendUserAction,
  unsuspendUserAction,
} from "@/app/actions/social";
import { getPlatformPaymentReport } from "@/lib/payment-reporting";
import { formatEventDate, formatPrice } from "@/lib/utils";

type SearchParams = Promise<{ status?: string; q?: string; kind?: string }>;

function formatAuditAction(action: string) {
  return action
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function matchesQuery(values: Array<string | null | undefined>, query: string) {
  if (!query) return true;
  const normalized = query.toLowerCase();
  return values.some((value) => String(value ?? "").toLowerCase().includes(normalized));
}

function getReportKind(report: {
  reportedUserId: string | null;
  postId: string | null;
  postCommentId: string | null;
  groupMessageId: string | null;
  eventChatMessageId: string | null;
  directMessageId: string | null;
}) {
  if (report.reportedUserId) return "user";
  if (report.postId) return "post";
  if (report.postCommentId) return "comment";
  if (report.groupMessageId) return "group";
  if (report.eventChatMessageId) return "event";
  if (report.directMessageId) return "direct";
  return "other";
}

function getReportTargetLabel(report: {
  reportedUser?: { username: string | null; name: string | null } | null;
  post?: { author: { username: string | null; name: string | null } } | null;
  postComment?: { author: { username: string | null; name: string | null } } | null;
  groupMessage?: { author: { username: string | null; name: string | null } } | null;
  eventChatMessage?: { author: { username: string | null; name: string | null } } | null;
  directMessage?: { sender: { username: string | null; name: string | null } } | null;
}) {
  if (report.reportedUser) {
    return `Usuario: @${report.reportedUser.username ?? report.reportedUser.name ?? "usuario"}`;
  }
  if (report.post) {
    return `Post de @${report.post.author.username ?? report.post.author.name ?? "usuario"}`;
  }
  if (report.postComment) {
    return `Comentario de @${report.postComment.author.username ?? report.postComment.author.name ?? "usuario"}`;
  }
  if (report.groupMessage) {
    return `Mensaje de grupo de @${report.groupMessage.author.username ?? report.groupMessage.author.name ?? "usuario"}`;
  }
  if (report.eventChatMessage) {
    return `Mensaje de evento de @${report.eventChatMessage.author.username ?? report.eventChatMessage.author.name ?? "usuario"}`;
  }
  if (report.directMessage) {
    return `Mensaje privado de @${report.directMessage.sender.username ?? report.directMessage.sender.name ?? "usuario"}`;
  }
  return "Incidencia general";
}

function ReportFilters({ status, q, kind }: { status: string; q: string; kind: string }) {
  return (
    <form className="grid gap-3 md:grid-cols-[180px_180px_minmax(0,1fr)_auto]">
      <select name="status" defaultValue={status} className="app-input">
        <option value="all">Todos los estados</option>
        <option value="open">Abiertos</option>
        <option value="resolved">Resueltos</option>
        <option value="dismissed">Descartados</option>
      </select>
      <select name="kind" defaultValue={kind} className="app-input">
        <option value="all">Todos los tipos</option>
        <option value="user">Usuario</option>
        <option value="post">Post</option>
        <option value="comment">Comentario</option>
        <option value="group">Grupo</option>
        <option value="event">Chat de evento</option>
        <option value="direct">Privado</option>
      </select>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input name="q" defaultValue={q} className="app-input pl-10" placeholder="Buscar por usuario, motivo o contenido" />
      </div>
      <button type="submit" className="app-button-primary">
        Filtrar
      </button>
    </form>
  );
}

export default async function AdminVenueRequestsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ADMIN"]);
  const params = await searchParams;
  const statusFilter = String(params.status ?? "all").toUpperCase();
  const query = String(params.q ?? "").trim();
  const kindFilter = String(params.kind ?? "all").toLowerCase();

  const [requests, events, reports, auditLogs, platformPayments, securityEvents, suspendedUsersCount, featuredLogs] = await Promise.all([
    prisma.venueRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    }).catch(() => []),
    prisma.event.findMany({
      where: { published: true },
      orderBy: { date: "asc" },
      take: 20,
      include: { owner: { select: { id: true, username: true, name: true } } },
    }).catch(() => []),
    prisma.userReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        reporter: { select: { id: true, username: true, name: true } },
        resolvedBy: { select: { username: true, name: true } },
        reportedUser: { select: { id: true, username: true, name: true, suspendedAt: true, suspensionReason: true } },
        post: { select: { id: true, content: true, author: { select: { username: true, name: true } } } },
        postComment: { select: { id: true, body: true, author: { select: { username: true, name: true } } } },
        groupMessage: { select: { id: true, body: true, groupId: true, author: { select: { username: true, name: true } } } },
        eventChatMessage: { select: { id: true, body: true, eventId: true, author: { select: { username: true, name: true } } } },
        directMessage: { select: { id: true, body: true, conversationId: true, sender: { select: { username: true, name: true } } } },
      },
    }).catch(() => []),
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { admin: { select: { username: true, name: true } } },
    }).catch(() => []),
    getPlatformPaymentReport(),
    prisma.securityEvent.findMany({
      where: {
        type: {
          not: "story_view",
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { username: true, name: true } } },
    }).catch(() => []),
    prisma.user.count({ where: { suspendedAt: { not: null } } }).catch(() => 0),
    prisma.adminAuditLog.findMany({
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
    }).catch(() => []),
  ]);

  const featuredState = new Map<string, boolean>();
  for (const log of featuredLogs) {
    if (!featuredState.has(log.targetId)) {
      featuredState.set(log.targetId, log.action === "feature_event");
    }
  }
  const featuredEventsCount = events.filter((event) => featuredState.get(event.id)).length;
  const sortedEvents = [...events].sort((a, b) => {
    const aFeatured = featuredState.get(a.id) ? 1 : 0;
    const bFeatured = featuredState.get(b.id) ? 1 : 0;
    if (aFeatured !== bFeatured) return bFeatured - aFeatured;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const openReportsCount = reports.filter((report) => report.status === "OPEN").length;
  const resolvedReportsCount = reports.filter((report) => report.status === "RESOLVED").length;
  const filteredReports = [...reports]
    .sort((a, b) => {
      if (a.status === "OPEN" && b.status !== "OPEN") return -1;
      if (a.status !== "OPEN" && b.status === "OPEN") return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .filter((report) => {
      const kind = getReportKind(report);
      const matchesStatus = statusFilter === "ALL" ? true : report.status === statusFilter;
      const matchesKind = kindFilter === "all" ? true : kind === kindFilter;
      const matchesText = matchesQuery(
        [
          report.reason,
          report.reporter.username,
          report.reporter.name,
          report.reportedUser?.username,
          report.reportedUser?.name,
          report.post?.content,
          report.postComment?.body,
          report.groupMessage?.body,
          report.eventChatMessage?.body,
          report.directMessage?.body,
        ],
        query,
      );
      return matchesStatus && matchesKind && matchesText;
    });

  return (
    <div className="mx-auto max-w-[1120px] space-y-4">
      <section className="app-card p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="app-pill">Panel de administración</span>
            <h1 className="mt-4 text-3xl font-bold text-slate-950">Negocio, moderación y seguridad</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              Desde aquí puedes revisar locales, retirar anuncios, gestionar incidencias y seguir el rastro de las acciones sensibles.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
              <Store className="h-5 w-5 text-slate-600" />
              <p className="mt-4 text-2xl font-semibold text-slate-950">{requests.length}</p>
              <p className="mt-1 text-sm text-slate-500">solicitudes</p>
            </div>
            <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
              <ShieldCheck className="h-5 w-5 text-slate-600" />
              <p className="mt-4 text-2xl font-semibold text-slate-950">{requests.filter((request) => request.status === "PENDING").length}</p>
              <p className="mt-1 text-sm text-slate-500">pendientes</p>
            </div>
            <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
              <BadgeCheck className="h-5 w-5 text-slate-600" />
              <p className="mt-4 text-2xl font-semibold text-slate-950">{events.length}</p>
              <p className="mt-1 text-sm text-slate-500">anuncios</p>
            </div>
            <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
              <Flag className="h-5 w-5 text-slate-600" />
              <p className="mt-4 text-2xl font-semibold text-slate-950">{openReportsCount}</p>
              <p className="mt-1 text-sm text-slate-500">reportes abiertos</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="app-card p-4">
          <Flag className="h-5 w-5 text-slate-600" />
          <p className="mt-4 text-2xl font-semibold text-slate-950">{reports.length}</p>
          <p className="mt-1 text-sm text-slate-500">reportes totales</p>
        </div>
        <div className="app-card p-4">
          <ShieldCheck className="h-5 w-5 text-slate-600" />
          <p className="mt-4 text-2xl font-semibold text-slate-950">{resolvedReportsCount}</p>
          <p className="mt-1 text-sm text-slate-500">reportes resueltos</p>
        </div>
        <div className="app-card p-4">
          <ShieldCheck className="h-5 w-5 text-slate-600" />
          <p className="mt-4 text-2xl font-semibold text-slate-950">{suspendedUsersCount}</p>
          <p className="mt-1 text-sm text-slate-500">usuarios suspendidos</p>
        </div>
        <div className="app-card p-4">
          <ShieldCheck className="h-5 w-5 text-slate-600" />
          <p className="mt-4 text-2xl font-semibold text-slate-950">{securityEvents.length}</p>
          <p className="mt-1 text-sm text-slate-500">eventos de seguridad</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <section className="app-card p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Solicitudes de local</h2>
                <p className="mt-1 text-sm text-slate-500">Aprueba, rechaza o veta negocios desde el mismo panel.</p>
              </div>
              <span className="app-pill">{requests.length}</span>
            </div>

            <div className="mt-4 grid gap-3">
              {requests.map((request) => (
                <article key={request.id} className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex flex-col gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-950">{request.businessName}</h3>
                        <span className="app-pill">{request.status}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        {request.user.email} · {request.city} · rol actual {request.user.role}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        {request.description ?? "Este negocio todavía no ha añadido una descripción."}
                      </p>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                      <form action={reviewVenueRequestAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                        <input type="hidden" name="requestId" value={request.id} />
                        <input name="rejectionReason" className="app-input" placeholder="Motivo si rechazas o vetas" defaultValue={request.rejectionReason ?? ""} />
                        <button className="app-button-secondary w-full" type="submit" name="decision" value="reject">
                          Rechazar
                        </button>
                        <button className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100" type="submit" name="decision" value="ban">
                          Vetar local
                        </button>
                      </form>

                      <form action={reviewVenueRequestAction}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="decision" value="approve" />
                        <button className="app-button-primary w-full" type="submit">
                          Aprobar local
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              ))}

              {requests.length === 0 ? <div className="rounded-3xl border border-dashed border-neutral-200 p-5 text-sm text-slate-500">No hay solicitudes pendientes ahora mismo.</div> : null}
            </div>
          </section>

          <section className="app-card p-5">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Centro de incidencias</h2>
                  <p className="mt-1 text-sm text-slate-500">Filtra, revisa y resuelve reportes sin salir del panel.</p>
                </div>
                <span className="app-pill">{filteredReports.length}</span>
              </div>

              <ReportFilters status={statusFilter.toLowerCase()} q={query} kind={kindFilter} />
            </div>

            <div className="mt-4 grid gap-3">
              {filteredReports.map((report) => (
                <article key={report.id} className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-950">Reportado por @{report.reporter.username ?? report.reporter.name ?? "usuario"}</p>
                    <span
                      className={`app-pill ${
                        report.status === "OPEN"
                          ? "bg-amber-50 text-amber-700"
                          : report.status === "RESOLVED"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-neutral-100 text-slate-600"
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-700">{report.reason}</p>
                  <p className="mt-2 text-xs text-slate-500">{getReportTargetLabel(report)}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {new Date(report.createdAt).toLocaleString("es-ES")}
                    {report.resolvedBy ? ` · revisado por @${report.resolvedBy.username ?? report.resolvedBy.name ?? "admin"}` : ""}
                  </p>
                  {report.adminNotes ? <p className="mt-2 text-xs text-slate-500">Notas: {report.adminNotes}</p> : null}

                  {report.post?.content ? <p className="mt-3 text-sm text-slate-600">{report.post.content}</p> : null}
                  {report.postComment?.body ? <p className="mt-3 text-sm text-slate-600">{report.postComment.body}</p> : null}
                  {report.groupMessage?.body ? <p className="mt-3 text-sm text-slate-600">{report.groupMessage.body}</p> : null}
                  {report.eventChatMessage?.body ? <p className="mt-3 text-sm text-slate-600">{report.eventChatMessage.body}</p> : null}
                  {report.directMessage?.body ? <p className="mt-3 text-sm text-slate-600">{report.directMessage.body}</p> : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {report.reportedUser?.username ? (
                      <Link href={`/u/${report.reportedUser.username}`} className="app-button-secondary">
                        Ver perfil
                      </Link>
                    ) : null}
                    {report.postId ? (
                      <form action={deletePostAction}>
                        <input type="hidden" name="postId" value={report.postId} />
                        <input type="hidden" name="redirectPath" value="/admin/venue-requests" />
                        <button className="app-button-secondary" type="submit">
                          Ocultar post
                        </button>
                      </form>
                    ) : null}
                    {report.postCommentId ? (
                      <form action={deletePostCommentAction}>
                        <input type="hidden" name="commentId" value={report.postCommentId} />
                        <input type="hidden" name="redirectPath" value="/admin/venue-requests" />
                        <button className="app-button-secondary" type="submit">
                          Ocultar comentario
                        </button>
                      </form>
                    ) : null}
                    {report.groupMessageId ? (
                      <form action={deleteGroupMessageAction}>
                        <input type="hidden" name="messageId" value={report.groupMessageId} />
                        <button className="app-button-secondary" type="submit">
                          Ocultar mensaje
                        </button>
                      </form>
                    ) : null}
                    {report.eventChatMessageId ? (
                      <form action={deleteEventChatMessageAction}>
                        <input type="hidden" name="messageId" value={report.eventChatMessageId} />
                        <button className="app-button-secondary" type="submit">
                          Ocultar chat evento
                        </button>
                      </form>
                    ) : null}
                    {report.directMessageId ? (
                      <form action={deleteDirectMessageAction}>
                        <input type="hidden" name="messageId" value={report.directMessageId} />
                        <button className="app-button-secondary" type="submit">
                          Ocultar privado
                        </button>
                      </form>
                    ) : null}
                    {report.reportedUserId ? (
                      report.reportedUser?.suspendedAt ? (
                        <form action={unsuspendUserAction}>
                          <input type="hidden" name="userId" value={report.reportedUserId} />
                          <button className="app-button-secondary" type="submit">
                            Levantar suspensión
                          </button>
                        </form>
                      ) : (
                        <form action={suspendUserAction}>
                          <input type="hidden" name="userId" value={report.reportedUserId} />
                          <input type="hidden" name="reason" value={report.reason || "Suspensión aplicada desde moderación."} />
                          <button className="app-button-secondary" type="submit">
                            Suspender usuario
                          </button>
                        </form>
                      )
                    ) : null}
                  </div>

                  {report.status === "OPEN" ? (
                    <form action={resolveUserReportAction} className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                      <input type="hidden" name="reportId" value={report.id} />
                      <input name="adminNotes" className="app-input" placeholder="Notas internas para moderación" />
                      <button className="app-button-secondary" type="submit" name="decision" value="resolve">
                        Resolver
                      </button>
                      <button className="app-button-secondary" type="submit" name="decision" value="dismiss">
                        Descartar
                      </button>
                    </form>
                  ) : null}
                </article>
              ))}

              {filteredReports.length === 0 ? <p className="text-sm text-slate-500">No hay incidencias con ese filtro.</p> : null}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="app-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Anuncios publicados</h2>
                <p className="mt-1 text-sm text-slate-500">Gestiona qué eventos se destacan en home y retira anuncios si hace falta intervenir rápido.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="app-pill">{events.length} anuncios</span>
                <span className="app-pill">{featuredEventsCount} destacados</span>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {sortedEvents.map((event) => (
                <article key={event.id} className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex flex-col gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-950">{event.title}</p>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {event.owner.username ? `@${event.owner.username}` : event.owner.name ?? "local"} · {event.city}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        {formatEventDate(event.date)} · {event.price == null ? "Gratis" : formatPrice(Number(event.price))}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <form action={featureAdminEventAction}>
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="mode" value={featuredState.get(event.id) ? "off" : "on"} />
                        <button className="app-button-secondary" type="submit">
                          {featuredState.get(event.id) ? "Quitar destacado" : "Destacar"}
                        </button>
                      </form>
                      <form action={deleteEventAction}>
                        <input type="hidden" name="eventId" value={event.id} />
                        <button className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100" type="submit">
                          <Trash2 className="h-4 w-4" />
                          Borrar anuncio
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              ))}

              {events.length === 0 ? <p className="text-sm text-slate-500">No hay anuncios publicados ahora mismo.</p> : null}
            </div>
          </section>

          <section className="app-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Ingresos de plataforma</h2>
                <p className="mt-1 text-sm text-slate-500">Resumen de comisión, gestión y total retenido.</p>
              </div>
              <CreditCard className="h-5 w-5 text-slate-500" />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Ventas brutas</p>
                <p className="mt-3 text-2xl font-semibold text-slate-950">{formatPrice(platformPayments.summary.grossSales) ?? "0 EUR"}</p>
              </div>
              <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">4% plataforma</p>
                <p className="mt-3 text-2xl font-semibold text-slate-950">{formatPrice(platformPayments.summary.revenueShare) ?? "0 EUR"}</p>
              </div>
              <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Gestión comprador</p>
                <p className="mt-3 text-2xl font-semibold text-slate-950">{formatPrice(platformPayments.summary.managementFees) ?? "0 EUR"}</p>
              </div>
              <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Retenido total</p>
                <p className="mt-3 text-2xl font-semibold text-slate-950">{formatPrice(platformPayments.summary.applicationFees) ?? "0 EUR"}</p>
              </div>
            </div>
          </section>

          <section className="app-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Seguridad reciente</h2>
                <p className="mt-1 text-sm text-slate-500">Rate limits, uploads rechazados y otros eventos relevantes.</p>
              </div>
              <span className="app-pill">{securityEvents.length}</span>
            </div>

            <div className="mt-4 grid gap-3">
              {securityEvents.map((event) => (
                <article key={event.id} className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-950">{event.type}</p>
                    <span
                      className={`app-pill ${
                        event.level === "CRITICAL"
                          ? "bg-red-50 text-red-700"
                          : event.level === "WARN"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-neutral-100 text-slate-600"
                      }`}
                    >
                      {event.level}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{event.message}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {event.user ? `@${event.user.username ?? event.user.name ?? "usuario"} · ` : ""}
                    {new Date(event.createdAt).toLocaleString("es-ES")}
                  </p>
                  {event.metadata ? <p className="mt-2 break-words text-xs text-slate-500">{event.metadata}</p> : null}
                </article>
              ))}
              {securityEvents.length === 0 ? <p className="text-sm text-slate-500">No hay eventos de seguridad recientes.</p> : null}
            </div>
          </section>

          <section className="app-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Auditoría admin</h2>
                <p className="mt-1 text-sm text-slate-500">Acciones sensibles realizadas por administradores.</p>
              </div>
              <span className="app-pill">{auditLogs.length}</span>
            </div>

            <div className="mt-4 grid gap-3">
              {auditLogs.map((log) => (
                <article key={log.id} className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-sm font-semibold text-slate-950">{formatAuditAction(log.action)}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    @{log.admin.username ?? log.admin.name ?? "admin"} · {log.targetType} · {log.targetId}
                  </p>
                  {log.details ? <p className="mt-2 text-sm text-slate-600">{log.details}</p> : null}
                  <p className="mt-3 text-xs text-slate-400">{new Date(log.createdAt).toLocaleString("es-ES")}</p>
                </article>
              ))}
              {auditLogs.length === 0 ? <p className="text-sm text-slate-500">Todavía no hay entradas de auditoría.</p> : null}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
