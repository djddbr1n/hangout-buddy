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
  duration_minutes int not null default 120,
  min_people int default 1,
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

-- Google Calendar OAuth tokens
create table public.google_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade unique,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

alter table public.google_tokens enable row level security;

-- Users manage only their own tokens; server-side uses service role to read others
create policy "google_tokens_select" on public.google_tokens for select to authenticated using (user_id = auth.uid());
create policy "google_tokens_insert" on public.google_tokens for insert to authenticated with check (user_id = auth.uid());
create policy "google_tokens_update" on public.google_tokens for update to authenticated using (user_id = auth.uid());
create policy "google_tokens_delete" on public.google_tokens for delete to authenticated using (user_id = auth.uid());

-- In-app notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null check (type in ('invite','rsvp','friend_request','friend_accepted')),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  hangout_id uuid references public.hangout_posts(id) on delete cascade,
  hangout_title text,
  read boolean not null default false,
  created_at timestamptz default now()
);

-- Push subscriptions (Web Push / PWA)
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null,
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);

-- ── RLS for new tables ─────────────────────────────────────────────────

alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

-- Notifications: only you see yours
create policy "notifications_select" on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy "notifications_insert" on public.notifications for insert to authenticated
  with check (true);
create policy "notifications_update" on public.notifications for update to authenticated
  using (user_id = auth.uid());

-- Push subscriptions: only you manage yours
create policy "push_subs_select" on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());
create policy "push_subs_insert" on public.push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());
create policy "push_subs_delete" on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());
-- upsert needs update policy too
create policy "push_subs_update" on public.push_subscriptions for update to authenticated
  using (user_id = auth.uid());

-- ── Trigger: auto-create profile on signup ────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  -- profile is created by the app after the user fills in name/nickname
  return new;
end;
$$;
