"use client";

import dynamic from "next/dynamic";
import { RoutePrefetch } from "@/components/route-prefetch";

const ServiceWorkerRegister = dynamic(
  () => import("@/components/service-worker-register").then((mod) => mod.ServiceWorkerRegister),
  { ssr: false },
);

const BrowserNotificationListener = dynamic(
  () => import("@/components/browser-notification-listener").then((mod) => mod.BrowserNotificationListener),
  { ssr: false },
);

export function ClientShellEffects({
  userId,
  profileHref,
  withServiceWorker = true,
}: {
  userId?: string | null;
  profileHref?: string | null;
  withServiceWorker?: boolean;
}) {
  return (
    <>
      <RoutePrefetch profileHref={profileHref} />
      {withServiceWorker ? <ServiceWorkerRegister /> : null}
      {userId ? <BrowserNotificationListener userId={userId} /> : null}
    </>
  );
}
