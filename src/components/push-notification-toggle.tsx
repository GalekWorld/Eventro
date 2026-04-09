"use client";

import { useEffect, useMemo, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4 || 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function PushNotificationToggle() {
  const vapidPublicKey = useMemo(() => process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "", []);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscribed, setSubscribed] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);

    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setSubscribed(Boolean(subscription)))
      .catch(() => null);
  }, []);

  async function enablePush() {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermission("unsupported");
      return;
    }

    if (!vapidPublicKey) {
      setStatus("Los avisos push se activarán cuando se configure la clave pública VAPID.");
      return;
    }

    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);

    if (nextPermission !== "granted") {
      setStatus("Necesitas aceptar el permiso del navegador para recibir avisos.");
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      }));

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
    });

    setSubscribed(true);
    setStatus("Los avisos push ya están activados en este dispositivo.");
  }

  async function disablePush() {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      setSubscribed(false);
      return;
    }

    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
    }).catch(() => null);

    await subscription.unsubscribe().catch(() => null);
    setSubscribed(false);
    setStatus("Los avisos push se han desactivado en este dispositivo.");
  }

  if (permission === "unsupported") {
    return <p className="text-sm text-slate-500">Tu navegador no admite avisos push del sistema.</p>;
  }

  return (
    <div className="space-y-3">
      {subscribed ? (
        <button type="button" className="app-button-secondary w-full sm:w-auto" onClick={disablePush}>
          Desactivar avisos push
        </button>
      ) : (
        <button type="button" className="app-button-secondary w-full sm:w-auto" onClick={enablePush}>
          Activar avisos push
        </button>
      )}

      {status ? <p className="text-sm text-slate-500">{status}</p> : null}
      {subscribed ? <p className="text-sm text-emerald-600">Este dispositivo recibirá avisos aunque no tengas la app abierta en primer plano.</p> : null}
    </div>
  );
}
