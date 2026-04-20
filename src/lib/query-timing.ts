const SHOULD_LOG_QUERY_TIMING = process.env.NODE_ENV !== "production";
const configuredThreshold = Number(process.env.QUERY_TIMING_THRESHOLD_MS);
const SLOW_QUERY_THRESHOLD_MS = Number.isFinite(configuredThreshold) && configuredThreshold > 0 ? configuredThreshold : 150;

export async function measureQuery<T>(label: string, run: () => Promise<T>) {
  if (!SHOULD_LOG_QUERY_TIMING) {
    return run();
  }

  const startedAt = performance.now();
  const result = await run();
  const durationMs = Math.round(performance.now() - startedAt);

  if (durationMs >= SLOW_QUERY_THRESHOLD_MS) {
    console.info(`[query-timing] ${label}: ${durationMs}ms`);
  }

  return result;
}
