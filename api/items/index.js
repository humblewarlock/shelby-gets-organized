// GET  /api/items       — return all items ordered newest first
// POST /api/items       — insert a new item
import { supabase, toItem, toRow } from '../_db.js'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ items: data.map(toItem) })
  }

  if (req.method === 'POST') {
    const { data, error } = await supabase
      .from('items')
      .insert(toRow(req.body))
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ item: toItem(data) })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
