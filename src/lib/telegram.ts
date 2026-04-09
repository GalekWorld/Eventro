import "server-only";

type TelegramAlertOptions = {
  title: string;
  lines: string[];
};

function getTelegramConfig() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!botToken || !chatId) {
    return null;
  }

  return { botToken, chatId };
}

function escapeTelegram(text: string) {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

function inferCategory(title: string) {
  const normalized = title.toLowerCase();

  if (normalized.includes("seguridad") || normalized.includes("rate") || normalized.includes("login")) {
    return "SEGURIDAD";
  }

  if (normalized.includes("reporte") || normalized.includes("admin") || normalized.includes("moder")) {
    return "MODERACION";
  }

  if (normalized.includes("local") || normalized.includes("anuncio") || normalized.includes("evento")) {
    return "NEGOCIO";
  }

  return "ALERTA";
}

function formatTimestamp() {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
}

function formatLines(lines: string[]) {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `- ${line}`);
}

export function hasTelegramAlertsConfigured() {
  return Boolean(getTelegramConfig());
}

export async function sendTelegramAlert({ title, lines }: TelegramAlertOptions) {
  const config = getTelegramConfig();
  if (!config) return;

  const category = inferCategory(title);
  const prettyLines = formatLines(lines);
  const message = [
    `*${escapeTelegram(`${category} | ${title}`)}*`,
    "",
    ...prettyLines.map((line) => escapeTelegram(line)),
    "",
    escapeTelegram(`Hora: ${formatTimestamp()}`),
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
  } catch (error) {
    console.error("TELEGRAM_ALERT_ERROR", error);
  }
}
