alter table public.daily_logs
  add column if not exists spotify_track_id text,
  add column if not exists song_title text,
  add column if not exists song_artist text,
  add column if not exists song_cover_url text,
  add column if not exists song_spotify_url text;
