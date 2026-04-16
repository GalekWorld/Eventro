import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function VenuePendingPage() {
  const user = await requireAuth();

  if (user.role === "VENUE") {
    redirect("/local/dashboard");
  }

  if (user.role === "ADMIN") {
    redirect("/dashboard");
  }

  const request = await prisma.venueRequest.findUnique({
    where: { userId: user.id },
  });

  if (!request) {
    redirect("/venue/pending/create");
  }

  return (
    <div className="space-y-4">
      <section className="app-card p-5 md:p-6">
        <span className="app-pill">Estado de tu solicitud</span>
        <h1 className="mt-4 text-3xl font-bold">Solicitud de local en revisión</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/64">
          Tu local será revisado en un plazo máximo de 24 horas. Te comunicaremos por la app si la solicitud ha sido aceptada o denegada.
        </p>
      </section>

      <section className="app-card p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-white/45">Usuario</p>
            <p className="mt-1 font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-white/45">Estado</p>
            <p className="mt-1 font-medium">{request.status}</p>
          </div>
          <div>
            <p className="text-sm text-white/45">Negocio</p>
            <p className="mt-1 font-medium">{request.businessName}</p>
          </div>
          <div>
            <p className="text-sm text-white/45">Ciudad</p>
            <p className="mt-1 font-medium">{request.city}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-white/45">Descripción</p>
            <p className="mt-1 text-white/72">{request.description ?? "No has añadido una descripción."}</p>
          </div>
          {request.rejectionReason ? (
            <div className="md:col-span-2">
              <p className="text-sm text-white/45">Motivo de rechazo</p>
              <p className="mt-1 text-white/72">{request.rejectionReason}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-6">
          <Link href="/dashboard" className="app-button-secondary">
            Volver al inicio
          </Link>
        </div>
      </section>
    </div>
  );
}
