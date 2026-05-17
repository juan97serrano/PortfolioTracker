export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between mb-6">
        <div>
          <div className="h-8 w-36 bg-gray-200 rounded-lg" />
          <div className="h-3 w-48 bg-gray-100 rounded mt-2" />
        </div>
        <div className="h-8 w-24 bg-gray-100 rounded-lg" />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-28" />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 h-80" />
        <div className="bg-white rounded-2xl border border-gray-100 h-80" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 h-64" />
    </div>
  );
}
