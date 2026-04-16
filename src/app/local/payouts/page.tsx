import Link from "next/link";
import { PaymentCheckoutStatus } from "@prisma/client";
import { ArrowLeft, CheckCircle2, Clock3, CreditCard, ReceiptText, Wallet, XCircle } from "lucide-react";
import { SectionTitle } from "@/components/section-title";
import { requireRole } from "@/lib/permissions";
import { getVenuePaymentReport } from "@/lib/payment-reporting";
import { formatEventDate, formatPrice } from "@/lib/utils";

function getStatusBadge(status: PaymentCheckoutStatus) {
  if (status === "COMPLETED") {
    return {
      label: "Completado",
      className: "bg-emerald-50 text-emerald-700",
      icon: <CheckCircle2 className="h-4 w-4" />,
    };
  }

  if (status === "FAILED") {
    return {
      label: "Fallido",
      className: "bg-red-50 text-red-700",
      icon: <XCircle className="h-4 w-4" />,
    };
  }

  if (status === "EXPIRED") {
    return {
      label: "Expirado",
      className: "bg-amber-50 text-amber-700",
      icon: <Clock3 className="h-4 w-4" />,
    };
  }

  if (status === "PROCESSING") {
    return {
      label: "Procesando",
      className: "bg-violet-50 text-violet-700",
      icon: <Clock3 className="h-4 w-4" />,
    };
  }

  return {
    label: "Pendiente",
    className: "bg-sky-50 text-sky-700",
    icon: <Clock3 className="h-4 w-4" />,
  };
}

export default async function LocalPayoutsPage() {
  const user = await requireRole(["VENUE"]);
  const report = await getVenuePaymentReport(user.id);

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Liquidaciones"
        subtitle="Aquí tienes el desglose real de cobros, comisión de plataforma y neto estimado del local."
      />

      <section className="app-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Resumen de payouts</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Cobro confirmado, fee y neto</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              La plataforma retiene un 4% del valor de la entrada y suma un 3% extra al comprador por gastos de
              gestión.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/local/dashboard" className="app-button-secondary">
              <ArrowLeft className="h-4 w-4" />
              Volver al panel
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[28px] border border-neutral-200 bg-neutral-50 p-4">
            <ReceiptText className="h-5 w-5 text-slate-500" />
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Ventas brutas</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{formatPrice(report.summary.grossSales) ?? "0 EUR"}</p>
          </div>
          <div className="rounded-[28px] border border-neutral-200 bg-neutral-50 p-4">
            <Wallet className="h-5 w-5 text-slate-500" />
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Neto del local</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{formatPrice(report.summary.venueNet) ?? "0 EUR"}</p>
          </div>
          <div className="rounded-[28px] border border-neutral-200 bg-neutral-50 p-4">
            <CreditCard className="h-5 w-5 text-slate-500" />
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Comisión plataforma</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{formatPrice(report.summary.revenueShare) ?? "0 EUR"}</p>
          </div>
          <div className="rounded-[28px] border border-neutral-200 bg-neutral-50 p-4">
            <CreditCard className="h-5 w-5 text-slate-500" />
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Gestión al comprador</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{formatPrice(report.summary.managementFees) ?? "0 EUR"}</p>
          </div>
          <div className="rounded-[28px] border border-neutral-200 bg-neutral-50 p-4">
            <CheckCircle2 className="h-5 w-5 text-slate-500" />
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Checkouts completados</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{report.summary.completedCount}</p>
          </div>
        </div>
      </section>

      <section className="app-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Estado de los cobros</h2>
            <p className="mt-1 text-sm text-slate-500">Seguimiento de pagos completados, pendientes, fallidos y expirados.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="app-pill">{report.summary.pendingCount} pendientes</span>
            <span className="app-pill">{report.summary.processingCount} procesando</span>
            <span className="app-pill">{report.summary.failedCount} fallidos</span>
            <span className="app-pill">{report.summary.expiredCount} expirados</span>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-[28px] border border-neutral-200">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[1.25fr_0.8fr_0.8fr_0.8fr_0.85fr_0.7fr] gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              <span>Evento / comprador</span>
              <span>Venta bruta</span>
              <span>Neto local</span>
              <span>Fee plataforma</span>
              <span>Gestión</span>
              <span>Estado</span>
            </div>

            <div className="divide-y divide-neutral-200">
              {report.checkouts.map((checkout) => {
                const badge = getStatusBadge(checkout.status);
                const localNet = (checkout.baseAmount - checkout.revenueShareAmount) / 100;

                return (
                  <div
                    key={checkout.id}
                    className="grid grid-cols-[1.25fr_0.8fr_0.8fr_0.8fr_0.85fr_0.7fr] gap-3 px-4 py-4 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{checkout.event.title}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        @{checkout.buyer.username ?? checkout.buyer.name ?? "usuario"} · {checkout.ticketType.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {formatEventDate(checkout.createdAt)} · {checkout.quantity} entrada(s)
                      </p>
                    </div>
                    <span className="font-medium text-slate-950">{formatPrice(checkout.baseAmount / 100) ?? "0 EUR"}</span>
                    <span className="text-slate-700">{formatPrice(localNet) ?? "0 EUR"}</span>
                    <span className="text-slate-700">{formatPrice(checkout.revenueShareAmount / 100) ?? "0 EUR"}</span>
                    <div className="min-w-0">
                      <p className="text-slate-700">{formatPrice(checkout.managementFeeAmount / 100) ?? "0 EUR"}</p>
                      {checkout.failureReason ? <p className="mt-1 truncate text-xs text-red-600">{checkout.failureReason}</p> : null}
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                      {badge.icon}
                      {badge.label}
                    </span>
                  </div>
                );
              })}

              {report.checkouts.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-500">Todavía no hay cobros registrados para este local.</div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="app-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Payouts reales de Stripe</h2>
            <p className="mt-1 text-sm text-slate-500">Estado de las transferencias y liquidaciones que Stripe manda a tu cuenta conectada.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="app-pill">Pagado: {formatPrice(report.summary.paidOut) ?? "0 EUR"}</span>
            <span className="app-pill">En tránsito: {formatPrice(report.summary.inTransit) ?? "0 EUR"}</span>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-[28px] border border-neutral-200">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[0.95fr_0.8fr_0.8fr_0.9fr_0.75fr] gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              <span>Payout</span>
              <span>Importe</span>
              <span>Llegada</span>
              <span>Estado</span>
              <span>Detalle</span>
            </div>

            <div className="divide-y divide-neutral-200">
              {report.payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="grid grid-cols-[0.95fr_0.8fr_0.8fr_0.9fr_0.75fr] gap-3 px-4 py-4 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">{payout.stripePayoutId}</p>
                    <p className="mt-1 truncate text-xs text-slate-400">{formatEventDate(payout.createdAt)}</p>
                  </div>
                  <span className="text-slate-950">{formatPrice(payout.amount / 100) ?? "0 EUR"}</span>
                  <span className="text-slate-700">{payout.arrivalDate ? formatEventDate(payout.arrivalDate) : "Pendiente"}</span>
                  <span className="text-slate-700">{payout.status}</span>
                  <div className="min-w-0 text-xs text-slate-500">
                    {payout.failureMessage ? <p className="truncate text-red-600">{payout.failureMessage}</p> : <p>-</p>}
                  </div>
                </div>
              ))}

              {report.payouts.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-500">Aún no hay payouts sincronizados desde Stripe Connect.</div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
