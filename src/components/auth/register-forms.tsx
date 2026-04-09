"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type AccountType = "USER" | "VENUE"

export function RegisterForm() {
  const router = useRouter()

  const [accountType, setAccountType] = useState<AccountType>("USER")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    name: "",
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
  })

  function updateField(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

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
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "No se pudo completar el registro.")
        return
      }

      router.push("/login")
    } catch {
      setError("Ha ocurrido un error inesperado.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Crear cuenta</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Elige cómo quieres usar Eventro.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setAccountType("USER")}
          className={`rounded-2xl border p-4 text-left transition ${
            accountType === "USER"
              ? "border-white bg-white/10 text-white"
              : "border-white/10 bg-zinc-900 text-zinc-300 hover:border-white/20"
          }`}
        >
          <div className="text-base font-semibold">Usuario</div>
          <div className="mt-1 text-sm text-zinc-400">
            Descubre eventos, guarda favoritos y compra entradas.
          </div>
        </button>

        <button
          type="button"
          onClick={() => setAccountType("VENUE")}
          className={`rounded-2xl border p-4 text-left transition ${
            accountType === "VENUE"
              ? "border-white bg-white/10 text-white"
              : "border-white/10 bg-zinc-900 text-zinc-300 hover:border-white/20"
          }`}
        >
          <div className="text-base font-semibold">Local</div>
          <div className="mt-1 text-sm text-zinc-400">
            Solicita acceso para publicar eventos y anuncios.
          </div>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-500"
          placeholder="Nombre"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
        />

        <input
          type="email"
          className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-500"
          placeholder="Email"
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          required
        />

        <input
          type="password"
          className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-500"
          placeholder="Contraseña"
          value={form.password}
          onChange={(e) => updateField("password", e.target.value)}
          required
        />

        {accountType === "VENUE" && (
          <>
            <div className="pt-2 text-sm font-medium text-zinc-300">
              Datos del local
            </div>

            <input
              className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-500"
              placeholder="Nombre del negocio"
              value={form.businessName}
              onChange={(e) => updateField("businessName", e.target.value)}
              required
            />

            <input
              className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-500"
              placeholder="Ciudad"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              required
            />

            <input
              className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-500"
              placeholder="Dirección"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
            />

            <input
              className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-500"
              placeholder="Categoría"
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
            />

            <textarea
              className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-500"
              placeholder="Descripción"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
            />

            <input
              className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-500"
              placeholder="Teléfono"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />

            <input
              className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-500"
              placeholder="Web"
              value={form.website}
              onChange={(e) => updateField("website", e.target.value)}
            />

            <input
              className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-500"
              placeholder="Instagram"
              value={form.instagram}
              onChange={(e) => updateField("instagram", e.target.value)}
            />
          </>
        )}

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-white px-4 py-3 font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>
    </div>
  )
}