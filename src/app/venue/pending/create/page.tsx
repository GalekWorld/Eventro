import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { VenueRequestForm } from "@/components/forms/venue-request-form";

export default async function CreateVenueRequestPage() {
  const user = await requireAuth();

  if (user.role === "VENUE_PENDING") {
    redirect("/venue/pending");
  }

  if (user.role === "VENUE") {
    redirect("/local/dashboard");
  }

  if (user.role === "ADMIN") {
    redirect("/dashboard");
  }

  const existingRequest = await prisma.venueRequest.findUnique({
    where: { userId: user.id },
  });

  return (
    <div className="space-y-4">
      <section className="app-card p-5 md:p-6">
        <span className="app-pill">Solicitud para locales</span>
        <h1 className="mt-4 text-3xl font-bold">Solicita acceso para publicar eventos</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/64">
          Un administrador revisara tu solicitud. Si se aprueba, tu cuenta pasara a local y podras crear eventos.
        </p>
      </section>

      <VenueRequestForm defaults={existingRequest ?? undefined} />
    </div>
  );
}
