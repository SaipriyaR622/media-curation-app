create table if not exists public.profile_canvas_items (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists profile_canvas_items_updated_at_idx on public.profile_canvas_items (updated_at desc);

alter table public.profile_canvas_items enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profile_canvas_items'
      and policyname = 'Authenticated users can read profile canvas'
  ) then
    create policy "Authenticated users can read profile canvas"
      on public.profile_canvas_items
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
      and tablename = 'profile_canvas_items'
      and policyname = 'Users can manage own profile canvas'
  ) then
    create policy "Users can manage own profile canvas"
      on public.profile_canvas_items
      for all
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'books')
     and not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'books'
        and policyname = 'Authenticated users can read books'
    ) then
    create policy "Authenticated users can read books"
      on public.books
      for select
      to authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'book_diary_entries')
     and not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'book_diary_entries'
        and policyname = 'Authenticated users can read book diary entries'
    ) then
    create policy "Authenticated users can read book diary entries"
      on public.book_diary_entries
      for select
      to authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'movies')
     and not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'movies'
        and policyname = 'Authenticated users can read movies'
    ) then
    create policy "Authenticated users can read movies"
      on public.movies
      for select
      to authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'movie_diary_entries')
     and not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'movie_diary_entries'
        and policyname = 'Authenticated users can read movie diary entries'
    ) then
    create policy "Authenticated users can read movie diary entries"
      on public.movie_diary_entries
      for select
      to authenticated
      using (true);
  end if;
end $$;
