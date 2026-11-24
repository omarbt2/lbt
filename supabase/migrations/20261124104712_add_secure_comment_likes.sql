create table if not exists public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index if not exists comment_likes_user_idx on public.comment_likes (user_id, created_at desc);
alter table public.comment_likes enable row level security;

drop policy if exists "Users can read their own comment likes" on public.comment_likes;
create policy "Users can read their own comment likes"
  on public.comment_likes for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can like comments as themselves" on public.comment_likes;
create policy "Users can like comments as themselves"
  on public.comment_likes for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can unlike their own comment likes" on public.comment_likes;
create policy "Users can unlike their own comment likes"
  on public.comment_likes for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.comment_likes to authenticated;
revoke all on public.comment_likes from anon;

create or replace function public.handle_comment_like_count()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.comments set likes_count = coalesce(likes_count, 0) + 1 where id = new.comment_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.comments set likes_count = greatest(coalesce(likes_count, 0) - 1, 0) where id = old.comment_id;
    return old;
  end if;
  return null;
end;
$$;
revoke all on function public.handle_comment_like_count() from public, anon, authenticated;

drop trigger if exists comment_likes_update_count on public.comment_likes;
create trigger comment_likes_update_count
after insert or delete on public.comment_likes
for each row execute function public.handle_comment_like_count();
