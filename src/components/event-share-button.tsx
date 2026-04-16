"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

type EventShareButtonProps = {
  title: string;
  path: string;
};

export function EventShareButton({ title, path }: EventShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? path : new URL(path, window.location.origin).toString();

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      if (typeof window !== "undefined") {
        window.prompt(`Copia el enlace de ${title}`, url);
      }
    }
  }

  return (
    <button type="button" onClick={handleShare} className="app-button-secondary w-full text-center">
      <Share2 className="h-4 w-4" />
      {copied ? "Link copiado" : "Compartir"}
    </button>
  );
}
