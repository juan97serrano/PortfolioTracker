import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { fetchPortfolio } from '@/lib/data';
import { CompareView } from '@/components/CompareView';

export const revalidate = 0;

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  const summary = await fetchPortfolio();

  return (
    <>
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a la cartera
        </Link>
      </div>
      <CompareView positions={summary.positions} initialA={a} initialB={b} />
    </>
  );
}
