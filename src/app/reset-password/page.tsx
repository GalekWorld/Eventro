import Link from "next/link";
import { getPasswordResetTokenRecord } from "@/lib/password-reset";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";

type SearchParams = Promise<{
  token?: string;
}>;

export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const token = String(params.token ?? "").trim();
  const record = token ? await getPasswordResetTokenRecord(token) : null;

  return (
    <div className="mx-auto max-w-[480px] space-y-4">
      {record ? (
        <ResetPasswordForm token={token} />
      ) : (
        <section className="app-card p-5 sm:p-6">
          <h1 className="text-2xl font-semibold text-slate-950">Enlace no válido</h1>
          <p className="mt-2 text-sm text-slate-500">
            Este enlace ha expirado o ya no puede usarse. Vuelve a solicitar un correo de cambio de contraseña desde tu perfil privado.
          </p>
          <div className="mt-5">
            <Link href="/login" className="app-button-secondary w-full text-center">
              Volver
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
