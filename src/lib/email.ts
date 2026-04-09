import "server-only";

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export function isEmailDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail({ to, subject, html, text }: SendEmailArgs) {
  if (!isEmailDeliveryConfigured()) {
    throw new Error("El envío de email no está configurado todavía.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      text,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || "No se pudo enviar el email.");
  }
}
