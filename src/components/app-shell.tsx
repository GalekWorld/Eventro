import type { ReactNode } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarRange,
  Compass,
  Map,
  MessageCircleMore,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  User,
  Users,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { MobileNav } from "@/components/mobile-nav";
import { db } from "@/lib/db";
import { ThemeToggle } from "@/components/theme-toggle";
import { ClientShellEffects } from "@/components/client-shell-effects";

const desktopBaseNav = [
  { href: "/dashboard", label: "Inicio", icon: Compass },
  { href: "/search", label: "Buscar", icon: Search },
  { href: "/events", label: "Eventos", icon: CalendarRange },
  { href: "/groups", label: "Grupos", icon: Users },
  { href: "/map", label: "Mapa", icon: Map },
  { href: "/messages", label: "Mensajes", icon: MessageCircleMore },
];

export async function AppShell({ children }: { children: ReactNode }) {
  let user = null;

  try {
    user = await getSessionUser();
  } catch (error) {
    if (
      error instanceof Error &&
      ((typeof (error as Error & { digest?: string }).digest === "string" && (error as Error & { digest?: string }).digest === "DYNAMIC_SERVER_USAGE") ||
        error.message.includes("Dynamic server usage"))
    ) {
      throw error;
    }

    console.error("APP_SHELL_USER_ERROR", error);
    user = null;
  }

  const profileHref = user ? (user.username ? `/u/${user.username}` : "/profile/private") : "/login";
  const nav = [...desktopBaseNav, { href: profileHref, label: "Perfil", icon: User }];
  const canScan =
    user &&
    (user.role === "ADMIN" ||
      (await db.venueDoorStaff.findFirst({
        where: { staffUserId: user.id },
        select: { id: true },
      }).then(Boolean)));

  if (user?.role === "ADMIN") {
    nav.push({ href: "/admin/venue-requests", label: "Admin", icon: ShieldCheck });
  }

  if (user?.role === "VENUE") {
    nav.push({ href: "/local/dashboard", label: "Local", icon: Sparkles });
    nav.push({ href: "/local/staff", label: "Porteros", icon: Users });
  }

  if (canScan) {
    nav.push({ href: "/scanner", label: "Escáner", icon: QrCode });
  }

  return (
    <div className="min-h-screen bg-app-shell text-slate-900">
      <ClientShellEffects userId={user?.id} withServiceWorker={false} />
      <div className="mx-auto flex min-h-screen w-full max-w-[1180px] gap-4 px-0 sm:px-4 sm:py-4 xl:gap-6">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-72 shrink-0 flex-col justify-between self-start rounded-[28px] border border-neutral-200 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)] xl:flex">
          <div className="space-y-6">
            <div className="border-b border-neutral-200 pb-5">
              <Link href="/dashboard" className="font-['Pacifico'] text-3xl text-slate-950">
                Eventro
              </Link>
            </div>

            <nav className="space-y-2">
              {nav.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-neutral-100 hover:text-slate-950"
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Conectado</p>
            <p className="mt-3 text-base font-semibold text-slate-950">@{user?.username ?? "visitante"}</p>
            <p className="mt-1 text-sm text-slate-500">{user?.name ?? "Modo público"}</p>
            {user ? (
              <div className="mt-4">
                <LogoutButton />
              </div>
            ) : null}
          </div>
        </aside>

        <div className="app-safe-bottom app-safe-top flex min-w-0 flex-1 flex-col gap-0">
          <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/92 px-3 py-3 backdrop-blur sm:rounded-t-[28px] sm:border sm:px-4 xl:mt-4 xl:rounded-[28px] xl:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/dashboard" className="font-['Pacifico'] text-[30px] leading-none text-slate-950 xl:hidden">
                Eventro
              </Link>

              <div className="hidden flex-1 xl:block">
                <div className="mx-auto max-w-sm">
                  <Link
                    href="/search"
                    className="flex h-11 items-center justify-center rounded-xl bg-neutral-100 text-sm text-slate-500 transition hover:bg-neutral-200"
                  >
                    Buscar personas, eventos o grupos
                  </Link>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <ThemeToggle />
                {user ? (
                  <Link
                    href="/tickets"
                    className="flex h-10 items-center justify-center gap-2 rounded-full border border-neutral-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-neutral-100 sm:h-11"
                  >
                    <Ticket className="h-4 w-4" />
                    <span className="hidden sm:inline">Mis entradas</span>
                  </Link>
                ) : null}
                {canScan ? (
                  <Link
                    href="/scanner"
                    className="flex h-10 items-center justify-center gap-2 rounded-full border border-neutral-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-neutral-100 sm:h-11"
                  >
                    <QrCode className="h-4 w-4" />
                    <span className="hidden sm:inline">Escáner</span>
                  </Link>
                ) : null}
                <Link
                  href="/notifications"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 transition hover:bg-neutral-100 sm:h-11 sm:w-11"
                >
                  <Bell className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </header>

          <main className="min-h-[calc(100svh-7rem)] px-3 pb-4 pt-3 sm:px-0 sm:pb-4 sm:pt-4">{children}</main>
        </div>
      </div>

      <MobileNav profileHref={profileHref} />
    </div>
  );
}
