create table if not exists push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null,
  p256dh text not null default '',
  auth text not null default '',
  created_at timestamptz default now() not null,
  unique(user_id, endpoint)
);

alter table push_subscriptions enable row level security;

create policy "Users can insert their own push subscriptions"
  on push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own push subscriptions"
  on push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can delete their own push subscriptions"
  on push_subscriptions for delete
  using (auth.uid() = user_id);

create index idx_push_subscriptions_user_id on push_subscriptions(user_id);
create index idx_push_subscriptions_endpoint on push_subscriptions(endpoint);
