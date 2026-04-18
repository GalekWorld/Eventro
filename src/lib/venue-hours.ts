import { db } from "@/lib/db";

const VENUE_HOURS_TYPE = "venue_hours";

const WEEK_DAYS = [
  { key: "monday", label: "Lunes", shortLabel: "Lun" },
  { key: "tuesday", label: "Martes", shortLabel: "Mar" },
  { key: "wednesday", label: "Miercoles", shortLabel: "Mie" },
  { key: "thursday", label: "Jueves", shortLabel: "Jue" },
  { key: "friday", label: "Viernes", shortLabel: "Vie" },
  { key: "saturday", label: "Sabado", shortLabel: "Sab" },
  { key: "sunday", label: "Domingo", shortLabel: "Dom" },
] as const;

export type VenueHoursDayKey = (typeof WEEK_DAYS)[number]["key"];

export type VenueHoursDay = {
  day: VenueHoursDayKey;
  label: string;
  shortLabel: string;
  opensAt: string;
  closesAt: string;
  closed: boolean;
};

export const defaultVenueHours: VenueHoursDay[] = WEEK_DAYS.map((day) => ({
  day: day.key,
  label: day.label,
  shortLabel: day.shortLabel,
  opensAt: "18:00",
  closesAt: "03:00",
  closed: day.key === "monday" || day.key === "tuesday",
}));

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function normalizeTime(value: string, fallback: string) {
  return isValidTime(value) ? value : fallback;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getDayIndex(day: VenueHoursDayKey) {
  return WEEK_DAYS.findIndex((item) => item.key === day);
}

function normalizeVenueHours(input?: unknown): VenueHoursDay[] {
  if (!Array.isArray(input)) {
    return defaultVenueHours;
  }

  return defaultVenueHours.map((fallbackDay) => {
    const rawDay = input.find((item) => {
      if (!item || typeof item !== "object") return false;
      return "day" in item && item.day === fallbackDay.day;
    }) as Partial<VenueHoursDay> | undefined;

    return {
      ...fallbackDay,
      opensAt: normalizeTime(String(rawDay?.opensAt ?? fallbackDay.opensAt), fallbackDay.opensAt),
      closesAt: normalizeTime(String(rawDay?.closesAt ?? fallbackDay.closesAt), fallbackDay.closesAt),
      closed: Boolean(rawDay?.closed),
    };
  });
}

export function parseVenueHoursFromFormData(formData: FormData) {
  return defaultVenueHours.map((fallbackDay) => {
    const prefix = `venueHours_${fallbackDay.day}`;
    const opensAt = String(formData.get(`${prefix}_opensAt`) ?? fallbackDay.opensAt).trim();
    const closesAt = String(formData.get(`${prefix}_closesAt`) ?? fallbackDay.closesAt).trim();
    const closed = String(formData.get(`${prefix}_closed`) ?? "") === "on";

    return {
      ...fallbackDay,
      opensAt: normalizeTime(opensAt, fallbackDay.opensAt),
      closesAt: normalizeTime(closesAt, fallbackDay.closesAt),
      closed,
    };
  });
}

export async function saveVenueHours(userId: string, hours: VenueHoursDay[]) {
  await db.securityEvent.create({
    data: {
      type: VENUE_HOURS_TYPE,
      key: userId,
      userId,
      message: "updated",
      metadata: JSON.stringify({ hours }),
    },
  });
}

export async function getVenueHoursForUser(userId: string) {
  const latest = await db.securityEvent.findFirst({
    where: {
      type: VENUE_HOURS_TYPE,
      key: userId,
    },
    orderBy: { createdAt: "desc" },
    select: {
      metadata: true,
    },
  });

  if (!latest?.metadata) {
    return defaultVenueHours;
  }

  try {
    const parsed = JSON.parse(latest.metadata) as { hours?: unknown };
    return normalizeVenueHours(parsed.hours);
  } catch {
    return defaultVenueHours;
  }
}

export async function getVenueHoursMapForUsers(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, VenueHoursDay[]>();
  }

  const events = await db.securityEvent.findMany({
    where: {
      type: VENUE_HOURS_TYPE,
      key: { in: userIds },
    },
    orderBy: { createdAt: "desc" },
    select: {
      key: true,
      metadata: true,
    },
  });

  const resolved = new Map<string, VenueHoursDay[]>();

  for (const event of events) {
    if (!event.key || resolved.has(event.key)) {
      continue;
    }

    try {
      const parsed = JSON.parse(event.metadata ?? "{}") as { hours?: unknown };
      resolved.set(event.key, normalizeVenueHours(parsed.hours));
    } catch {
      resolved.set(event.key, defaultVenueHours);
    }
  }

  for (const userId of userIds) {
    if (!resolved.has(userId)) {
      resolved.set(userId, defaultVenueHours);
    }
  }

  return resolved;
}

export function getVenueHoursSummary(hours: VenueHoursDay[]) {
  const openDays = hours.filter((day) => !day.closed);

  if (openDays.length === 0) {
    return "Horario pendiente";
  }

  if (openDays.length === 7) {
    const firstDay = openDays[0];
    const sameSchedule = openDays.every((day) => day.opensAt === firstDay.opensAt && day.closesAt === firstDay.closesAt);

    if (sameSchedule) {
      return `Todos los dias ${firstDay.opensAt}-${firstDay.closesAt}`;
    }
  }

  const today = hours[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  if (!today || today.closed) {
    return "Cerrado hoy";
  }

  return `Hoy ${today.opensAt}-${today.closesAt}`;
}

export function isVenueOpenNow(hours: VenueHoursDay[], now = new Date()) {
  const jsDay = now.getDay();
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1;
  const today = hours[todayIndex];

  if (!today || today.closed) {
    return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = toMinutes(today.opensAt);
  const closeMinutes = toMinutes(today.closesAt);

  if (openMinutes === closeMinutes) {
    return true;
  }

  if (openMinutes < closeMinutes) {
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }

  if (currentMinutes >= openMinutes) {
    return true;
  }

  const previousDay = hours[(todayIndex + 6) % 7];
  if (!previousDay || previousDay.closed) {
    return false;
  }

  const previousCloseMinutes = toMinutes(previousDay.closesAt);
  const previousOpenMinutes = toMinutes(previousDay.opensAt);

  if (previousOpenMinutes > previousCloseMinutes) {
    return currentMinutes < previousCloseMinutes;
  }

  return false;
}

export function formatVenueHoursRows(hours: VenueHoursDay[]) {
  return hours.map((day) => ({
    day: day.label,
    value: day.closed ? "Cerrado" : `${day.opensAt} - ${day.closesAt}`,
  }));
}
