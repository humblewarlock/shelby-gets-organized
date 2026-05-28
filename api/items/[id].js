// PATCH  /api/items/:id  — update fields on an existing item
// DELETE /api/items/:id  — delete an item
import { supabase, toItem, toRow } from '../_db.js'

export default async function handler(req, res) {
  const { id } = req.query

  if (req.method === 'PATCH') {
    const { data, error } = await supabase
      .from('items')
      .update(toRow(req.body))
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ item: toItem(data) })
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(204).end()
  }

  res.status(405).json({ error: 'Method not allowed' })
}
