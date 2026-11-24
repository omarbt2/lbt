-- User-owned support requests. RLS deliberately allows users to create and read
-- only their own tickets; status updates remain a trusted support/admin action.
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (char_length(btrim(subject)) between 3 and 160),
  description text not null check (char_length(btrim(description)) between 10 and 5000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_user_created_idx
  on public.support_tickets (user_id, created_at desc);

alter table public.support_tickets enable row level security;

drop policy if exists "Users can create their own support tickets" on public.support_tickets;
create policy "Users can create their own support tickets"
  on public.support_tickets for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own support tickets" on public.support_tickets;
create policy "Users can read their own support tickets"
  on public.support_tickets for select to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert on public.support_tickets to authenticated;
revoke all on public.support_tickets from anon;
