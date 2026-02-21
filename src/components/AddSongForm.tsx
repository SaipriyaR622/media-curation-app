import { useEffect, useState } from 'react';
import { Loader2, Music2, Plus, Search, X } from 'lucide-react';
import { NewSongInput } from '@/lib/types';
import {
  beginSpotifyLogin,
  getCurrentlyPlayingTrack,
  isSpotifyConfigured,
  searchSpotifyTracks,
  SpotifyTrackResult,
} from '@/lib/spotifyService';

interface AddSongFormProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (song: NewSongInput) => void;
}

const EMPTY_FORM: NewSongInput = {
  title: '',
  artist: '',
  album: '',
  spotifyId: '',
  coverUrl: '',
  spotifyUrl: '',
  previewUrl: '',
  durationMs: 0,
  notes: '',
};

export default function AddSongForm({ isOpen, onClose, onAdd }: AddSongFormProps) {
  const [query, setQuery] = useState('');
  const [formData, setFormData] = useState<NewSongInput>(EMPTY_FORM);
  const [results, setResults] = useState<SpotifyTrackResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingCurrent, setIsLoadingCurrent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setFormData(EMPTY_FORM);
      setResults([]);
      setErrorMessage('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timer = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      setErrorMessage('');
      try {
        const tracks = await searchSpotifyTracks(query.trim());
        setResults(tracks);
      } catch {
        setErrorMessage('Connect Spotify to search tracks.');
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [isOpen, query]);

  const applySpotifyTrack = (track: SpotifyTrackResult) => {
    setFormData((prev) => ({
      ...prev,
      title: track.title,
      artist: track.artist,
      album: track.album,
      spotifyId: track.spotifyId,
      coverUrl: track.coverUrl,
      spotifyUrl: track.spotifyUrl,
      previewUrl: track.previewUrl,
      durationMs: track.durationMs,
    }));
    setQuery(track.title);
    setResults([]);
  };

  const handleImportCurrentlyPlaying = async () => {
    setIsLoadingCurrent(true);
    setErrorMessage('');
    try {
      const current = await getCurrentlyPlayingTrack();
      if (!current) {
        setErrorMessage('No currently playing track found.');
        return;
      }
      applySpotifyTrack(current);
    } catch {
      setErrorMessage('Could not load currently playing track.');
    } finally {
      setIsLoadingCurrent(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-xl border border-border bg-background p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-3xl italic">Add Song</h2>
          <button onClick={onClose} className="text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isSpotifyConfigured() ? (
          <div className="mb-6 space-y-2">
            <div className="relative">
              <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Spotify..."
                className="w-full border-b border-border bg-transparent py-2 pl-8 text-sm focus:border-primary focus:outline-none"
              />
              {isSearching && <Loader2 className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  setErrorMessage('');
                  try {
                    await beginSpotifyLogin();
                  } catch (error) {
                    const message =
                      error instanceof Error ? error.message : 'Spotify connect failed. Check your env config.';
                    setErrorMessage(message);
                  }
                }}
                className="rounded border border-border px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
              >
                Connect Spotify
              </button>
              <button
                type="button"
                onClick={handleImportCurrentlyPlaying}
                className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
              >
                {isLoadingCurrent ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Music2 className="h-3.5 w-3.5" />}
                Import Current
              </button>
            </div>

            {results.length > 0 && (
              <div className="max-h-56 overflow-y-auto rounded border border-border bg-card/20">
                {results.map((track) => (
                  <button
                    key={track.spotifyId}
                    type="button"
                    onClick={() => applySpotifyTrack(track)}
                    className="flex w-full items-center gap-3 border-b border-border/40 p-2 text-left last:border-b-0 hover:bg-muted/50"
                  >
                    {track.coverUrl ? (
                      <img src={track.coverUrl} alt={track.title} className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                        <Music2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{track.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[track.artist, track.album].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mb-6 rounded border border-dashed border-border p-3 text-sm text-muted-foreground">
            Add `VITE_SPOTIFY_CLIENT_ID` in `.env` to enable Spotify search/import.
          </div>
        )}

        {errorMessage && <p className="mb-4 text-sm text-destructive">{errorMessage}</p>}

        <form
          className="space-y-4 border-t border-border pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            onAdd(formData);
            onClose();
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <input
              value={formData.title}
              onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Song title"
              className="border-b border-border bg-transparent py-2 text-sm focus:border-primary focus:outline-none"
            />
            <input
              value={formData.artist}
              onChange={(event) => setFormData((prev) => ({ ...prev, artist: event.target.value }))}
              placeholder="Artist"
              className="border-b border-border bg-transparent py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input
              value={formData.album || ''}
              onChange={(event) => setFormData((prev) => ({ ...prev, album: event.target.value }))}
              placeholder="Album"
              className="border-b border-border bg-transparent py-2 text-sm focus:border-primary focus:outline-none"
            />
            <input
              type="number"
              min={0}
              value={formData.durationMs ? Math.round(formData.durationMs / 1000) : ''}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  durationMs: Number(event.target.value || 0) * 1000,
                }))
              }
              placeholder="Duration (seconds)"
              className="border-b border-border bg-transparent py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <textarea
            value={formData.notes || ''}
            onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Notes"
            className="min-h-[90px] w-full resize-none rounded border border-border bg-background p-2 text-sm focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={!formData.title || !formData.artist}
            className="inline-flex w-full items-center justify-center gap-2 bg-foreground px-4 py-3 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> Add Song
          </button>
        </form>
      </div>
    </div>
  );
}
