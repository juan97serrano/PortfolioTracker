export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-5 w-32 bg-gray-200 rounded mb-6" />
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-48 bg-gray-100 rounded" />
        </div>
        <div className="space-y-2 text-right">
          <div className="h-8 w-24 bg-gray-200 rounded" />
          <div className="h-4 w-16 bg-gray-100 rounded ml-auto" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 h-24" />
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 h-20" />
      <div className="bg-white rounded-2xl border border-gray-100 h-72" />
      <div className="bg-white rounded-2xl border border-gray-100 h-48" />
    </div>
  );
}
