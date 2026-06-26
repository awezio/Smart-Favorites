import "server-only";

export function enforceCronAuth(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return;
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : request.headers.get("x-cron-secret");

  if (!token || token !== secret) {
    throw new Error("Unauthorized cron request");
  }
}
