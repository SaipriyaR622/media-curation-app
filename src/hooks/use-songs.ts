import { useCallback, useEffect, useMemo, useState } from 'react';
import { NewSongInput, Song } from '@/lib/types';
import { SpotifyRecentTrackResult, SpotifyTrackResult } from '@/lib/spotifyService';

const STORAGE_KEY = 'fragments-songs';
const LEGACY_STORAGE_KEYS = ['cozy-song-journal-songs', 'fragments-tracks'];

function normalizeSong(value: unknown): Song {
  const candidate = (value ?? {}) as Partial<Song> & {
    name?: string;
    singer?: string;
    link?: string;
    url?: string;
  };

  const title =
    typeof candidate.title === 'string'
      ? candidate.title
      : typeof candidate.name === 'string'
        ? candidate.name
        : '';
  const artist =
    typeof candidate.artist === 'string'
      ? candidate.artist
      : typeof candidate.singer === 'string'
        ? candidate.singer
        : '';

  return {
    id: typeof candidate.id === 'string' ? candidate.id : crypto.randomUUID(),
    title,
    artist,
    album: typeof candidate.album === 'string' ? candidate.album : '',
    spotifyId: typeof candidate.spotifyId === 'string' ? candidate.spotifyId : '',
    coverUrl: typeof candidate.coverUrl === 'string' ? candidate.coverUrl : '',
    spotifyUrl:
      typeof candidate.spotifyUrl === 'string'
        ? candidate.spotifyUrl
        : typeof candidate.url === 'string'
          ? candidate.url
          : typeof candidate.link === 'string'
            ? candidate.link
            : '',
    previewUrl: typeof candidate.previewUrl === 'string' ? candidate.previewUrl : '',
    durationMs: typeof candidate.durationMs === 'number' ? candidate.durationMs : 0,
    totalMinutesListened: typeof candidate.totalMinutesListened === 'number' ? candidate.totalMinutesListened : 0,
    playCount: typeof candidate.playCount === 'number' ? candidate.playCount : 0,
    repeatCount: typeof candidate.repeatCount === 'number' ? candidate.repeatCount : 0,
    currentlyListening: Boolean(candidate.currentlyListening),
    lastPlayedAt: typeof candidate.lastPlayedAt === 'string' ? candidate.lastPlayedAt : '',
    rating: typeof candidate.rating === 'number' ? candidate.rating : 0,
    review: typeof candidate.review === 'string' ? candidate.review : '',
    notes: typeof candidate.notes === 'string' ? candidate.notes : '',
    dateAdded: typeof candidate.dateAdded === 'string' ? candidate.dateAdded : new Date().toISOString(),
  };
}

function loadSongs(): Song[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.map((song) => normalizeSong(song)) : [];
    }

    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (!legacyRaw) {
        continue;
      }

      const parsedLegacy = JSON.parse(legacyRaw) as unknown;
      if (Array.isArray(parsedLegacy)) {
        return parsedLegacy.map((song) => normalizeSong(song));
      }
    }

    return [];
  } catch {
    return [];
  }
}

