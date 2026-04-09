import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CreditCard,
  Download,
  Euro,
  Eye,
  Shield,
  Target,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { SectionTitle } from "@/components/section-title";
import {
  formatCompactNumber,
  formatEventDate,
  formatPercentage,
  formatPrice,
  formatShortDate,
} from "@/lib/utils";
import { AnalyticsChart } from "@/components/analytics-chart";
import { AnalyticsLineChart } from "@/components/analytics-line-chart";
import { StatCard } from "@/components/stat-card";
import { PLATFORM_FEE_RATE } from "@/lib/analytics";
import { isStripePaymentsEnabled } from "@/lib/payments";
import {
  openStripeConnectDashboardAction,
  startStripeConnectOnboardingAction,
  syncStripeConnectStatusAction,
} from "@/app/actions/payments";
import {
  addDays,
  getRangeLength,
  getRangeStart,
  getVenueDashboardDataset,
  isWithinRange,
  normalizeRange,
  startOfDay,
  sum,
  type RangeKey,
} from "@/lib/local-dashboard";

type SearchParams = Promise<{
  range?: string;
  city?: string;
  eventId?: string;
}>;

function getTrend(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function buildTimelineDays(range: RangeKey) {
  const today = startOfDay(new Date());
  const days = range === "all" ? 14 : range === "7d" ? 7 : range === "30d" ? 10 : 12;
  return Array.from({ length: days }).map((_, index) => addDays(today, -(days - index - 1)));
}

function getDayKey(date: Date) {
  return startOfDay(date).toISOString();
}

export default async function LocalDashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRole(["VENUE"]);
  const params = await searchParams;
  const range = normalizeRange(params.range);
  const rangeStart = getRangeStart(range);
  const rangeLength = getRangeLength(range);
  const selectedCity = params.city?.trim() || "";
  const selectedEventId = params.eventId?.trim() || "";

  const { events, purchases, views, ticketTypes } = await getVenueDashboardDataset(user.id);
  const stripeConfigured = isStripePaymentsEnabled();
  const [completedPaymentTotals, paymentStatusGroups] = await Promise.all([
    db.paymentCheckout.aggregate({
      where: {
        event: { ownerId: user.id },
        status: "COMPLETED",
      },
      _sum: {
        baseAmount: true,
        revenueShareAmount: true,
        managementFeeAmount: true,
      },
      _count: {
        _all: true,
      },
    }),
    db.paymentCheckout.groupBy({
      by: ["status"],
      where: {
        event: { ownerId: user.id },
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const cityOptions = Array.from(new Set(events.map((event) => event.city).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "es"),
  );
  const pendingPayoutCount = paymentStatusGroups.find((group) => group.status === "PENDING")?._count._all ?? 0;
  const processingPayoutCount = paymentStatusGroups.find((group) => group.status === "PROCESSING")?._count._all ?? 0;
  const failedPayoutCount = paymentStatusGroups.find((group) => group.status === "FAILED")?._count._all ?? 0;
  const completedGrossSales = (completedPaymentTotals._sum.baseAmount ?? 0) / 100;
  const completedRevenueShare = (completedPaymentTotals._sum.revenueShareAmount ?? 0) / 100;
  const completedManagementFees = (completedPaymentTotals._sum.managementFeeAmount ?? 0) / 100;
  const completedVenueNet = completedGrossSales - completedRevenueShare;

  const filteredEventsBase = events.filter((event) => {
    if (selectedCity && event.city !== selectedCity) return false;
    if (selectedEventId && event.id !== selectedEventId) return false;
    return true;
  });

  const allowedEventIds = new Set(filteredEventsBase.map((event) => event.id));

  const filteredPurchases = purchases.filter((purchase) => {
    if (!allowedEventIds.has(purchase.eventId)) return false;
    return isWithinRange(new Date(purchase.createdAt), rangeStart);
  });
  const filteredViews = views.filter((view) => {
    if (!allowedEventIds.has(view.eventId)) return false;
    return isWithinRange(new Date(view.viewedOn), rangeStart);
  });
  const filteredTicketTypes = ticketTypes.filter((ticketType) => {
    if (selectedCity && ticketType.event.city !== selectedCity) return false;
    if (selectedEventId && ticketType.event.id !== selectedEventId) return false;
    return true;
  });

  const previousRangeStart = rangeStart ? addDays(rangeStart, -rangeLength) : null;
  const previousRangeEnd = rangeStart ? addDays(rangeStart, -1) : null;

  const previousPurchases =
    previousRangeStart && previousRangeEnd
      ? purchases.filter((purchase) => {
          if (!allowedEventIds.has(purchase.eventId)) return false;
          const createdAt = new Date(purchase.createdAt);
          return createdAt >= previousRangeStart && createdAt <= previousRangeEnd;
        })
      : [];
  const previousViews =
    previousRangeStart && previousRangeEnd
      ? views.filter((view) => {
          if (!allowedEventIds.has(view.eventId)) return false;
          const viewedOn = new Date(view.viewedOn);
          return viewedOn >= previousRangeStart && viewedOn <= previousRangeEnd;
        })
      : [];

  const grossRevenue = sum(
    filteredPurchases.map((purchase) => (purchase.totalAmount == null ? 0 : Number(purchase.totalAmount))),
  );
  const platformFee = grossRevenue * PLATFORM_FEE_RATE;
  const venueNet = grossRevenue - platformFee;
  const totalVisits = filteredViews.length;
  const totalTicketsSold = sum(filteredPurchases.map((purchase) => purchase.quantity));
  const uniqueBuyers = new Set(filteredPurchases.map((purchase) => purchase.buyerId)).size;
  const averageOrderValue = filteredPurchases.length > 0 ? grossRevenue / filteredPurchases.length : 0;
  const conversionRate = totalVisits > 0 ? (totalTicketsSold / totalVisits) * 100 : 0;

  const previousRevenue = sum(
    previousPurchases.map((purchase) => (purchase.totalAmount == null ? 0 : Number(purchase.totalAmount))),
  );
  const previousTicketsSold = sum(previousPurchases.map((purchase) => purchase.quantity));
  const previousConversion = previousViews.length > 0 ? (previousTicketsSold / previousViews.length) * 100 : 0;

  const publishedEvents = filteredEventsBase.filter((event) => event.published).length;
  const scheduledEvents = filteredEventsBase.filter((event) => new Date(event.date) >= new Date()).length;
  const hotEvents = new Set(
    filteredTicketTypes
      .filter((ticketType) => {
        if (!ticketType.capacity || ticketType.capacity <= 0) return false;
        return (ticketType.soldCount / ticketType.capacity) * 100 >= 80;
      })
      .map((ticketType) => ticketType.event.id),
  ).size;

  const purchaseStatsByEvent = filteredPurchases.reduce((map, purchase) => {
    const current = map.get(purchase.eventId) ?? { revenue: 0, sold: 0 };
    current.revenue += purchase.totalAmount == null ? 0 : Number(purchase.totalAmount);
    current.sold += purchase.quantity;
    map.set(purchase.eventId, current);
    return map;
  }, new Map<string, { revenue: number; sold: number }>());

  const viewsByEvent = filteredViews.reduce((map, view) => {
    map.set(view.eventId, (map.get(view.eventId) ?? 0) + 1);
    return map;
  }, new Map<string, number>());

  const eventPerformance = filteredEventsBase
    .map((event) => {
      const purchaseStats = purchaseStatsByEvent.get(event.id) ?? { revenue: 0, sold: 0 };
      const revenue = purchaseStats.revenue;
      const sold = purchaseStats.sold;
      const visitsForEvent = viewsByEvent.get(event.id) ?? 0;
      const conversion = visitsForEvent > 0 ? (sold / visitsForEvent) * 100 : 0;

      return {
        id: event.id,
        title: event.title,
        city: event.city,
        date: event.date,
        revenue,
        sold,
        visits: visitsForEvent,
        conversion,
      };
    })
    .filter((event) => event.revenue > 0 || event.visits > 0 || isWithinRange(new Date(event.date), rangeStart))
    .sort((a, b) => b.revenue - a.revenue);

  const buyerLeaderboard = Array.from(
    filteredPurchases.reduce((map, purchase) => {
      const existing = map.get(purchase.buyerId) ?? {
        buyerId: purchase.buyerId,
        label: purchase.buyer.username ?? purchase.buyer.name ?? "usuario",
        revenue: 0,
        tickets: 0,
        lastPurchaseAt: purchase.createdAt,
      };

      existing.revenue += purchase.totalAmount == null ? 0 : Number(purchase.totalAmount);
      existing.tickets += purchase.quantity;
      if (purchase.createdAt > existing.lastPurchaseAt) {
        existing.lastPurchaseAt = purchase.createdAt;
      }

      map.set(purchase.buyerId, existing);
      return map;
    }, new Map<string, { buyerId: string; label: string; revenue: number; tickets: number; lastPurchaseAt: Date }>()),
  )
    .map(([, buyer]) => buyer)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const ticketBreakdown = Array.from(
    filteredPurchases.reduce((map, purchase) => {
      const existing = map.get(purchase.ticketTypeId) ?? {
        label: purchase.ticketType.name,
        revenue: 0,
        tickets: 0,
      };

      existing.revenue += purchase.totalAmount == null ? 0 : Number(purchase.totalAmount);
      existing.tickets += purchase.quantity;
      map.set(purchase.ticketTypeId, existing);
      return map;
    }, new Map<string, { label: string; revenue: number; tickets: number }>()),
  )
    .map(([, item]) => item)
    .sort((a, b) => b.revenue - a.revenue);

  const inventoryByType = filteredTicketTypes
    .map((ticketType) => {
      const capacity = ticketType.capacity ?? 0;
      const sold = ticketType.soldCount;
      const fillRate = capacity > 0 ? (sold / capacity) * 100 : 0;

      return {
        id: ticketType.id,
        label: `${ticketType.event.title} / ${ticketType.name}`,
        sold,
        capacity,
        fillRate,
        price: Number(ticketType.price),
      };
    })
    .sort((a, b) => b.fillRate - a.fillRate)
    .slice(0, 6);

  const revenueChart = eventPerformance.slice(0, 6).map((event) => ({
    label: event.title,
    value: event.revenue,
    accent: "linear-gradient(90deg, #0ea5e9, #22c55e)",
  }));

  const conversionChart = eventPerformance
    .slice()
    .sort((a, b) => b.conversion - a.conversion)
    .slice(0, 6)
    .map((event) => ({
      label: event.title,
      value: event.conversion,
      accent: "linear-gradient(90deg, #a855f7, #ec4899)",
    }));

  const revenueByDay = new Map<string, number>();
  for (const purchase of filteredPurchases) {
    const key = getDayKey(new Date(purchase.createdAt));
    const amount = purchase.totalAmount == null ? 0 : Number(purchase.totalAmount);
    revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + amount);
  }

  const visitsByDay = new Map<string, number>();
  for (const view of filteredViews) {
    const key = getDayKey(new Date(view.viewedOn));
    visitsByDay.set(key, (visitsByDay.get(key) ?? 0) + 1);
  }

  const timeline = buildTimelineDays(range).map((date) => {
    const label = formatShortDate(date);
    const key = getDayKey(date);
    const revenue = revenueByDay.get(key) ?? 0;
    const visits = visitsByDay.get(key) ?? 0;

    return {
      label,
      revenue,
      visits,
    };
  });

  const exportParams = new URLSearchParams();
  exportParams.set("range", range);
  if (selectedCity) exportParams.set("city", selectedCity);
  if (selectedEventId) exportParams.set("eventId", selectedEventId);

  const rangeOptions: Array<{ key: RangeKey; label: string }> = [
    { key: "7d", label: "7 días" },
    { key: "30d", label: "30 días" },
    { key: "90d", label: "90 días" },
    { key: "all", label: "Todo" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-4 sm:space-y-5 lg:space-y-6">
      <SectionTitle
        title={user.name ?? user.username ?? "Mi local"}
        subtitle="Panel de control con ventas, rendimiento, compradores y ocupación en un solo vistazo."
      />

      <section className="app-card overflow-hidden p-0">
        <div className="border-b border-neutral-200 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 px-4 py-5 text-white sm:px-5 md:px-6">
          <div className="space-y-5">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/80">Business overview</p>
              <h2 className="mt-2 text-xl font-semibold leading-tight sm:text-2xl md:text-3xl">
                Todo lo importante del local, bien ordenado.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200/85">
                Controla ingresos, tráfico, compradores, ocupación y el rendimiento real de cada evento sin salir del panel.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {rangeOptions.map((option) => (
                <Link
                  key={option.key}
                  href={`/local/dashboard?range=${option.key}${selectedCity ? `&city=${encodeURIComponent(selectedCity)}` : ""}${selectedEventId ? `&eventId=${encodeURIComponent(selectedEventId)}` : ""}`}
                  className={
                    range === option.key
                      ? "rounded-2xl bg-white px-4 py-2 text-center text-sm font-semibold text-slate-950 shadow-sm sm:rounded-full"
                      : "rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-center text-sm font-medium text-white/90 transition hover:bg-white/15 sm:rounded-full"
                  }
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-neutral-200 px-4 py-4 sm:px-5 md:px-6 2xl:grid-cols-[minmax(0,1fr)_auto]">
          <form action="/local/dashboard" className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="range" value={range} />
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Ciudad</label>
              <select name="city" defaultValue={selectedCity} className="app-input">
                <option value="">Todas</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Evento</label>
              <select name="eventId" defaultValue={selectedEventId} className="app-input">
                <option value="">Todos</option>
                {filteredEventsBase.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <button type="submit" className="app-button-primary">
                Aplicar filtros
              </button>
              <Link href={`/local/dashboard?range=${range}`} className="app-button-secondary">
                Limpiar
              </Link>
            </div>
          </form>

          <div className="flex items-end justify-start xl:justify-end">
            <Link href={`/api/local/dashboard/export?${exportParams.toString()}`} className="app-button-secondary w-full sm:w-auto">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Link>
          </div>
        </div>

        <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 sm:px-5 xl:grid-cols-3 md:px-6">
          <div className="rounded-[28px] border border-neutral-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Eventos activos</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCompactNumber(publishedEvents)}</p>
            <p className="mt-1 text-sm text-slate-500">{scheduledEvents} próximos en calendario</p>
          </div>
          <div className="rounded-[28px] border border-neutral-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Facturación neta</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{formatPrice(venueNet) ?? "0 EUR"}</p>
            <p className="mt-1 text-sm text-slate-500">Después de la comision de plataforma</p>
          </div>
          <div className="rounded-[28px] border border-neutral-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Eventos calientes</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCompactNumber(hotEvents)}</p>
            <p className="mt-1 text-sm text-slate-500">Con tickets por encima del 80% de ocupación</p>
          </div>
        </div>
      </section>

      <section className="app-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Cobros reales</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Stripe Connect para liquidaciónes</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              La sala se queda con el 99,96% del valor de la entrada y la plataforma retiene el 0,04%.
              Además, al comprador se le añade un 0,03% extra por gastos de gestión.
            </p>
          </div>

          <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
            {stripeConfigured ? (
              <>
                <form action={startStripeConnectOnboardingAction}>
                  <button type="submit" className="app-button-primary w-full sm:w-auto">
                    <CreditCard className="h-4 w-4" />
                    Conectar cobros
                  </button>
                </form>
                {user.stripeConnectedAccountId ? (
                  <form action={syncStripeConnectStatusAction}>
                    <button type="submit" className="app-button-secondary w-full sm:w-auto">
                      Actualizar estado
                    </button>
                  </form>
                ) : null}
                {user.stripeConnectedAccountId ? (
                  <form action={openStripeConnectDashboardAction}>
                    <button type="submit" className="app-button-secondary w-full sm:w-auto">
                      Panel Stripe
                    </button>
                  </form>
                ) : null}
                <Link href="/local/payouts" className="app-button-secondary w-full sm:w-auto">
                  Ver liquidaciónes
                </Link>
              </>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Stripe aún no está configurado en la plataforma.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 2xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Estado de onboarding</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                <p className="font-semibold text-slate-950">Cuenta conectada</p>
                <p className="mt-1">{user.stripeConnectedAccountId ? "Si" : "Todavía no"}</p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                <p className="font-semibold text-slate-950">Onboarding</p>
                <p className="mt-1">{user.stripeOnboardingComplete ? "Completado" : "Pendiente"}</p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                <p className="font-semibold text-slate-950">Cobros activados</p>
                <p className="mt-1">{user.stripeChargesEnabled ? "Listo para cobrar" : "Aún sin activar"}</p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                <p className="font-semibold text-slate-950">Payouts activados</p>
                <p className="mt-1">{user.stripePayoutsEnabled ? "Listo para liquidar" : "Pendiente"}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Última sincronización:{" "}
              {user.stripeConnectLastSyncedAt ? new Date(user.stripeConnectLastSyncedAt).toLocaleString("es-ES") : "Sin sincronizar"}
            </p>
          </div>

          <div className="rounded-[28px] border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Resumen de liquidación</p>
            <div className="mt-4 grid gap-2">
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm">
                <span className="text-slate-500">Ventas confirmadas</span>
                <span className="font-semibold text-slate-950">{formatPrice(completedGrossSales) ?? "0 EUR"}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm">
                <span className="text-slate-500">Neto estimado del local</span>
                <span className="font-semibold text-slate-950">{formatPrice(completedVenueNet) ?? "0 EUR"}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm">
                <span className="text-slate-500">Comisión plataforma</span>
                <span className="font-semibold text-slate-950">{formatPrice(completedRevenueShare) ?? "0 EUR"}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm">
                <span className="text-slate-500">Gestion al comprador</span>
                <span className="font-semibold text-slate-950">{formatPrice(completedManagementFees) ?? "0 EUR"}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm">
                <span className="text-slate-500">Checkouts pendientes</span>
                <span className="font-semibold text-slate-950">{pendingPayoutCount}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm">
                <span className="text-slate-500">Pagos procesándose</span>
                <span className="font-semibold text-slate-950">{processingPayoutCount}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm">
                <span className="text-slate-500">Checkouts fallidos</span>
                <span className="font-semibold text-slate-950">{failedPayoutCount}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ingresos brutos"
          value={formatPrice(grossRevenue) ?? "0 EUR"}
          helper="Importe total confirmado en ventas."
          trend={`${grossRevenue >= previousRevenue ? "+" : ""}${formatPercentage(getTrend(grossRevenue, previousRevenue))}`}
          icon={<Euro className="h-5 w-5 text-emerald-500" />}
        />
        <StatCard
          label="Neto estimado"
          value={formatPrice(venueNet) ?? "0 EUR"}
          helper={`Descontando una comisión del ${(PLATFORM_FEE_RATE * 100).toFixed(0)}%.`}
          icon={<TrendingUp className="h-5 w-5 text-sky-500" />}
        />
        <StatCard
          label="Visitas"
          value={formatCompactNumber(totalVisits)}
          helper="Tráfico registrado hacia tus eventos."
          trend={`${totalVisits >= previousViews.length ? "+" : ""}${formatPercentage(getTrend(totalVisits, previousViews.length))}`}
          icon={<Eye className="h-5 w-5 text-amber-500" />}
        />
        <StatCard
          label="Conversión"
          value={formatPercentage(conversionRate)}
          helper="Entradas vendidas frente a visitas."
          trend={`${conversionRate >= previousConversion ? "+" : ""}${formatPercentage(getTrend(conversionRate, previousConversion))}`}
          icon={<Target className="h-5 w-5 text-violet-500" />}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <section className="app-card p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Vs. periodo anterior</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{formatPrice(previousRevenue) ?? "0 EUR"}</p>
          <p className="mt-1 text-sm text-slate-500">Ingresos del periodo comparable anterior.</p>
        </section>
        <section className="app-card p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Cambio de tickets</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">
            {previousTicketsSold > 0 ? `${grossRevenue >= previousRevenue ? "+" : ""}${formatPercentage(getTrend(totalTicketsSold, previousTicketsSold))}` : totalTicketsSold > 0 ? "+100.0%" : "0.0%"}
          </p>
          <p className="mt-1 text-sm text-slate-500">Comparación directa de volumen vendido.</p>
        </section>
        <section className="app-card p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Cambio de conversión</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">
            {`${conversionRate >= previousConversion ? "+" : ""}${formatPercentage(getTrend(conversionRate, previousConversion))}`}
          </p>
          <p className="mt-1 text-sm text-slate-500">Eficiencia frente al rango equivalente anterior.</p>
        </section>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Compradores únicos"
          value={formatCompactNumber(uniqueBuyers)}
          helper="Clientes distintos en el periodo."
          icon={<Users className="h-5 w-5 text-fuchsia-500" />}
        />
        <StatCard
          label="Entradas vendidas"
          value={formatCompactNumber(totalTicketsSold)}
          helper="Volumen total de tickets colocados."
          icon={<Ticket className="h-5 w-5 text-cyan-500" />}
        />
        <StatCard
          label="Ticket medio"
          value={formatPrice(averageOrderValue) ?? "0 EUR"}
          helper="Importe medio por compra confirmada."
          icon={<CalendarClock className="h-5 w-5 text-rose-500" />}
        />
        <StatCard
          label="Comisión plataforma"
          value={formatPrice(platformFee) ?? "0 EUR"}
          helper="Estimacion de retencion de plataforma."
          icon={<Shield className="h-5 w-5 text-slate-500" />}
        />
      </div>

      <div className="grid gap-3 2xl:grid-cols-[1.15fr_0.85fr]">
        <AnalyticsLineChart
          title="Evolución de ingresos"
          subtitle="Cómo se está moviendo la caja en el periodo seleccionado."
          points={timeline.map((point) => ({ label: point.label, value: point.revenue }))}
          color="#0ea5e9"
          valueFormatter={(value) => formatPrice(value) ?? "0 EUR"}
        />
        <AnalyticsLineChart
          title="Evolución de visitas"
          subtitle="Interés diario que generan tus eventos."
          points={timeline.map((point) => ({ label: point.label, value: point.visits }))}
          color="#f97316"
        />
      </div>

      <div className="grid gap-3 2xl:grid-cols-2">
        <AnalyticsChart
          title="Eventos que más facturan"
          subtitle="Los eventos que más están empujando el negocio."
          points={revenueChart.length ? revenueChart : [{ label: "Sin datos", value: 0 }]}
          formatValue={(value) => formatPrice(value) ?? "0 EUR"}
        />
        <AnalyticsChart
          title="Mejor conversión"
          subtitle="Qué eventos convierten mejor el tráfico en ventas."
          points={conversionChart.length ? conversionChart : [{ label: "Sin datos", value: 0 }]}
          formatValue={(value) => formatPercentage(value)}
        />
      </div>

      <div className="grid gap-3 2xl:grid-cols-[1.08fr_0.92fr]">
        <section className="app-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Rendimiento por evento</h2>
              <p className="mt-1 text-sm text-slate-500">Ingresos, conversión y tráfico en una vista clara para decidir rápido.</p>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <Link href="/local/events/new" className="app-button-secondary w-full sm:w-auto">
                Crear evento
              </Link>
              <Link href="/local/staff" className="app-button-secondary w-full sm:w-auto">
                Porteros
              </Link>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-[28px] border border-neutral-200">
            <div className="min-w-[640px] lg:min-w-[720px]">
              <div className="grid grid-cols-[minmax(0,1.4fr)_0.8fr_0.75fr_0.75fr_0.75fr] gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                <span>Evento</span>
                <span>Ingresos</span>
                <span>Visitas</span>
                <span>Tickets</span>
                <span>Conversión</span>
              </div>

              <div className="divide-y divide-neutral-200">
                {eventPerformance.slice(0, 8).map((event) => (
                  <div key={event.id} className="grid grid-cols-[minmax(0,1.4fr)_0.8fr_0.75fr_0.75fr_0.75fr] gap-3 px-4 py-4 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{event.title}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {event.city} / {formatEventDate(event.date)}
                      </p>
                    </div>
                    <span className="font-medium text-slate-950">{formatPrice(event.revenue) ?? "0 EUR"}</span>
                    <span className="text-slate-600">{formatCompactNumber(event.visits)}</span>
                    <span className="text-slate-600">{formatCompactNumber(event.sold)}</span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-600">{formatPercentage(event.conversion)}</span>
                      <Link href={`/local/events/${event.id}/tickets`} className="text-sky-600 transition hover:text-sky-700">
                        Ver
                      </Link>
                    </div>
                  </div>
                ))}

                {eventPerformance.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-500">Todavía no hay suficiente actividad en este rango.</div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <section className="app-card p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-500" />
              <h2 className="text-lg font-semibold text-slate-950">Mejores compradores</h2>
            </div>

            <div className="mt-4 space-y-3">
              {buyerLeaderboard.map((buyer, index) => (
                <div key={buyer.buyerId} className="rounded-[28px] border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {index + 1}. @{buyer.label}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {buyer.tickets} entradas / última compra {formatEventDate(buyer.lastPurchaseAt)}
                      </p>
                    </div>
                    <span className="app-pill">{formatPrice(buyer.revenue) ?? "0 EUR"}</span>
                  </div>
                </div>
              ))}

              {buyerLeaderboard.length === 0 ? (
                <div className="rounded-[28px] border border-neutral-200 bg-neutral-50 p-4 text-sm text-slate-500">
                  Aún no hay compradores suficientes para construir el ranking.
                </div>
              ) : null}
            </div>
          </section>

          <section className="app-card p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-slate-500" />
              <h2 className="text-lg font-semibold text-slate-950">Mix de entradas</h2>
            </div>

            <div className="mt-4 space-y-3">
              {ticketBreakdown.slice(0, 6).map((ticketType) => (
                <div key={ticketType.label} className="rounded-[28px] border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">{ticketType.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{ticketType.tickets} entradas vendidas</p>
                    </div>
                    <span className="app-pill">{formatPrice(ticketType.revenue) ?? "0 EUR"}</span>
                  </div>
                </div>
              ))}

              {ticketBreakdown.length === 0 ? (
                <div className="rounded-[28px] border border-neutral-200 bg-neutral-50 p-4 text-sm text-slate-500">
                  Todavía no hay ventas suficientes para analizar tipos de entrada.
                </div>
              ) : null}
            </div>
          </section>
        </section>
      </div>

      <div className="grid gap-3 2xl:grid-cols-[0.92fr_1.08fr]">
        <section className="app-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Ocupación por tipo</h2>
              <p className="mt-1 text-sm text-slate-500">Qué tickets se llenan antes y cuáles necesitan mejor empuje comercial.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </div>

          <div className="mt-4 space-y-3">
            {inventoryByType.map((ticketType) => (
              <div key={ticketType.id} className="rounded-[28px] border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{ticketType.label}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {ticketType.capacity > 0 ? `${ticketType.sold}/${ticketType.capacity} vendidas` : `${ticketType.sold} vendidas`}
                    </p>
                  </div>
                  <span className="app-pill">{formatPrice(ticketType.price) ?? "0 EUR"}</span>
                </div>

                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
                    style={{ width: `${Math.min(ticketType.fillRate, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">{formatPercentage(ticketType.fillRate)} de ocupación</p>
              </div>
            ))}

            {inventoryByType.length === 0 ? (
              <div className="rounded-[28px] border border-neutral-200 bg-neutral-50 p-4 text-sm text-slate-500">
                Aún no hay tipos de entrada suficientes para medir ocupación.
              </div>
            ) : null}
          </div>
        </section>

        <section className="app-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Actividad reciente</h2>
              <p className="mt-1 text-sm text-slate-500">Últimas compras y movimiento comercial detectado en tus eventos.</p>
            </div>
            <Link href="/tickets" className="text-sm font-medium text-sky-600 transition hover:text-sky-700">
              Ver entradas
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto rounded-[28px] border border-neutral-200">
            <div className="min-w-[620px] lg:min-w-[680px]">
              <div className="grid grid-cols-[minmax(0,1.1fr)_1fr_0.8fr_0.8fr] gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                <span>Comprador</span>
                <span>Evento</span>
                <span>Entrada</span>
                <span>Importe</span>
              </div>

              <div className="divide-y divide-neutral-200">
                {filteredPurchases.slice(0, 10).map((purchase) => (
                  <div
                    key={purchase.id}
                    className="grid grid-cols-[minmax(0,1.1fr)_1fr_0.8fr_0.8fr] gap-3 px-4 py-4 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">
                        @{purchase.buyer.username ?? purchase.buyer.name ?? "usuario"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{formatEventDate(purchase.createdAt)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-slate-700">{purchase.event.title}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{purchase.event.city}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-slate-700">{purchase.ticketType.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{purchase.quantity} ud.</p>
                    </div>
                    <div className="text-right font-medium text-slate-950">
                      {purchase.totalAmount == null ? "Gratis" : formatPrice(Number(purchase.totalAmount))}
                    </div>
                  </div>
                ))}

                {filteredPurchases.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-500">Sin actividad reciente en el rango seleccionado.</div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

