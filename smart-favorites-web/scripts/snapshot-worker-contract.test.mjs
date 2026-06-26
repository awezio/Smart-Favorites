import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

const root = cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

const processor = read("lib/snapshots/processor.ts");
assert.match(
  processor,
  /enqueueBookmarkSnapshot[\s\S]*processBookmarkSnapshotJob[\s\S]*processBookmarkSnapshots/,
  "snapshot processor must expose enqueue and batch processing helpers"
);
assert.match(
  processor,
  /snapshot_status[\s\S]*pending[\s\S]*capturing/,
  "snapshot processor must drain pending and stale capturing bookmarks"
);

const pagePrepare = read("lib/snapshots/page-prepare.ts");
assert.match(
  pagePrepare,
  /maskSensitiveSnapshotText/,
  "page prepare must mask sensitive text before screenshots"
);
assert.match(
  pagePrepare,
  /detectBotChallengePage/,
  "page prepare must detect bot verification pages"
);

const bookmarkSnapshot = read("lib/snapshots/bookmark-snapshot.ts");
assert.match(
  bookmarkSnapshot,
  /preparePageForSnapshot/,
  "bookmark snapshot capture must use shared page preparation"
);

const snapshotRoute = read("app/api/bookmarks/snapshot-page/route.ts");
assert.match(snapshotRoute, /\bafter\s*\(/, "snapshot-page POST must queue work with after()");
assert.match(
  snapshotRoute,
  /enqueueBookmarkSnapshot[\s\S]*runQueuedBookmarkSnapshot/,
  "snapshot-page POST must enqueue and run queued snapshot jobs"
);
assert.match(snapshotRoute, /status:\s*202/, "snapshot-page POST must return 202 Accepted");

const cronRoute = read("app/api/cron/process-snapshots/route.ts");
assert.match(
  cronRoute,
  /processBookmarkSnapshots/,
  "snapshot cron route must reuse the shared snapshot processor"
);

const describeBookmarkLib = read("lib/ai/describe-bookmark.ts");
assert.match(
  describeBookmarkLib,
  /snapshotMode === "sync"[\s\S]*runQueuedBookmarkSnapshot/,
  "batch describe must capture snapshots synchronously one job at a time"
);
assert.match(
  describeBookmarkLib,
  /batch[\s\S]*sync/,
  "describe bookmark helper must map batch requests to sync snapshot mode"
);

const describeRoute = read("app/api/ai/describe/route.ts");
assert.match(
  describeRoute,
  /describeBookmark[\s\S]*resolveDescribeSnapshotMode/,
  "AI describe route must delegate bookmark work to shared describe helper"
);
assert.match(
  describeRoute,
  /asyncSnapshotJob[\s\S]*after\s*\(/,
  "single describe requests must still queue snapshots asynchronously"
);
assert.doesNotMatch(
  describeRoute,
  /await captureBookmarkSnapshot/,
  "AI describe must not block on synchronous snapshot capture directly"
);

const showcaseMerge = read("lib/showcase-merge.ts");
assert.match(
  showcaseMerge,
  /SHOWCASE_STATIC_FALLBACKS/,
  "showcase merge must keep static SVG fallbacks for hybrid homepage cards"
);

const workerScript = read("scripts/snapshot-worker.mjs");
assert.match(
  workerScript,
  /\/api\/cron\/process-snapshots/,
  "standalone snapshot worker must call the cron processing endpoint"
);

const vercelConfig = read("vercel.json");
assert.match(
  vercelConfig,
  /process-snapshots/,
  "vercel config must schedule snapshot cron processing"
);

console.log("snapshot-worker contract tests passed");
