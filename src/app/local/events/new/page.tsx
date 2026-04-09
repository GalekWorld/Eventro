import { CreateEventForm } from "@/components/forms/create-event-form";
import { SectionTitle } from "@/components/section-title";
import { requireRole } from "@/lib/permissions";

export default async function NewLocalEventPage() {
  await requireRole(["VENUE"]);

  return (
    <div className="space-y-6">
      <SectionTitle title="Crear evento" subtitle="Configura horarios, entradas y ubicación de una forma más clara." />
      <CreateEventForm />
    </div>
  );
}
