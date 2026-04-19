import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/forms/auth-form";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100svh-7.5rem)] w-full max-w-md items-center">
      <div className="w-full space-y-5">
        <section className="app-card-strong overflow-hidden rounded-[28px] border border-neutral-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="bg-gradient-to-br from-pink-50 via-white to-sky-50 px-4 py-6 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-300">Eventro</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50 sm:text-[2.1rem]">Entra a tu cuenta</h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-300">
              Accede a tu perfil, tus chats, tus grupos y tus entradas desde una interfaz pensada para móvil.
            </p>
          </div>

          <div className="p-4 sm:p-6">
            <AuthForm
              title="Iniciar sesión"
              description="Usa tu email y contraseña para entrar."
              action={loginAction}
              submitLabel="Entrar"
              pendingLabel="Entrando..."
            />
          </div>
        </section>

        <p className="px-1 text-center text-sm text-slate-500 dark:text-slate-300">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="font-semibold text-sky-600 transition hover:text-sky-700">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
