create table if not exists public.diary_achievements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  badges jsonb not null,
  updated_at timestamptz default now()
);

alter table public.diary_achievements enable row level security;

create policy "Owner can upsert achievements"
on public.diary_achievements
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Followers can read achievements"
on public.diary_achievements
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.profile_follows pf
    where pf.follower_id = auth.uid()
      and pf.following_id = public.diary_achievements.user_id
  )
);
