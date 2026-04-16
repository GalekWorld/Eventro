import Link from "next/link";
import { PaymentCheckoutStatus } from "@prisma/client";
import { AlertCircle, CalendarClock, CheckCircle2, Clock3, QrCode, Ticket, XCircle } from "lucide-react";
import { listPendingPaymentCheckoutsForBuyer, listUserTickets } from "@/features/events/event.service";
import { getEventPath } from "@/lib/event-path";
import { requireAuth } from "@/lib/permissions";
import { formatEventDate, formatPrice } from "@/lib/utils";

type SearchParams = Promise<{
  checkout?: string;
}>;

function getCheckoutCopy(status: PaymentCheckoutStatus) {
  if (status === "PROCESSING") {
    return {
      icon: <Clock3 className="h-4 w-4 text-violet-500" />,
      label: "Pago procesándose",
      tone: "bg-violet-50 text-violet-700",
      description: "Stripe ha recibido el pago, pero aún no lo ha confirmado del todo. Emitiremos las entradas cuando quede cerrado.",
    };
  }

  if (status === "FAILED") {
    return {
      icon: <XCircle className="h-4 w-4 text-red-500" />,
      label: "Pago fallido",
      tone: "bg-red-50 text-red-700",
      description: "El cobro no pudo confirmarse. Puedes intentarlo otra vez desde el evento.",
    };
  }

  if (status === "EXPIRED") {
    return {
      icon: <AlertCircle className="h-4 w-4 text-amber-500" />,
      label: "Checkout expirado",
      tone: "bg-amber-50 text-amber-700",
      description: "La sesión de pago expiró antes de completarse.",
    };
  }

  return {
    icon: <Clock3 className="h-4 w-4 text-sky-500" />,
    label: "Pago en revisión",
    tone: "bg-sky-50 text-sky-700",
    description: "Estamos esperando la confirmación del webhook. Tus entradas aparecerán aquí en cuanto llegue.",
  };
}

export default async function TicketsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireAuth();
  const params = await searchParams;
  const [tickets, pendingCheckouts] = await Promise.all([
    listUserTickets(user.id),
    listPendingPaymentCheckoutsForBuyer(user.id),
  ]);

  return (
    <div className="mx-auto max-w-[935px] space-y-4">
      <section className="app-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="app-screen-title">Mis entradas</h1>
            <p className="mt-2 app-screen-subtitle">
              Aquí tienes tu cartera con las entradas activas, las usadas y el estado de los pagos aún en curso.
            </p>
          </div>
          <span className="app-pill">{tickets.length} entradas</span>
        </div>
      </section>

      {params.checkout === "processing" ? (
        <section className="app-card border border-sky-200 bg-sky-50/80 p-4 text-sm text-sky-800">
          El pago se ha enviado correctamente. Tus entradas se emitirán solo cuando Stripe confirme el webhook.
        </section>
      ) : null}

      {pendingCheckouts.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-950">Pagos y checkouts</h2>
            <span className="app-pill">{pendingCheckouts.length}</span>
          </div>

          <div className="grid gap-3">
            {pendingCheckouts.map((checkout) => {
              const copy = getCheckoutCopy(checkout.status);
              const subtotal = checkout.baseAmount / 100;
              const managementFee = checkout.managementFeeAmount / 100;
              const total = checkout.totalAmount / 100;

              return (
                <article key={checkout.id} className="app-card p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold text-slate-950">{checkout.event.title}</p>
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${copy.tone}`}>
                          {copy.icon}
                          {copy.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {checkout.ticketType.name} · {checkout.quantity} entrada(s) · {formatEventDate(checkout.event.date)}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">{checkout.failureReason ?? copy.description}</p>
                      <p className="mt-2 text-xs text-slate-400">Creado el {formatEventDate(checkout.createdAt)}</p>

                      <div className="mt-4 grid gap-2 rounded-[22px] border border-neutral-200 bg-neutral-50 p-3 text-sm sm:grid-cols-3">
                        <div className="rounded-2xl bg-white px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Subtotal</p>
                          <p className="mt-1 font-semibold text-slate-950">{formatPrice(subtotal) ?? "0 EUR"}</p>
                        </div>
                        <div className="rounded-2xl bg-white px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Gestión</p>
                          <p className="mt-1 font-semibold text-slate-950">{formatPrice(managementFee) ?? "0 EUR"}</p>
                        </div>
                        <div className="rounded-2xl bg-white px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Total pagado</p>
                          <p className="mt-1 font-semibold text-slate-950">{formatPrice(total) ?? "0 EUR"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <span className="app-pill">{formatPrice(total) ?? "0 EUR"}</span>
                      <Link href={getEventPath(checkout.event)} className="app-button-secondary">
                        Volver al evento
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="grid gap-3">
        {tickets.map((ticket) => (
          <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="app-card overflow-hidden p-3 sm:p-4">
            <div className="flex gap-3 sm:gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-neutral-100 sm:h-24 sm:w-24">
                {ticket.event.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ticket.event.imageUrl} alt={ticket.event.title} className="h-full w-full object-cover" />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-base font-semibold text-slate-950">{ticket.event.title}</p>
                  <span className={`app-pill ${ticket.status === "USED" ? "bg-emerald-50 text-emerald-700" : ""}`}>
                    {ticket.status === "USED" ? "Usada" : "Activa"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{ticket.ticketType.name}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="app-pill">
                    <CalendarClock className="mr-1 h-3.5 w-3.5" />
                    {formatEventDate(ticket.event.date)}
                  </span>
                  <span className="app-pill">
                    <Ticket className="mr-1 h-3.5 w-3.5" />
                    {ticket.ticketType.price == null ? "Gratis" : formatPrice(Number(ticket.ticketType.price))}
                  </span>
                  <span className="app-pill">
                    <QrCode className="mr-1 h-3.5 w-3.5" />
                    {ticket.qrCode}
                  </span>
                  {ticket.validatedAt ? (
                    <span className="app-pill">
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Validada
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="app-pill bg-sky-50 text-sky-700">Chat del evento disponible</span>
                </div>
              </div>
            </div>
          </Link>
        ))}

        {tickets.length === 0 ? (
          <div className="app-card p-5 text-sm text-slate-500">
            Todavía no tienes entradas emitidas. Cuando un pago se confirme aparecerán aquí.
          </div>
        ) : null}
      </section>
    </div>
  );
}
