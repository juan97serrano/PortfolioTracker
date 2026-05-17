import Link from 'next/link';
import { fetchPortfolio } from '@/lib/data';
import { formatDateTime } from '@/lib/utils';
import { SummaryCards } from '@/components/SummaryCards';
import { AllocationChart } from '@/components/AllocationChart';
import { ReturnChart } from '@/components/ReturnChart';
import { PositionTable } from '@/components/PositionTable';
import { RefreshButton } from '@/components/RefreshButton';
import { AlertCircle, Download } from 'lucide-react';
import type { PortfolioSummary } from '@/lib/types';

export const revalidate = 0;

function SetupGuide() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-lg text-left shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3">Configuración inicial</h3>
      <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
        <li>
          <a href="/api/template" className="text-blue-600 underline" download>
            Descarga la plantilla Excel
          </a>
          {' '}y rellena tus transacciones
        </li>
        <li>Sube el archivo a Google Drive o impórtalo en Google Sheets</li>
        <li>Comparte el archivo como <strong>público (solo lectura)</strong></li>
        <li>
          Copia el enlace y añádelo como variable de entorno:
          <pre className="bg-gray-50 border border-gray-200 rounded p-2 mt-1 text-xs overflow-x-auto">
            PORTFOLIO_URL=https://drive.google.com/file/d/TU_ID/view
          </pre>
        </li>
        <li>Despliega en Vercel añadiendo la variable en el dashboard</li>
      </ol>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
        <h2 className="font-semibold text-red-800 mb-2">Error al cargar la cartera</h2>
        <p className="text-red-600 text-sm">{message}</p>
        <p className="text-gray-500 text-xs mt-3">
          Asegúrate de haber configurado la variable{' '}
          <code className="bg-gray-100 px-1 rounded">PORTFOLIO_URL</code>.
        </p>
      </div>
      <SetupGuide />
    </div>
  );
}

function Dashboard({ summary }: { summary: PortfolioSummary }) {
  return (
    <div className="space-y-6">
      <SummaryCards summary={summary} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AllocationChart positions={summary.positions} />
        <ReturnChart positions={summary.positions} />
      </div>
      <PositionTable positions={summary.positions} />
    </div>
  );
}

export default async function Home() {
  let summary: PortfolioSummary | null = null;
  let error: string | null = null;

  try {
    summary = await fetchPortfolio();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Error desconocido';
  }

  return (
    <>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Mi Cartera</h1>
          {summary && (
            <p className="text-xs text-gray-400 mt-0.5">
              Actualizado: {formatDateTime(summary.lastUpdated)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/api/template"
            download
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Plantilla
          </Link>
          <RefreshButton />
        </div>
      </header>

      {error && <ErrorState message={error} />}
      {summary && <Dashboard summary={summary} />}
    </>
  );
}
