const fmt = (n) => new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

function StatCard({ label, value, sub, color = 'teal' }) {
  const colors = {
    teal: 'bg-[#1D9E75] text-white',
    white: 'bg-white text-gray-800',
    green: 'bg-green-500 text-white',
    amber: 'bg-amber-400 text-white',
  }
  return (
    <div className={`rounded-2xl p-4 ${colors[color]} shadow-sm`}>
      <p className={`text-xs font-medium uppercase tracking-wide ${color === 'white' ? 'text-gray-500' : 'text-white/80'}`}>{label}</p>
      <p className={`text-2xl font-bold font-mono mt-1 ${color === 'white' ? 'text-gray-900' : ''}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${color === 'white' ? 'text-gray-500' : 'text-white/70'}`}>{sub}</p>}
    </div>
  )
}

export default function Dashboard({ items }) {
  const totalItems = items.length
  const sold = items.filter(i => i.soldMXN != null)
  const unsold = items.filter(i => i.soldMXN == null)

  const realizedProfit = sold.reduce((s, i) => s + (i.profitMXN || 0), 0)
  const totalInvested = items.reduce((s, i) => s + (i.costMXN || 0), 0)
  const potentialProfit = unsold.reduce((s, i) => s + ((i.targetMXN || 0) - (i.costMXN || 0)), 0)

  const soldPct = totalItems > 0 ? (sold.length / totalItems) * 100 : 0

  // Top 5 by profit (sold items sorted by profitMXN)
  const topItems = [...sold]
    .sort((a, b) => (b.profitMXN || 0) - (a.profitMXN || 0))
    .slice(0, 5)

  const maxAbsProfit = topItems.length > 0
    ? Math.max(...topItems.map(i => Math.abs(i.profitMXN || 0)), 1)
    : 1

  return (
    <div className="p-4 space-y-4">
      <div className="pt-2 pb-1">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Inventory overview</p>
      </div>

      {/* 2x2 Stat Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Items" value={totalItems} color="teal" />
        <StatCard label="Realized Profit" value={`$${fmt(realizedProfit)}`} sub="MXN" color="green" />
        <StatCard label="Total Invested" value={`$${fmt(totalInvested)}`} sub="MXN" color="white" />
        <StatCard label="Potential Profit" value={`$${fmt(potentialProfit)}`} sub="from unsold" color="amber" />
      </div>

      {/* Sold vs Unsold */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-semibold text-gray-700">Sold vs Unsold</p>
          <p className="text-xs text-gray-500">{sold.length} / {totalItems}</p>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1D9E75] rounded-full transition-all duration-500"
            style={{ width: `${soldPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-[#1D9E75] font-medium">{sold.length} Sold ({soldPct.toFixed(0)}%)</span>
          <span className="text-xs text-gray-400 font-medium">{unsold.length} Unsold</span>
        </div>
      </div>

      {/* Profit Bar Chart */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-sm font-semibold text-gray-700 mb-3">Top Profit by Item</p>
        {topItems.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No sold items yet</p>
        ) : (
          <div className="space-y-2.5">
            {topItems.map(item => {
              const profit = item.profitMXN || 0
              const pct = (Math.abs(profit) / maxAbsProfit) * 100
              const isProfit = profit >= 0
              return (
                <div key={item.id}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600 truncate max-w-[180px]">{item.name}</span>
                    <span className={`text-xs font-mono font-semibold ${isProfit ? 'text-green-600' : 'text-red-500'}`}>
                      {isProfit ? '+' : ''}{fmt(profit)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isProfit ? 'bg-green-400' : 'bg-red-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
