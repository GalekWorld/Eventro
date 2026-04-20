"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function RoutePrefetch({ profileHref }: { profileHref?: string | null }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.onLine || document.hidden) {
      return;
    }

    let cancelled = false;
    let idleHandle: number | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const coreRoutes = ["/dashboard", "/search", "/map", "/messages", "/notifications", "/events"];
    const targets = [...coreRoutes, ...(profileHref ? [profileHref] : [])].filter((route, index, routes) => route !== pathname && routes.indexOf(route) === index);

    const queuePrefetch = () => {
      targets.forEach((route, index) => {
        setTimeout(() => {
          if (!cancelled) {
            router.prefetch(route);
          }
        }, index * 120);
      });
    };

    const schedule = () => {
      if ("requestIdleCallback" in window) {
        idleHandle = window.requestIdleCallback(() => {
          queuePrefetch();
        }, { timeout: 1200 });
        return;
      }

      timeoutHandle = setTimeout(queuePrefetch, 300);
    };

    schedule();

    const handleVisible = () => {
      if (!document.hidden && navigator.onLine) {
        queuePrefetch();
      }
    };

    document.addEventListener("visibilitychange", handleVisible);
    window.addEventListener("online", handleVisible);

    return () => {
      cancelled = true;

      if (idleHandle != null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleHandle);
      }

      if (timeoutHandle != null) {
        clearTimeout(timeoutHandle);
      }

      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("online", handleVisible);
    };
  }, [pathname, profileHref, router]);

  return null;
}
