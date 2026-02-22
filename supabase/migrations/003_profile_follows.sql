create table if not exists public.profile_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint profile_follows_pkey primary key (follower_id, following_id),
  constraint profile_follows_no_self_follow check (follower_id <> following_id)
);

create index if not exists profile_follows_following_id_idx on public.profile_follows (following_id);
create index if not exists profile_follows_follower_id_idx on public.profile_follows (follower_id);

alter table public.profile_follows enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profile_follows'
      and policyname = 'Users can read follow graph'
  ) then
    create policy "Users can read follow graph"
      on public.profile_follows
      for select
      to authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profile_follows'
      and policyname = 'Users can follow others'
  ) then
    create policy "Users can follow others"
      on public.profile_follows
      for insert
      to authenticated
      with check (auth.uid() = follower_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profile_follows'
      and policyname = 'Users can unfollow others'
  ) then
    create policy "Users can unfollow others"
      on public.profile_follows
      for delete
      to authenticated
      using (auth.uid() = follower_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Authenticated users can read profiles'
  ) then
    create policy "Authenticated users can read profiles"
      on public.profiles
      for select
      to authenticated
      using (true);
  end if;
end $$;
