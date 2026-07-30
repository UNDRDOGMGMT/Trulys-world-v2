-- Truly's World — members, plays, audit trail + RPCs
-- Run in Supabase SQL editor or via supabase db push.

-- ── members ──────────────────────────────────────────────────────────────────
create table if not exists public.members (
  id uuid primary key references auth.users (id) on delete cascade,
  first text not null default '',
  last text not null default '',
  email text not null,
  phone text not null default '',
  points integer not null default 0 check (points >= 0),
  redeemed text[] not null default '{}',
  member_since timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists members_email_idx on public.members (lower(email));

-- ── plays (points-earning activity; de-duped per member+game) ─────────────────
create table if not exists public.plays (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  game text not null,
  label text not null,
  points integer not null default 0,
  at timestamptz not null default now(),
  unique (member_id, game)
);

create index if not exists plays_member_at_idx on public.plays (member_id, at desc);

-- ── audit_events (append-only full trail) ────────────────────────────────────
-- member_id references auth.users (not members) so we can log OTP / pre-profile events.
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references auth.users (id) on delete set null,
  action text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_member_created_idx
  on public.audit_events (member_id, created_at desc);
create index if not exists audit_events_action_idx on public.audit_events (action);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.members enable row level security;
alter table public.plays enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists members_select_own on public.members;
create policy members_select_own on public.members
  for select using (auth.uid() = id);

drop policy if exists members_insert_own on public.members;
create policy members_insert_own on public.members
  for insert with check (auth.uid() = id);

drop policy if exists members_update_own on public.members;
create policy members_update_own on public.members
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists plays_select_own on public.plays;
create policy plays_select_own on public.plays
  for select using (auth.uid() = member_id);

drop policy if exists audit_insert on public.audit_events;
create policy audit_insert on public.audit_events
  for insert with check (
    member_id is null or member_id = auth.uid()
  );

drop policy if exists audit_select_own on public.audit_events;
create policy audit_select_own on public.audit_events
  for select using (member_id = auth.uid());

-- ── award_play RPC ───────────────────────────────────────────────────────────
create or replace function public.award_play(
  p_game text,
  p_label text,
  p_points integer
)
returns public.plays
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing public.plays;
  inserted public.plays;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_game is null or length(trim(p_game)) = 0 then
    raise exception 'game required';
  end if;
  if p_points is null or p_points < 0 then
    raise exception 'invalid points';
  end if;

  select * into existing from public.plays
  where member_id = uid and game = p_game;
  if found then
    return existing;
  end if;

  insert into public.plays (member_id, game, label, points)
  values (uid, p_game, coalesce(p_label, p_game), p_points)
  returning * into inserted;

  update public.members
  set points = points + p_points, updated_at = now()
  where id = uid;

  return inserted;
end;
$$;

revoke all on function public.award_play(text, text, integer) from public;
grant execute on function public.award_play(text, text, integer) to authenticated;

-- ── redeem_reward RPC ────────────────────────────────────────────────────────
create or replace function public.redeem_reward(p_reward_id text)
returns public.members
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  m public.members;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_reward_id is null or length(trim(p_reward_id)) = 0 then
    raise exception 'reward_id required';
  end if;

  select * into m from public.members where id = uid for update;
  if not found then
    raise exception 'member not found';
  end if;
  if p_reward_id = any (m.redeemed) then
    return m;
  end if;

  update public.members
  set redeemed = array_append(redeemed, p_reward_id), updated_at = now()
  where id = uid
  returning * into m;

  return m;
end;
$$;

revoke all on function public.redeem_reward(text) from public;
grant execute on function public.redeem_reward(text) to authenticated;

-- ── table grants ─────────────────────────────────────────────────────────────
grant select, insert, update on public.members to authenticated;
grant select on public.plays to authenticated;
grant insert, select on public.audit_events to authenticated;
-- allow pre-session audit rows (member_id null) from the anon key
grant insert on public.audit_events to anon;
