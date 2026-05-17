import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Posición no encontrada</h2>
      <p className="text-gray-500 mb-6">Este ticker no está en tu cartera.</p>
      <Link
        href="/"
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
      >
        Volver a la cartera
      </Link>
    </div>
  );
}
