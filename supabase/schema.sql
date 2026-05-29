-- Shelby's Vintage Shop — Supabase schema
-- Run this once in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/<your-project>/sql/new

create table if not exists items (
  id          text        primary key,
  created_at  timestamptz not null,
  name        text        not null,
  source      text,
  price_paid   numeric,
  target_price numeric,
  sold_mxn     numeric,
  photo       text        -- base64 data URL; consider Supabase Storage for large images
);

-- Row Level Security is disabled because this app has no user auth and all
-- access goes through server-side API routes using the service role key.
alter table items disable row level security;
