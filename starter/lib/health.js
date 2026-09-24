// Health status reported by /api/health. Monitoring (and the SDLC gates)
// call this endpoint to decide whether production is up.
export function getHealth(now = new Date()) {
  return {
    status: 'ok',
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
    time: now.toISOString(),
  };
}
