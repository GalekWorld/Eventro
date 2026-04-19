import { getEventVisibilityCutoffDate } from "@/lib/event-visibility";

const EVENT_PURGE_INTERVAL_MS = 5 * 60 * 1000;
const IS_PRODUCTION_BUILD = process.env.NEXT_PHASE === "phase-production-build";

const eventMaintenanceState = globalThis as typeof globalThis & {
  __eventroEventPurgeAt?: number;
};

export async function purgeExpiredEvents() {
  if (IS_PRODUCTION_BUILD) {
    return;
  }

  const now = Date.now();
  if (eventMaintenanceState.__eventroEventPurgeAt && now - eventMaintenanceState.__eventroEventPurgeAt < EVENT_PURGE_INTERVAL_MS) {
    return;
  }

  eventMaintenanceState.__eventroEventPurgeAt = now;
  void getEventVisibilityCutoffDate();
}
