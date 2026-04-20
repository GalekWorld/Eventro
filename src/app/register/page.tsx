"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type AccountType = "USER" | "VENUE";

export default function RegisterPage() {
  const router = useRouter();

  const [accountType, setAccountType] = useState<AccountType>("USER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    businessName: "",
    city: "",
    address: "",
    category: "",
    description: "",
    phone: "",
    website: "",
    instagram: "",
  });

  function updateField(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          accountType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "No se pudo completar el registro.");
        return;
      }

      router.push("/login");
      router.refresh();
    } catch {
      setError("Ha ocurrido un error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100svh-7.5rem)] w-full max-w-xl items-center">
      <div className="w-full space-y-5">
        <section className="app-card-strong overflow-hidden rounded-[28px] border border-neutral-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="bg-gradient-to-br from-pink-50 via-white to-sky-50 px-4 py-6 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-300">Eventro</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50 sm:text-[2.1rem]">Crear cuenta</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-300">
              Elige cómo vas a usar Eventro y completa tus datos. El formulario está ajustado para móvil y escritorio.
            </p>
          </div>

          <div className="space-y-5 p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setAccountType("USER")}
                className={`rounded-2xl border p-4 text-left transition ${
                  accountType === "USER"
                    ? "border-sky-200 bg-sky-50 text-slate-950 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-slate-50"
                    : "border-neutral-200 bg-neutral-50 text-slate-700 hover:border-neutral-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600"
                }`}
              >
                <div className="text-base font-semibold">Usuario</div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">Descubre eventos, compra entradas y conecta con gente.</div>
              </button>

              <button
                type="button"
                onClick={() => setAccountType("VENUE")}
                className={`rounded-2xl border p-4 text-left transition ${
                  accountType === "VENUE"
                    ? "border-sky-200 bg-sky-50 text-slate-950 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-slate-50"
                    : "border-neutral-200 bg-neutral-50 text-slate-700 hover:border-neutral-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600"
                }`}
              >
                <div className="text-base font-semibold">Local</div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">Solicita acceso para publicar eventos, vender entradas y gestionar puerta.</div>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                className="app-input"
                placeholder="Nombre visible (opcional)"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
              />

              <input
                className="app-input"
                placeholder="Nombre de usuario"
                value={form.username}
                onChange={(e) => updateField("username", e.target.value.toLowerCase())}
                required
              />

              <input
                type="email"
                className="app-input"
                placeholder="Email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
              />

              <input
                type="password"
                className="app-input"
                placeholder="Contraseña"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                required
              />

              {accountType === "VENUE" ? (
                <div className="space-y-4 rounded-[24px] border border-neutral-200 bg-neutral-50 p-4 dark:border-slate-700 dark:bg-slate-800/80">
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">Datos del local</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Estos datos se usarán para revisar la solicitud del negocio.</p>
                  </div>

                  <input
                    className="app-input"
                    placeholder="Nombre del negocio"
                    value={form.businessName}
                    onChange={(e) => updateField("businessName", e.target.value)}
                    required
                  />

                  <input className="app-input" placeholder="Ciudad" value={form.city} onChange={(e) => updateField("city", e.target.value)} required />
                  <input className="app-input" placeholder="Dirección" value={form.address} onChange={(e) => updateField("address", e.target.value)} />
                  <input className="app-input" placeholder="Categoría" value={form.category} onChange={(e) => updateField("category", e.target.value)} />

                  <textarea
                    className="app-textarea min-h-[120px] w-full"
                    placeholder="Descripción"
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                  />

                  <input className="app-input" placeholder="Teléfono" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
                  <input className="app-input" placeholder="Web" value={form.website} onChange={(e) => updateField("website", e.target.value)} />
                  <input className="app-input" placeholder="Instagram" value={form.instagram} onChange={(e) => updateField("instagram", e.target.value)} />
                </div>
              ) : null}

              {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

              <button type="submit" disabled={loading} className="app-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </button>
            </form>
          </div>
        </section>

        <p className="px-1 text-center text-sm text-slate-500 dark:text-slate-300">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-sky-600 transition hover:text-sky-700">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
