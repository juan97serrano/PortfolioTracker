import type { Metadata } from 'next';
import { buildLiveSnapshot } from '@/lib/live';
import { LiveDashboard } from '@/components/live/LiveDashboard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Panel en vivo · Portfolio Tracker',
};

export default async function LivePage() {
  const initial = await buildLiveSnapshot().catch(() => null);
  return <LiveDashboard initial={initial} />;
}
