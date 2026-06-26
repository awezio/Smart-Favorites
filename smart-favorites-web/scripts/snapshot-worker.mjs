const DEFAULT_LIMIT = 2;
const POLL_INTERVAL_MS = 15_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseLimit() {
  const raw = process.argv.find((arg) => arg.startsWith("--limit="));
  if (!raw) return DEFAULT_LIMIT;
  const value = Number(raw.slice("--limit=".length));
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_LIMIT;
}

function workerBaseUrl() {
  return (
    process.env.SNAPSHOT_WORKER_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

async function runOnce(limit) {
  const secret = process.env.CRON_SECRET;
  const headers = secret ? { Authorization: `Bearer ${secret}` } : {};
  const response = await fetch(
    `${workerBaseUrl()}/api/cron/process-snapshots?limit=${limit}`,
    { headers }
  );
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `Worker request failed (${response.status})`);
  }

  const processed = Array.isArray(payload.processed) ? payload.processed : [];
  if (processed.length === 0) {
    console.log("[snapshot-worker] idle");
    return;
  }

  for (const result of processed) {
    console.log(
      `[snapshot-worker] ${result.id} -> ${result.status}${
        result.error ? ` (${result.error})` : ""
      }`
    );
  }
}

async function main() {
  const once = process.argv.includes("--once");
  const limit = parseLimit();

  console.log(
    `[snapshot-worker] base=${workerBaseUrl()} limit=${limit} mode=${
      once ? "once" : "loop"
    }`
  );

  do {
    await runOnce(limit);
    if (!once) {
      await sleep(POLL_INTERVAL_MS);
    }
  } while (!once);
}

main().catch((error) => {
  console.error("[snapshot-worker] fatal", error);
  process.exitCode = 1;
});
