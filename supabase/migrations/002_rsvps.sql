-- Truly's World — concert RSVPs (Aug 8 LA show)
-- Public can submit an RSVP (anon insert); rows are NOT readable via the public
-- API. Review/approve in the Supabase dashboard (Table Editor → rsvps) or SQL.
-- Run in the Supabase SQL editor.

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  guests integer not null default 0 check (guests >= 0 and guests <= 10),
  contact text not null default '',          -- optional phone / IG handle
  note text not null default '',
  event text not null default 'aug-8-la',
  status text not null default 'pending'      -- pending | approved | declined
);

create index if not exists rsvps_created_idx on public.rsvps (created_at desc);

alter table public.rsvps enable row level security;

-- Anyone may submit, but only as a fresh 'pending' RSVP.
drop policy if exists rsvps_insert_any on public.rsvps;
create policy rsvps_insert_any on public.rsvps
  for insert with check (status = 'pending');

-- Grant insert only (no select) to the public keys → submissions can't be read back.
grant insert on public.rsvps to anon, authenticated;
