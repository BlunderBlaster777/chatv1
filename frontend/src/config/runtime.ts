function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

const apiOrigin = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const productionDefault = import.meta.env.PROD;

export const runtimeConfig = {
  apiOrigin,
  realtimeEnabled: parseBoolean(import.meta.env.VITE_REALTIME_ENABLED, !productionDefault),
  fileUploadsEnabled: parseBoolean(import.meta.env.VITE_FILE_UPLOADS_ENABLED, !productionDefault),
  pollingIntervalMs: Math.max(2000, Number.parseInt(import.meta.env.VITE_POLL_INTERVAL_MS ?? '5000', 10) || 5000),
};