"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Compass, Map, MessageCircleMore, Search, User } from "lucide-react";

export function MobileNav({ profileHref = "/profile" }: { profileHref?: string }) {
  const router = useRouter();
  const items = [
    { href: "/dashboard", label: "Inicio", icon: Compass },
    { href: "/search", label: "Buscar", icon: Search },
    { href: "/map", label: "Mapa", icon: Map },
    { href: "/messages", label: "Chats", icon: MessageCircleMore },
    { href: profileHref, label: "Perfil", icon: User },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.35rem)] pt-2 backdrop-blur xl:hidden">
      <div className="mx-auto grid max-w-sm grid-cols-5 gap-1 rounded-[24px] bg-white/90">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onMouseEnter={() => router.prefetch(item.href)}
              onFocus={() => router.prefetch(item.href)}
              onTouchStart={() => router.prefetch(item.href)}
              className="flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-medium text-slate-500 transition hover:bg-neutral-100 hover:text-slate-950"
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
