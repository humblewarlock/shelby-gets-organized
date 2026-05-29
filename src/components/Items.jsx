import { useState } from 'react'

const fmt = (n) => n == null ? '—' : new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

function ItemCard({ item, onDelete }) {
  const isSold = item.soldMXN != null
  const estProfit = item.targetMXN - item.costMXN

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
          <div className="flex items-center gap-1 mt-0.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-gray-400 flex-shrink-0">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            <span className="text-xs text-gray-500 truncate">{item.source || 'No source'}</span>
          </div>
        </div>
        <button
          onClick={() => onDelete(item.id)}
          className="ml-2 text-gray-300 hover:text-red-400 transition-colors p-1"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Price grid 2x2 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { label: 'Paid', value: `$${fmt(item.costMXN)}`, sub: 'MXN' },
          { label: 'USD equiv', value: `$${item.costUSD}`, sub: 'USD' },
          { label: 'Target', value: `$${fmt(item.targetMXN)}`, sub: 'MXN' },
          isSold
            ? { label: 'Sold', value: `$${fmt(item.soldMXN)}`, sub: 'MXN', highlight: true }
            : { label: 'Est. Profit', value: `$${fmt(estProfit)}`, sub: 'MXN' },
        ].map((cell, i) => (
          <div key={i} className={`rounded-xl p-2.5 ${cell.highlight ? 'bg-[#D1F5E9]' : 'bg-gray-50'}`}>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">{cell.label}</p>
            <p className={`font-mono font-semibold text-sm ${cell.highlight ? 'text-[#1D9E75]' : 'text-gray-900'}`}>{cell.value}</p>
            <p className="text-[10px] text-gray-400">{cell.sub}</p>
          </div>
        ))}
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
          isSold ? 'bg-[#D1F5E9] text-[#1D9E75]' : 'bg-gray-100 text-gray-500'
        }`}>
          {isSold ? 'Sold' : 'Unsold'}
        </span>
        {isSold && item.diffMXN != null && (
          <span className={`text-xs font-mono font-medium ${item.diffMXN >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {item.diffMXN >= 0 ? '+' : ''}{fmt(item.diffMXN)} vs target
          </span>
        )}
        {isSold && item.profitMXN != null && (
          <span className={`text-xs font-mono font-semibold ml-auto ${item.profitMXN >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {item.profitMXN >= 0 ? '+' : ''}{fmt(item.profitMXN)} profit
          </span>
        )}
      </div>
    </div>
  )
}

export default function Items({ items, deleteItem }) {
  const [search, setSearch] = useState('')
  const [confirmId, setConfirmId] = useState(null)

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.source || '').toLowerCase().includes(search.toLowerCase())
  )

  const pendingItem = items.find(i => i.id === confirmId)

  const handleConfirmDelete = () => {
    deleteItem(confirmId)
    setConfirmId(null)
  }

  return (
    <div className="p-4 space-y-3">
      <div className="pt-2 pb-1">
        <h1 className="text-xl font-bold text-gray-900">Items</h1>
        <p className="text-sm text-gray-500">{items.length} items in inventory</p>
      </div>

      <div className="relative">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or source…"
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">📦</p>
          <p className="text-sm">{items.length === 0 ? 'No items yet. Add your first item!' : 'No items match your search.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <ItemCard key={item.id} item={item} onDelete={setConfirmId} />
          ))}
        </div>
      )}

      {/* Confirmation modal */}
      {confirmId && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setConfirmId(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="space-y-1">
              <h2 className="text-base font-bold text-gray-900">Delete item?</h2>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-gray-700">"{pendingItem?.name}"</span>?
                This can't be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold active:scale-95 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
