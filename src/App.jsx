import { useState, useEffect, useCallback, useRef } from 'react'
import Dashboard from './components/Dashboard'
import Items from './components/Items'
import Gallery from './components/Gallery'
import AddItem from './components/AddItem'
import BottomTabBar from './components/BottomTabBar'

const LEGACY_STORAGE_KEY = 'shelby_inventory'
const USD_RATE = 0.0577

function computeItem(data) {
  const costMXN = Number(data.costMXN) || 0
  const targetMXN = Number(data.targetMXN) || 0
  const soldMXN = data.soldMXN != null && data.soldMXN !== '' ? Number(data.soldMXN) : null
  return {
    ...data,
    costMXN,
    targetMXN,
    soldMXN,
    costUSD: parseFloat((costMXN * USD_RATE).toFixed(2)),
    diffMXN: soldMXN != null ? soldMXN - targetMXN : null,
    profitMXN: soldMXN != null ? soldMXN - costMXN : null,
  }
}

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  })
  if (res.status === 204) return null
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? `Request failed: ${res.status}`)
  return json
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncError, setSyncError] = useState(null)

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    apiFetch('/api/items')
      .then(async ({ items: fetched }) => {
        // One-time migration: if DB is empty, import whatever was in localStorage
        if (fetched.length === 0) {
          const migrated = migrateFromLocalStorage()
          if (migrated.length > 0) {
            const saved = await Promise.all(
              migrated.map(item =>
                apiFetch('/api/items', { method: 'POST', body: item })
                  .then(({ item: saved }) => computeItem(saved))
                  .catch(() => null)
              )
            )
            setItems(saved.filter(Boolean))
            localStorage.removeItem(LEGACY_STORAGE_KEY)
            return
          }
        }
        setItems(fetched.map(computeItem))
      })
      .catch(err => setSyncError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Pull localStorage items for one-time migration (does not write anything).
  function migrateFromLocalStorage() {
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  // ── Dismiss sync error ───────────────────────────────────────────────────────
  const dismissError = useCallback(() => setSyncError(null), [])

  // ── Add ─────────────────────────────────────────────────────────────────────
  const addItem = useCallback(async (data) => {
    const newData = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      photo: null,
      ...data,
    }
    const optimistic = computeItem(newData)

    // Optimistic insert
    setItems(prev => [optimistic, ...prev])

    try {
      const { item: confirmed } = await apiFetch('/api/items', { method: 'POST', body: newData })
      // Replace optimistic with server-confirmed item (id stays the same, but ensures consistency)
      setItems(prev => prev.map(i => i.id === newData.id ? computeItem(confirmed) : i))
    } catch (err) {
      setItems(prev => prev.filter(i => i.id !== newData.id)) // rollback
      setSyncError('Failed to save item: ' + err.message)
    }
  }, [])

  // ── Update ───────────────────────────────────────────────────────────────────
  // Capture the pre-update snapshot in a ref so the rollback value is always fresh.
  const prevItemsRef = useRef(items)
  useEffect(() => { prevItemsRef.current = items }, [items])

  const updateItem = useCallback(async (id, data) => {
    const snapshot = prevItemsRef.current
    setItems(prev => prev.map(i => i.id === id ? computeItem({ ...i, ...data }) : i))

    try {
      const { item: confirmed } = await apiFetch(`/api/items/${id}`, { method: 'PATCH', body: data })
      setItems(prev => prev.map(i => i.id === id ? computeItem(confirmed) : i))
    } catch (err) {
      setItems(snapshot) // rollback
      setSyncError('Failed to update item: ' + err.message)
    }
  }, [])

  // ── Delete ───────────────────────────────────────────────────────────────────
  const deleteItem = useCallback(async (id) => {
    const snapshot = prevItemsRef.current
    setItems(prev => prev.filter(i => i.id !== id))

    try {
      await apiFetch(`/api/items/${id}`, { method: 'DELETE' })
    } catch (err) {
      setItems(snapshot) // rollback
      setSyncError('Failed to delete item: ' + err.message)
    }
  }, [])

  const navigateTo = useCallback((tab) => setActiveTab(tab), [])
  const tabProps = { items, addItem, updateItem, deleteItem, navigateTo }

  return (
    <div className="flex justify-center bg-gray-100 min-h-screen">
      <div className="w-full max-w-[430px] bg-gray-50 min-h-screen flex flex-col relative">

        {/* Sync error banner */}
        {syncError && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between gap-2">
            <p className="text-xs text-red-700 flex-1">{syncError}</p>
            <button onClick={dismissError} className="text-red-400 hover:text-red-700 text-lg leading-none">✕</button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <svg className="w-8 h-8 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                <span className="text-sm">Loading inventory…</span>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <Dashboard {...tabProps} />}
              {activeTab === 'items'     && <Items     {...tabProps} />}
              {activeTab === 'gallery'   && <Gallery   {...tabProps} />}
              {activeTab === 'add'       && <AddItem   {...tabProps} />}
            </>
          )}
        </main>

        <BottomTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </div>
  )
}
