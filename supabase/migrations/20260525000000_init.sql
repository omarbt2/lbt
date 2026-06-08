-- 1. Create Core Tables

-- Profiles Table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  name text not null,
  avatar_url text,
  bio text,
  followers_count int default 0,
  following_count int default 0,
  created_at timestamptz default now()
);

-- Posts Table
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  caption text not null,
  category text,
  media_urls text[],
  likes_count int default 0,
  comments_count int default 0,
  shares_count int default 0,
  tags text[],
  created_at timestamptz default now()
);

-- Stories Table
create table public.stories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  media_url text not null,
  expires_at timestamptz default (now() + interval '24 hours'),
  views_count int default 0,
  created_at timestamptz default now()
);

-- Follows Table
create table public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

-- Likes Table
create table public.likes (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

-- Bookmarks Table
create table public.bookmarks (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

-- Comments Table
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  likes_count int default 0,
  created_at timestamptz default now()
);

-- Chats Table
create table public.chats (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now()
);

-- Chat Participants Table
create table public.chat_participants (
  chat_id uuid references public.chats(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (chat_id, user_id)
);

-- Messages Table
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references public.chats(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text,
  media_url text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Notifications Table
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  actor_id uuid references public.profiles(id) on delete set null,
  type text check (type in ('like','comment','follow','mention','system')) not null,
  post_id uuid references public.posts(id) on delete cascade,
  is_read boolean default false,
  created_at timestamptz default now()
);


-- 2. ENABLE ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.stories enable row level security;
alter table public.follows enable row level security;
alter table public.likes enable row level security;
alter table public.bookmarks enable row level security;
alter table public.comments enable row level security;
alter table public.chats enable row level security;
alter table public.chat_participants enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;


-- 3. DEFINE POLICIES

-- Profiles policies
create policy "Anyone can read profiles" on public.profiles
  for select using (true);

create policy "Only owner can update self profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Allow registration profiles insert" on public.profiles
  for insert with check (auth.uid() = id);


-- Posts policies
create policy "Authenticated users can read posts" on public.posts
  for select using (auth.role() = 'authenticated');

create policy "Users can insert posts for themselves" on public.posts
  for insert with check (auth.uid() = user_id);

create policy "Only owner can update own posts" on public.posts
  for update using (auth.uid() = user_id);

create policy "Only owner can delete own posts" on public.posts
  for delete using (auth.uid() = user_id);


-- Stories policies
create policy "Authenticated users can read non-expired stories" on public.stories
  for select using (auth.role() = 'authenticated' and expires_at > now());

create policy "Only owner can insert stories" on public.stories
  for insert with check (auth.uid() = user_id);

create policy "Only owner can delete stories" on public.stories
  for delete using (auth.uid() = user_id);


-- Follows policies
create policy "Authenticated users can read follow states" on public.follows
  for select using (auth.role() = 'authenticated');

create policy "Users can insert own follow relationships" on public.follows
  for insert with check (auth.uid() = follower_id);

create policy "Users can delete own follow relationships" on public.follows
  for delete using (auth.uid() = follower_id);


-- Likes policies
create policy "Authenticated users can read counts/likes" on public.likes
  for select using (auth.role() = 'authenticated');

create policy "Users can like posts of others as themselves" on public.likes
  for insert with check (auth.uid() = user_id);

create policy "Users can unlike posts" on public.likes
  for delete using (auth.uid() = user_id);


-- Bookmarks policies
create policy "Users can read own bookmarks" on public.bookmarks
  for select using (auth.uid() = user_id);

create policy "Users can bookmark posts" on public.bookmarks
  for insert with check (auth.uid() = user_id);

create policy "Users can unbookmark posts" on public.bookmarks
  for delete using (auth.uid() = user_id);


-- Comments policies
create policy "Authenticated users can read comments" on public.comments
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can post comments" on public.comments
  for insert with check (auth.uid() = user_id);

create policy "Only owner can delete own comments" on public.comments
  for delete using (auth.uid() = user_id);


-- Chats and Participants policies
create policy "Users can view chats they participate in" on public.chats
  for select using (
    exists (
      select 1 from public.chat_participants 
      where chat_participants.chat_id = chats.id 
      and chat_participants.user_id = auth.uid()
    )
  );

create policy "Users can create chats if authenticated" on public.chats
  for insert with check (auth.role() = 'authenticated');

create policy "Users can view participants of their chats" on public.chat_participants
  for select using (
    exists (
      select 1 from public.chat_participants cp_check
      where cp_check.chat_id = chat_participants.chat_id 
      and cp_check.user_id = auth.uid()
    )
  );

create policy "Users can insert chat participants" on public.chat_participants
  for insert with check (auth.role() = 'authenticated');


-- Messages policies
create policy "Participants can read messages in their chats" on public.messages
  for select using (
    exists (
      select 1 from public.chat_participants
      where chat_participants.chat_id = messages.chat_id
      and chat_participants.user_id = auth.uid()
    )
  );

create policy "Participants can insert messages in their chats" on public.messages
  for insert with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.chat_participants
      where chat_participants.chat_id = messages.chat_id
      and chat_participants.user_id = auth.uid()
    )
  );


-- Notifications policies
create policy "Only recipients can view own notifications" on public.notifications
  for select using (auth.uid() = recipient_id);

create policy "Allow authenticated users to insert system or triggered notifications" on public.notifications
  for insert with check (auth.role() = 'authenticated');

create policy "Only recipients can mark notifications as read" on public.notifications
  for update using (auth.uid() = recipient_id);


-- 4. STORAGE SETUP
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage RLS Security policies
create policy "Allow public read access to post-media objects" 
  on storage.objects for select using (bucket_id = 'post-media');

create policy "Allow auth users to insert into post-media" 
  on storage.objects for insert with check (bucket_id = 'post-media' and auth.role() = 'authenticated');

create policy "Allow public read access to avatars objects" 
  on storage.objects for select using (bucket_id = 'avatars');

create policy "Allow auth users to insert into avatars" 
  on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
