-- Run this in Supabase Dashboard → SQL Editor

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  nickname text unique not null,
  avatar_emoji text not null default '🙂',
  created_at timestamptz default now()
);

-- Friendships
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  friend_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  auth_level text not null default 'invite_only' check (auth_level in ('invite_only','can_see_availability')),
  created_at timestamptz default now(),
  unique(user_id, friend_id)
);

-- Hangout posts
create table public.hangout_posts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  activity text,
  location text,
  date_time timestamptz not null,
  max_people int not null default 2 check (max_people >= 2),
  status text not null default 'open' check (status in ('open','closed','cancelled')),
  is_surprise boolean not null default false,
  surprise_options text[],
  created_at timestamptz default now()
);

-- RSVPs
create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  hangout_id uuid references public.hangout_posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  status text not null check (status in ('going','maybe')),
  created_at timestamptz default now(),
  unique(hangout_id, user_id)
);

-- Availability
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  day_index int not null check (day_index between 0 and 6),
  block text not null check (block in ('early_morning','brunch','afternoon','dinner','late_night')),
  available boolean not null,
  updated_at timestamptz default now(),
  unique(user_id, day_index, block)
);

-- ── Row Level Security ─────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.hangout_posts enable row level security;
alter table public.rsvps enable row level security;
alter table public.availability enable row level security;

-- Profiles: readable by all authenticated, writable by owner
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update" on public.profiles for update to authenticated using (id = auth.uid());

-- Friendships: see your own rows
create policy "friendships_select" on public.friendships for select to authenticated
  using (user_id = auth.uid() or friend_id = auth.uid());
create policy "friendships_insert" on public.friendships for insert to authenticated
  with check (user_id = auth.uid());
create policy "friendships_update" on public.friendships for update to authenticated
  using (user_id = auth.uid());
create policy "friendships_delete" on public.friendships for delete to authenticated
  using (user_id = auth.uid());

-- Hangout posts: see posts from yourself or your friends
create policy "hangouts_select" on public.hangout_posts for select to authenticated
  using (
    creator_id = auth.uid() or
    creator_id in (
      select friend_id from public.friendships
      where user_id = auth.uid() and status = 'accepted'
    )
  );
create policy "hangouts_insert" on public.hangout_posts for insert to authenticated
  with check (creator_id = auth.uid());
create policy "hangouts_update" on public.hangout_posts for update to authenticated
  using (creator_id = auth.uid());
create policy "hangouts_delete" on public.hangout_posts for delete to authenticated
  using (creator_id = auth.uid());

-- RSVPs: see rsvps on hangouts you can see
create policy "rsvps_select" on public.rsvps for select to authenticated using (true);
create policy "rsvps_insert" on public.rsvps for insert to authenticated
  with check (user_id = auth.uid());
create policy "rsvps_upsert" on public.rsvps for update to authenticated
  using (user_id = auth.uid());
create policy "rsvps_delete" on public.rsvps for delete to authenticated
  using (user_id = auth.uid());

-- Availability: own rows + friends with can_see_availability
create policy "availability_select" on public.availability for select to authenticated
  using (
    user_id = auth.uid() or
    user_id in (
      select friend_id from public.friendships
      where user_id = auth.uid()
        and status = 'accepted'
        and auth_level = 'can_see_availability'
    )
  );
create policy "availability_insert" on public.availability for insert to authenticated
  with check (user_id = auth.uid());
create policy "availability_upsert" on public.availability for update to authenticated
  using (user_id = auth.uid());

-- ── Trigger: auto-create profile on signup ────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  -- profile is created by the app after the user fills in name/nickname
  return new;
end;
$$;
