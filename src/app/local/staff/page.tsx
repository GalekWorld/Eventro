import { Shield, Trash2 } from "lucide-react";
import { requireRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { DoorStaffForm } from "@/components/forms/door-staff-form";
import { removeDoorStaffAction } from "@/app/actions/local";

export default async function LocalStaffPage() {
  const venue = await requireRole(["VENUE"]);

  const staff = await db.venueDoorStaff.findMany({
    where: {
      venueId: venue.id,
      eventId: null,
    },
    orderBy: { createdAt: "desc" },
    include: {
      staffUser: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-[935px] space-y-4">
      <section className="app-card p-5">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-slate-500" />
          <div>
            <h1 className="app-screen-title">Porteros del local</h1>
            <p className="mt-2 app-screen-subtitle">Solo estos usuarios y los admins podrán escanear entradas de tu local.</p>
          </div>
        </div>
      </section>

      <DoorStaffForm />

      <section className="grid gap-3">
        {staff.map((assignment) => (
          <article key={assignment.id} className="app-card flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-950">@{assignment.staffUser.username ?? "usuario"}</p>
              <p className="mt-1 text-sm text-slate-500">{assignment.staffUser.name ?? "Sin nombre"}</p>
            </div>
            <form action={removeDoorStaffAction}>
              <input type="hidden" name="assignmentId" value={assignment.id} />
              <button type="submit" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-slate-500 transition hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </form>
          </article>
        ))}

        {staff.length === 0 ? (
          <div className="app-card p-5 text-sm text-slate-500">Todavía no has dado acceso a ningún portero.</div>
        ) : null}
      </section>
    </div>
  );
}
