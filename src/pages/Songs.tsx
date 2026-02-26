import { useCallback, useEffect, useMemo, useState } from 'react';
import { Headphones, Loader2, Music2, Plus, RefreshCcw, Repeat2, Search, Trash2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import AddSongForm from '@/components/AddSongForm';
import { useSongs } from '@/hooks/use-songs';
import {
  beginSpotifyLogin,
  completeSpotifyLogin,
  disconnectSpotify,
  getCurrentlyPlayingTrack,
  getRecentlyPlayedTracks,
  getSavedSpotifyTracks,
  getSpotifyAccessToken,
} from '@/lib/spotifyService';

type SongFilter = 'all' | 'currently-listening' | 'repeated';

const FILTERS: SongFilter[] = ['all', 'currently-listening', 'repeated'];
const RECENT_SYNC_CURSOR_KEY = 'fragments-spotify-recent-sync-cursor';

export default function Songs() {
  const {
    songs,
    stats,
    addSong,
    deleteSong,
    filterSongs,
    logPlay,
    toggleCurrentlyListening,
    upsertFromSpotify,
    syncRecentPlays,
    markCurrentlyPlayingBySpotifyId,
  } = useSongs();
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filter, setFilter] = useState<SongFilter>('all');
  const [spotifyStatus, setSpotifyStatus] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const mergeRecentPlayback = useCallback(
    (recentTracks: Awaited<ReturnType<typeof getRecentlyPlayedTracks>>) => {
      const lastCursor = localStorage.getItem(RECENT_SYNC_CURSOR_KEY) || '';
      const sortedRecent = [...recentTracks].sort((a, b) => a.playedAt.localeCompare(b.playedAt));
      const freshRecent = lastCursor ? sortedRecent.filter((track) => track.playedAt > lastCursor) : sortedRecent;

      syncRecentPlays(freshRecent);

      const newestCursor = sortedRecent[sortedRecent.length - 1]?.playedAt;
      if (newestCursor) {
        localStorage.setItem(RECENT_SYNC_CURSOR_KEY, newestCursor);
      }

      return freshRecent.length;
    },
    [syncRecentPlays]
  );

  const syncSpotify = useCallback(
    async (silent = false) => {
      const token = await getSpotifyAccessToken();
      if (!token) {
        if (!silent) {
          setSpotifyStatus('Connect Spotify to auto-sync liked songs and listening data.');
        }
        return;
      }

      setIsSyncing(true);
      if (!silent) {
        setSpotifyStatus('Syncing Spotify library...');
      }

      try {
        const [savedTracks, recentTracks, currentlyPlaying] = await Promise.all([
          getSavedSpotifyTracks(50),
          getRecentlyPlayedTracks(50),
          getCurrentlyPlayingTrack(),
        ]);

        upsertFromSpotify(savedTracks);
        upsertFromSpotify(recentTracks);
        if (currentlyPlaying) {
          upsertFromSpotify([currentlyPlaying]);
        }

        const newPlayCount = mergeRecentPlayback(recentTracks);
        markCurrentlyPlayingBySpotifyId(currentlyPlaying?.spotifyId ?? null);

        if (!silent) {
          setSpotifyStatus(`Synced ${savedTracks.length} liked songs and ${newPlayCount} new plays.`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Spotify sync failed.';
        const needsReauth = /insufficient client scope|insufficient scope/i.test(message);
        if (needsReauth) {
          disconnectSpotify();
        }
        if (!silent) {
          setSpotifyStatus(
            needsReauth
              ? 'Spotify permissions changed. Click Connect Spotify to re-authorize with the required scopes.'
              : message
          );
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [markCurrentlyPlayingBySpotifyId, mergeRecentPlayback, upsertFromSpotify]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      const prettyError = error.replace(/_/g, ' ');
      setSpotifyStatus(`Spotify connect failed: ${prettyError}.`);
      params.delete('error');
      params.delete('state');
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', nextUrl);
      return;
    }

    if (!code) {
      return;
    }

    completeSpotifyLogin(code)
      .then(async () => {
        setSpotifyStatus('Spotify connected.');
        await syncSpotify();
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Could not complete Spotify login.';
        setSpotifyStatus(message);
      })
      .finally(() => {
        params.delete('code');
        params.delete('state');
        const nextSearch = params.toString();
        const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
        window.history.replaceState({}, '', nextUrl);
      });
  }, [syncSpotify]);

  useEffect(() => {
    syncSpotify(true);
    const timer = window.setInterval(() => {
      syncSpotify(true);
    }, 90_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [syncSpotify]);

  const visibleSongs = useMemo(() => {
     const searched = filterSongs(search);
  let filtered = searched;
  
  if (filter === 'currently-listening') {
    filtered = searched.filter((song) => song.currentlyListening);
  } else if (filter === 'repeated') {
    filtered = searched.filter((song) => song.repeatCount > 0);
  }

  return filtered.sort((a, b) => {
    if (!a.lastPlayedAt && !b.lastPlayedAt) return 0;
    if (!a.lastPlayedAt) return 1;
    if (!b.lastPlayedAt) return -1;
    return b.lastPlayedAt.localeCompare(a.lastPlayedAt);
  });
  }, [filter, filterSongs, search]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-serif text-4xl font-medium tracking-tight">My Songs</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={beginSpotifyLogin}
              className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-all hover:text-foreground"
            >
              Connect Spotify
            </button>
            <button
              onClick={() => syncSpotify()}
              disabled={isSyncing}
              className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Sync Spotify
            </button>
            <button
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-all hover:text-foreground"
            >
              <Plus className="h-4 w-4" /> Add Song
            </button>
          </div>
        </div>

        <div className="mb-8 grid gap-3 md:grid-cols-4">
          <article className="rounded border border-border bg-card/30 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Listening Hours</p>
            <p className="mt-2 font-serif text-3xl">{stats.totalHours}</p>
          </article>
          <article className="rounded border border-border bg-card/30 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Albums</p>
            <p className="mt-2 font-serif text-3xl">{stats.albumsTracked}</p>
          </article>
          <article className="rounded border border-border bg-card/30 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Tracks</p>
            <p className="mt-2 font-serif text-3xl">{songs.length}</p>
          </article>
          <article className="rounded border border-border bg-card/30 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Currently Listening</p>
            <p className="mt-2 font-serif text-3xl">{stats.currentlyListeningSongs.length}</p>
          </article>
        </div>

        {spotifyStatus && <p className="mb-4 text-sm text-muted-foreground">{spotifyStatus}</p>}

        <div className="relative mb-8">
          <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, artist, or album..."
            className="w-full border-b border-border bg-transparent py-2 pl-8 transition-colors focus:border-primary focus:outline-none"
          />
        </div>

        <div className="mb-8 flex gap-6 border-b border-border/40 pb-4 text-[11px] font-bold uppercase tracking-[0.2em]">
          {FILTERS.map((entry) => (
            <button
              key={entry}
              onClick={() => setFilter(entry)}
              className={`transition-colors ${
                filter === entry ? 'text-foreground underline underline-offset-8' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {entry}
            </button>
          ))}
        </div>

        {visibleSongs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-20 text-center">
            <p className="font-serif italic text-muted-foreground">No songs tracked yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visibleSongs.map((song) => (
              <article key={song.id} className="rounded border border-border bg-card/40 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {song.coverUrl ? (
                      <img src={song.coverUrl} alt={song.title} className="h-14 w-14 rounded object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded bg-muted">
                        <Music2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="truncate font-serif text-lg">{song.title}</h2>
                      <p className="truncate text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        {[song.artist, song.album].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteSong(song.id)}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mb-3 grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                  <div className="rounded border border-border/70 p-2">
                    <p className="uppercase tracking-[0.12em]">Plays</p>
                    <p className="mt-1 text-base text-foreground">{song.playCount}</p>
                  </div>
                  <div className="rounded border border-border/70 p-2">
                    <p className="uppercase tracking-[0.12em]">Repeats</p>
                    <p className="mt-1 text-base text-foreground">{song.repeatCount}</p>
                  </div>
                  <div className="rounded border border-border/70 p-2">
                    <p className="uppercase tracking-[0.12em]">Hours</p>
                    <p className="mt-1 text-base text-foreground">{(song.totalMinutesListened / 60).toFixed(1)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => logPlay(song.id)}
                    className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Headphones className="h-3.5 w-3.5" />
                    Log Listen
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCurrentlyListening(song.id)}
                    className={`inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs transition-colors ${
                      song.currentlyListening
                        ? 'border-primary text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Repeat2 className="h-3.5 w-3.5" />
                    {song.currentlyListening ? 'Listening Now' : 'Mark Listening'}
                  </button>
                  {song.spotifyUrl && (
                    <a
                      href={song.spotifyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Open in Spotify
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <AddSongForm isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onAdd={addSong} />
    </div>
  );
}
