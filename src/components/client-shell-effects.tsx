"use client";

import dynamic from "next/dynamic";

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
  withServiceWorker = true,
}: {
  userId?: string | null;
  withServiceWorker?: boolean;
}) {
  return (
    <>
      {withServiceWorker ? <ServiceWorkerRegister /> : null}
      {userId ? <BrowserNotificationListener userId={userId} /> : null}
    </>
  );
}
