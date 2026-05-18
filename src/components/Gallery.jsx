import { useState } from 'react'

const FILTERS = ['All', 'Unsold', 'Sold']

const fmt = (n) => new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

function GalleryCard({ item }) {
  const isSold = item.soldMXN != null
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="aspect-square bg-gray-100 relative">
        {item.photo ? (
          <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 text-gray-300">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        <span className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          isSold ? 'bg-[#1D9E75] text-white' : 'bg-gray-800/70 text-white'
        }`}>
          {isSold ? 'Sold' : 'Unsold'}
        </span>
      </div>
      <div className="p-2.5">
        <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
        <p className="text-[10px] text-gray-400 truncate">{item.source || '—'}</p>
        <p className="text-xs font-mono font-semibold text-[#1D9E75] mt-1">${fmt(item.costMXN)}</p>
      </div>
    </div>
  )
}

export default function Gallery({ items }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [activeIdx, setActiveIdx] = useState(0)

  const filtered = items.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.source || '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' ||
      (filter === 'Sold' && i.soldMXN != null) ||
      (filter === 'Unsold' && i.soldMXN == null)
    return matchSearch && matchFilter
  })

  return (
    <div className="p-4 space-y-3">
      <div className="pt-2 pb-1">
        <h1 className="text-xl font-bold text-gray-900">Gallery</h1>
        <p className="text-sm text-gray-500">{filtered.length} items</p>
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

      {/* Pill filter with animated slider */}
      <div className="relative bg-gray-100 rounded-full p-1 flex">
        <div
          className="absolute top-1 bottom-1 bg-white rounded-full shadow-sm transition-all duration-200"
          style={{
            width: `calc(${100 / FILTERS.length}% - 4px)`,
            left: `calc(${(activeIdx / FILTERS.length) * 100}% + 4px)`,
          }}
        />
        {FILTERS.map((f, i) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setActiveIdx(i) }}
            className={`flex-1 relative z-10 text-xs font-medium py-1.5 rounded-full transition-colors ${
              filter === f ? 'text-gray-900' : 'text-gray-500'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">🖼️</p>
          <p className="text-sm">{items.length === 0 ? 'No items yet.' : 'No items match your filter.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(item => (
            <GalleryCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
