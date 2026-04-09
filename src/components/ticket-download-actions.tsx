"use client";

import { useState } from "react";
import { Download, FileImage, FileText } from "lucide-react";

type TicketDownloadActionsProps = {
  title: string;
  venueLabel: string;
  ticketName: string;
  ticketPriceLabel: string;
  includedDrinks: number;
  description?: string | null;
  dateLabel: string;
  locationLabel: string;
  qrCode: string;
  qrDataUrl: string;
  statusLabel: string;
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, currentY);
  }

  return currentY;
}

async function buildTicketCanvas(props: TicketDownloadActionsProps) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1800;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No se pudo preparar la imagen de la entrada.");
  }

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(60, 60, 1080, 1680, 40);
  ctx.fill();
  ctx.stroke();

  const gradient = ctx.createLinearGradient(60, 60, 1140, 380);
  gradient.addColorStop(0, "#0f172a");
  gradient.addColorStop(1, "#0369a1");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(60, 60, 1080, 330, 40);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px Arial";
  ctx.fillText("ENTRADA EVENTRO", 110, 145);
  ctx.font = "28px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.fillText(props.venueLabel, 110, 195);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 56px Arial";
  wrapText(ctx, props.title, 110, 500, 620, 66);

  ctx.font = "bold 30px Arial";
  ctx.fillStyle = "#0369a1";
  ctx.fillText(props.statusLabel, 110, 620);

  ctx.font = "28px Arial";
  ctx.fillStyle = "#334155";
  ctx.fillText(`${props.ticketName} · ${props.ticketPriceLabel}`, 110, 690);
  ctx.fillText(`${props.includedDrinks} consumiciones incluidas`, 110, 740);
  ctx.fillText(props.dateLabel, 110, 790);
  wrapText(ctx, props.locationLabel, 110, 840, 620, 40);

  if (props.description) {
    ctx.font = "24px Arial";
    ctx.fillStyle = "#64748b";
    wrapText(ctx, props.description, 110, 930, 620, 34);
  }

  const qrImage = new Image();
  qrImage.src = props.qrDataUrl;
  await new Promise<void>((resolve, reject) => {
    qrImage.onload = () => resolve();
    qrImage.onerror = () => reject(new Error("No se pudo cargar el QR."));
  });

  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.roundRect(760, 470, 280, 280, 28);
  ctx.fill();
  ctx.drawImage(qrImage, 790, 500, 220, 220);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 30px Arial";
  ctx.fillText("Código", 760, 840);
  ctx.font = "bold 24px Arial";
  wrapText(ctx, props.qrCode, 760, 885, 280, 30);

  ctx.strokeStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.moveTo(100, 1100);
  ctx.lineTo(1100, 1100);
  ctx.stroke();

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 34px Arial";
  ctx.fillText("Información importante", 110, 1180);

  ctx.font = "26px Arial";
  ctx.fillStyle = "#475569";
  wrapText(ctx, "Esta entrada es personal, final y no admite devoluciones. Enséñala en puerta para validar el acceso.", 110, 1245, 930, 38);
  wrapText(ctx, "Puedes guardarla en el móvil y presentarla aunque no tengas cobertura en ese momento.", 110, 1355, 930, 38);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "24px Arial";
  ctx.fillText("Generada desde Eventro", 110, 1660);

  return canvas;
}

export function TicketDownloadActions(props: TicketDownloadActionsProps) {
  const [busy, setBusy] = useState<"jpeg" | "pdf" | null>(null);

  async function handleDownloadJpeg() {
    try {
      setBusy("jpeg");
      const canvas = await buildTicketCanvas(props);
      const href = canvas.toDataURL("image/jpeg", 0.95);
      const link = document.createElement("a");
      link.href = href;
      link.download = `${props.title.toLowerCase().replace(/[^a-z0-9]+/gi, "-") || "entrada"}.jpg`;
      link.click();
    } finally {
      setBusy(null);
    }
  }

  async function handleDownloadPdf() {
    try {
      setBusy("pdf");
      const canvas = await buildTicketCanvas(props);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const popup = window.open("", "_blank", "noopener,noreferrer");

      if (!popup) {
        throw new Error("Tu navegador ha bloqueado la ventana de impresión.");
      }

      popup.document.write(`
        <html>
          <head>
            <title>Entrada ${props.title}</title>
            <style>
              body { margin: 0; background: #e2e8f0; display: flex; justify-content: center; padding: 24px; }
              img { width: 100%; max-width: 840px; height: auto; box-shadow: 0 20px 60px rgba(15,23,42,.16); border-radius: 18px; background: white; }
              @media print {
                body { background: white; padding: 0; }
                img { max-width: 100%; box-shadow: none; border-radius: 0; }
              }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" alt="Entrada" />
            <script>
              window.onload = function () {
                window.focus();
                window.print();
              };
            </script>
          </body>
        </html>
      `);
      popup.document.close();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button type="button" onClick={handleDownloadJpeg} className="app-button-secondary w-full" disabled={busy !== null}>
        <FileImage className="h-4 w-4" />
        {busy === "jpeg" ? "Preparando JPEG..." : "Descargar JPEG"}
      </button>
      <button type="button" onClick={handleDownloadPdf} className="app-button-primary w-full" disabled={busy !== null}>
        {busy === "pdf" ? <Download className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
        {busy === "pdf" ? "Preparando PDF..." : "Guardar PDF"}
      </button>
    </div>
  );
}
