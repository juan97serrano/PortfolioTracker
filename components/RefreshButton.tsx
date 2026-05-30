'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRefresh() {
    setLoading(true);
    try {
      await fetch('/api/refresh', { method: 'POST' });
    } catch {
      // ignore — we still want to refresh the route
    }
    router.refresh();
    setTimeout(() => setLoading(false), 1500);
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50"
    >
      <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
      {loading ? 'Actualizando...' : 'Actualizar'}
    </button>
  );
}
