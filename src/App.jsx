import { useState, useEffect, useCallback } from 'react'
import Dashboard from './components/Dashboard'
import Items from './components/Items'
import Gallery from './components/Gallery'
import AddItem from './components/AddItem'
import BottomTabBar from './components/BottomTabBar'

const STORAGE_KEY = 'shelby_inventory'
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

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addItem = useCallback((data) => {
    const item = computeItem({
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      photo: null,
      ...data,
    })
    setItems(prev => [item, ...prev])
  }, [])

  const updateItem = useCallback((id, data) => {
    setItems(prev => prev.map(i => i.id === id ? computeItem({ ...i, ...data }) : i))
  }, [])

  const deleteItem = useCallback((id) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const navigateTo = useCallback((tab) => setActiveTab(tab), [])

  const tabProps = { items, addItem, updateItem, deleteItem, navigateTo }

  return (
    <div className="flex justify-center bg-gray-100 min-h-screen">
      <div className="w-full max-w-[430px] bg-gray-50 min-h-screen flex flex-col relative">
        <main className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
          {activeTab === 'dashboard' && <Dashboard {...tabProps} />}
          {activeTab === 'items' && <Items {...tabProps} />}
          {activeTab === 'gallery' && <Gallery {...tabProps} />}
          {activeTab === 'add' && <AddItem {...tabProps} />}
        </main>
        <BottomTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </div>
  )
}
