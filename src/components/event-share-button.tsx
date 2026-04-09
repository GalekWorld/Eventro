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
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  return (
    <button type="button" onClick={handleShare} className="app-button-secondary w-full text-center">
      <Share2 className="h-4 w-4" />
      {copied ? "Link copiado" : "Compartir"}
    </button>
  );
}