function saveSongs(songs: Song[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
}

function calculateMinutesFromDuration(song: Song) {
  if (!song.durationMs || song.durationMs <= 0) {
    return 3;
  }
  return Math.max(Math.round(song.durationMs / 60000), 1);
}

export function useSongs() {
  const [songs, setSongs] = useState<Song[]>(loadSongs);

  useEffect(() => {
    saveSongs(songs);
  }, [songs]);

  const addSong = useCallback((song: NewSongInput) => {
    const newSong: Song = {
      ...song,
      id: crypto.randomUUID(),
      totalMinutesListened: 0,
      playCount: 0,
      repeatCount: 0,
      currentlyListening: false,
      rating: 0,
      review: '',
      dateAdded: new Date().toISOString(),
    };

    setSongs((prev) => [newSong, ...prev]);
    return newSong;
  }, []);

  const updateSong = useCallback((id: string, updates: Partial<Song>) => {
    setSongs((prev) => prev.map((song) => (song.id === id ? { ...song, ...updates } : song)));
  }, []);

  const deleteSong = useCallback((id: string) => {
    setSongs((prev) => prev.filter((song) => song.id !== id));
  }, []);

  const filterSongs = useCallback(
    (search: string) => {
      const query = search.trim().toLowerCase();
      if (!query) {
        return songs;
      }

      return songs.filter((song) => {
        return (
          song.title.toLowerCase().includes(query) ||
          song.artist.toLowerCase().includes(query) ||
          (song.album || '').toLowerCase().includes(query)
        );
      });
    },
    [songs]
  );

  const logPlay = useCallback((id: string) => {
    setSongs((prev) =>
      prev.map((song) => {
        if (song.id !== id) {
          return song;
        }

        const nextPlayCount = song.playCount + 1;
        return {
          ...song,
          playCount: nextPlayCount,
          repeatCount: nextPlayCount > 1 ? nextPlayCount - 1 : 0,
          totalMinutesListened: song.totalMinutesListened + calculateMinutesFromDuration(song),
          lastPlayedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  const toggleCurrentlyListening = useCallback((id: string) => {
    setSongs((prev) =>
      prev.map((song) => (song.id === id ? { ...song, currentlyListening: !song.currentlyListening } : song))
    );
  }, []);

  const upsertFromSpotify = useCallback((tracks: SpotifyTrackResult[]) => {
    if (!tracks.length) {
      return;
    }

    setSongs((prev) => {
      const next = [...prev];

      tracks.forEach((track) => {
        const normalizedTitle = track.title.trim().toLowerCase();
        const normalizedArtist = track.artist.trim().toLowerCase();

        const existingIndex = next.findIndex((song) => {
          if (track.spotifyId && song.spotifyId && song.spotifyId === track.spotifyId) {
            return true;
          }
          return (
            song.title.trim().toLowerCase() === normalizedTitle &&
            song.artist.trim().toLowerCase() === normalizedArtist
          );
        });

        if (existingIndex >= 0) {
          next[existingIndex] = {
            ...next[existingIndex],
            spotifyId: track.spotifyId || next[existingIndex].spotifyId,
            title: track.title || next[existingIndex].title,
            artist: track.artist || next[existingIndex].artist,
            album: track.album || next[existingIndex].album,
            coverUrl: track.coverUrl || next[existingIndex].coverUrl,
            spotifyUrl: track.spotifyUrl || next[existingIndex].spotifyUrl,
            previewUrl: track.previewUrl || next[existingIndex].previewUrl,
            durationMs: track.durationMs || next[existingIndex].durationMs,
          };
          return;
        }

        next.unshift({
          id: crypto.randomUUID(),
          spotifyId: track.spotifyId,
          title: track.title,
          artist: track.artist,
          album: track.album,
          coverUrl: track.coverUrl,
          spotifyUrl: track.spotifyUrl,
          previewUrl: track.previewUrl,
          durationMs: track.durationMs,
          totalMinutesListened: 0,
          playCount: 0,
          repeatCount: 0,
          currentlyListening: false,
          lastPlayedAt: '',
          rating: 0,
          review: '',
          notes: '',
          dateAdded: new Date().toISOString(),
        });
      });

      return next;
    });
  }, []);

  const syncRecentPlays = useCallback((recentTracks: SpotifyRecentTrackResult[]) => {
    if (!recentTracks.length) {
      return;
    }

    setSongs((prev) => {
      const next = [...prev];

      recentTracks.forEach((track) => {
        const index = next.findIndex((song) => {
          if (track.spotifyId && song.spotifyId && song.spotifyId === track.spotifyId) {
            return true;
          }
          return (
            song.title.trim().toLowerCase() === track.title.trim().toLowerCase() &&
            song.artist.trim().toLowerCase() === track.artist.trim().toLowerCase()
          );
        });

        if (index < 0) {
          return;
        }

        const song = next[index];
        const minutes = track.durationMs > 0 ? Math.max(Math.round(track.durationMs / 60000), 1) : 3;
        const nextPlayCount = song.playCount + 1;

        next[index] = {
          ...song,
          playCount: nextPlayCount,
          repeatCount: nextPlayCount > 1 ? nextPlayCount - 1 : 0,
          totalMinutesListened: song.totalMinutesListened + minutes,
          lastPlayedAt: track.playedAt || song.lastPlayedAt,
        };
      });

      return next;
    });
  }, []);

  const markCurrentlyPlayingBySpotifyId = useCallback((spotifyId: string | null) => {
    setSongs((prev) =>
      prev.map((song) => ({
        ...song,
        currentlyListening: Boolean(spotifyId) && Boolean(song.spotifyId) && song.spotifyId === spotifyId,
      }))
    );
  }, []);

  const stats = useMemo(() => {
    const totalMinutes = songs.reduce((sum, song) => sum + song.totalMinutesListened, 0);
    const albumsTracked = new Set(songs.map((song) => song.album).filter(Boolean)).size;
    const repeatedSongs = songs.filter((song) => song.repeatCount > 0);
    const currentlyListeningSongs = songs.filter((song) => song.currentlyListening);

    return {
      totalMinutes,
      totalHours: Number((totalMinutes / 60).toFixed(1)),
      albumsTracked,
      repeatedSongs,
      currentlyListeningSongs,
    };
  }, [songs]);

  return {
    songs,
    stats,
    addSong,
    updateSong,
    deleteSong,
    filterSongs,
    logPlay,
    toggleCurrentlyListening,
    upsertFromSpotify,
    syncRecentPlays,
    markCurrentlyPlayingBySpotifyId,
  };
}
