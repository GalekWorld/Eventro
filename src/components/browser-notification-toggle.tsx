"use client";

import { useEffect, useState } from "react";

export function BrowserNotificationToggle() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);
  }, []);

  async function requestPermission() {
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
  }

  if (permission === "unsupported") {
    return <p className="text-sm text-slate-500">Tu navegador no admite avisos del sistema.</p>;
  }

  if (permission === "granted") {
    return <p className="text-sm text-emerald-600">Los avisos de seguimiento y mensaje privado están activados.</p>;
  }

  if (permission === "denied") {
    return <p className="text-sm text-slate-500">Tienes los avisos bloqueados en el navegador. Tendrás que activarlos manualmente.</p>;
  }

  return (
    <button type="button" className="app-button-secondary w-full sm:w-auto" onClick={requestPermission}>
      Activar avisos del navegador
    </button>
  );
}
