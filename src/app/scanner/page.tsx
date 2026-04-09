import Link from "next/link";
import { QrCode, ShieldCheck } from "lucide-react";
import { requireAuth } from "@/lib/permissions";
import { listScannerEvents } from "@/features/events/event.service";
import { formatEventDate } from "@/lib/utils";

export default async function ScannerPage() {
  const user = await requireAuth();
  const events = await listScannerEvents(user.id, user.role);

  return (
    <div className="mx-auto max-w-[935px] space-y-4">
      <section className="app-card p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <QrCode className="h-5 w-5 text-slate-500" />
          <div>
            <h1 className="app-screen-title">Escáner</h1>
            <p className="mt-2 app-screen-subtitle">
              Aquí solo aparecen los eventos que puedes validar como portero autorizado o admin.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        {events.map((event) => (
          <Link key={event.id} href={`/scanner/${event.id}`} className="app-card p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-950">{event.title}</p>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {event.owner.username ? `@${event.owner.username}` : event.owner.name ?? "local"} · {event.city}
                </p>
                <p className="mt-2 text-xs text-slate-400">{formatEventDate(event.date)}</p>
              </div>
              {user.role === "ADMIN" ? (
                <span className="app-pill shrink-0">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                  Admin
                </span>
              ) : (
                <span className="app-pill shrink-0">Portero</span>
              )}
            </div>
          </Link>
        ))}

        {events.length === 0 ? (
          <div className="app-card p-5 text-sm text-slate-500">No tienes permisos de escaneo en ningún evento ahora mismo.</div>
        ) : null}
      </section>
    </div>
  );
}
