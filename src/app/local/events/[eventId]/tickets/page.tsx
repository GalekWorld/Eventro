import Link from "next/link";
import { notFound } from "next/navigation";
import { Beer, CalendarDays, CheckCircle2, DoorOpen, Ticket, UsersRound } from "lucide-react";
import { DoorStaffForm } from "@/components/forms/door-staff-form";
import { getVenueEventById } from "@/features/events/event.service";
import { removeDoorStaffAction } from "@/app/actions/local";
import { requireRole } from "@/lib/permissions";
import { formatEventDate, formatPrice } from "@/lib/utils";

export default async function LocalEventTicketsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const venue = await requireRole(["VENUE"]);
  const event = await getVenueEventById(eventId, venue.id);

  if (!event) notFound();

  return (
    <div className="mx-auto max-w-[935px] space-y-4">
      <section className="app-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="app-screen-title">Control de entradas</h1>
            <p className="mt-2 app-screen-subtitle">{event.title}</p>
          </div>
          <Link href="/local/dashboard" className="app-button-secondary">
            Volver al panel
          </Link>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <section className="app-card p-5">
            <h2 className="text-lg font-semibold text-slate-950">Resumen</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-sm text-slate-500">Vendidas</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{event.ticketsSold}</p>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-sm text-slate-500">Validadas</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {event.tickets.filter((ticket) => ticket.status === "USED").length}
                </p>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-sm text-slate-500">Proximo inicio</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{formatEventDate(event.date)}</p>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-sm text-slate-500">Consumiciones gastadas</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {event.tickets.reduce((total, ticket) => total + ticket.consumedDrinks, 0)}
                </p>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-sm text-slate-500">Accesos registrados</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{event.ticketAccessLogs.length}</p>
              </div>
            </div>
          </section>

          <DoorStaffForm eventId={event.id} />

          <section className="app-card p-5">
            <div className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-slate-500" />
              <h2 className="text-lg font-semibold text-slate-950">Porteros con acceso</h2>
            </div>
            <p className="mt-2 text-sm text-slate-500">Solo ellos y los admins podran escanear entradas de este evento.</p>

            <div className="mt-4 grid gap-3">
              {event.doorStaff.map((assignment) => (
                <article key={assignment.id} className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">@{assignment.staffUser.username ?? "usuario"}</p>
                      <p className="mt-1 text-sm text-slate-500">{assignment.staffUser.name ?? "Sin nombre visible"}</p>
                    </div>
                    <form action={removeDoorStaffAction}>
                      <input type="hidden" name="assignmentId" value={assignment.id} />
                      <input type="hidden" name="eventId" value={event.id} />
                      <button type="submit" className="app-button-secondary">
                        Quitar acceso
                      </button>
                    </form>
                  </div>
                </article>
              ))}

              {event.doorStaff.length === 0 ? (
            <p className="text-sm text-slate-500">Todavía no has asignado porteros a este evento.</p>
              ) : null}
            </div>

            <div className="mt-4">
              <Link href={`/scanner/${event.id}`} className="app-button-primary w-full text-center">
                Ir a la vista de escaneo
              </Link>
            </div>
          </section>
        </div>

        <section className="app-card p-5">
          <h2 className="text-lg font-semibold text-slate-950">Compras recientes</h2>
          <div className="mt-4 grid gap-3">
            {event.purchases.map((purchase) => (
              <article key={purchase.id} className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      @{purchase.buyer.username ?? purchase.buyer.name ?? "usuario"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{purchase.ticketType.name}</p>
                  </div>
                  <span className="app-pill">
                    {purchase.quantity} · {purchase.totalAmount == null ? "Gratis" : formatPrice(Number(purchase.totalAmount))}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  {purchase.tickets.map((ticket) => (
                    <span key={ticket.id} className="app-pill">
                      {ticket.qrCode} · {ticket.status === "USED" ? "usada" : "activa"} · {ticket.consumedDrinks}/
                      {purchase.ticketType.includedDrinks} consumiciones
                    </span>
                  ))}
                </div>
              </article>
            ))}

            {event.purchases.length === 0 ? (
                <p className="text-sm text-slate-500">Aún no se han vendido entradas para este evento.</p>
            ) : null}
          </div>

          <div className="mt-5 border-t border-neutral-200 pt-5">
            <h3 className="text-base font-semibold text-slate-950">Tipos de entrada</h3>
            <div className="mt-3 grid gap-3">
              {event.ticketTypes.map((ticketType) => (
                <div key={ticketType.id} className="rounded-2xl bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">{ticketType.name}</p>
                    <span className="app-pill">
                      {ticketType.soldCount}/{ticketType.capacity}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="app-pill">
                      <Ticket className="mr-1 h-3.5 w-3.5" />
                      {ticketType.price == null ? "Gratis" : formatPrice(Number(ticketType.price))}
                    </span>
                    <span className="app-pill">{ticketType.includedDrinks} consumiciones</span>
                    {ticketType.salesStart ? (
                      <span className="app-pill">
                        <CalendarDays className="mr-1 h-3.5 w-3.5" />
                        {formatEventDate(ticketType.salesStart)}
                      </span>
                    ) : null}
                    {ticketType.soldCount > 0 ? (
                      <span className="app-pill">
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        En circulacion
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="app-card p-5">
        <div className="flex items-center gap-2">
          <DoorOpen className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-950">Historial de accesos en puerta</h2>
        </div>
        <div className="mt-4 grid gap-3">
          {event.ticketAccessLogs.map((log) => (
            <article key={log.id} className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    @{log.ticket.buyer.username ?? log.ticket.buyer.name ?? "usuario"} · {log.ticket.ticketType.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{log.ticket.qrCode}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {log.action === "VALIDATED" ? "Entrada validada" : "Consumición descontada"} por @
                    {log.actor.username ?? log.actor.name ?? "staff"} · {formatEventDate(log.createdAt)}
                  </p>
                </div>
                <span className="app-pill">
                  {log.action === "VALIDATED" ? (
                    <>
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Acceso OK
                    </>
                  ) : (
                    <>
                      <Beer className="mr-1 h-3.5 w-3.5" />
                      {log.remainingDrinks} restantes
                    </>
                  )}
                </span>
              </div>
            </article>
          ))}

          {event.ticketAccessLogs.length === 0 ? (
                <p className="text-sm text-slate-500">Todavía no hay accesos o consumiciones registradas en puerta.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

