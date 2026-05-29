// Shared Supabase client for API routes.
// The underscore prefix tells Vercel this is not a route handler.
import { createClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_KEY environment variables')
}

// Anon key — safe to use server-side with RLS disabled on the items table.
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
)

// DB row (snake_case) → app item (camelCase)
export function toItem(row) {
  return {
    id:         row.id,
    createdAt:  row.created_at,
    name:       row.name,
    source:     row.source      ?? '',
    costMXN:    row.price_paid  != null ? Number(row.price_paid)  : 0,
    targetMXN:  row.target_price != null ? Number(row.target_price) : 0,
    soldMXN:    row.sold_mxn    != null ? Number(row.sold_mxn)    : null,
    photo:      row.photo       ?? null,
  }
}

// App item / partial update (camelCase) → DB row (snake_case).
// Only includes keys that are actually present in `data` so PATCH sends minimal fields.
export function toRow(data) {
  const MAP = {
    id:        'id',
    createdAt: 'created_at',
    name:      'name',
    source:    'source',
    costMXN:   'price_paid',
    targetMXN: 'target_price',
    soldMXN:   'sold_mxn',
    photo:     'photo',
  }
  const row = {}
  for (const [js, sql] of Object.entries(MAP)) {
    if (js in data) row[sql] = data[js] ?? null
  }
  return row
}
