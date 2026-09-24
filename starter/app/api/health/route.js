import { getHealth } from '@/lib/health';

export const dynamic = 'force-dynamic';

export function GET() {
  const health = getHealth();
  return Response.json(health, { status: health.status === 'ok' ? 200 : 500 });
}
