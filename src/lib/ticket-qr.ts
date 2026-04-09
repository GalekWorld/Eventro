import "server-only";

import QRCode from "qrcode";

export async function getTicketQrDataUrl(payload: string) {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 720,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
}
