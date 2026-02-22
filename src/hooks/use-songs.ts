import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NewSongInput, Song } from "@/lib/types";
import { SpotifyRecentTrackResult, SpotifyTrackResult } from "@/lib/spotifyService";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const STORAGE_KEY = "fragments-songs";
const LEGACY_STORAGE_KEYS = ["cozy-song-journal-songs", "fragments-tracks"];
const MIGRATION_FLAG_PREFIX = "fragments-songs-migrated";
const LEGACY_OWNER_KEY = "fragments-songs-owner";
const LAST_AUTH_USER_KEY = "fragments-last-auth-user";

interface SongRow {
  id: string;
  user_id: string;
  title: string;
  artist: string;
  album: string;
  spotify_id: string;
  cover_url: string;
  spotify_url: string;
  preview_url: string;
  duration_ms: number;
  total_minutes_listened: number;
  play_count: number;
  repeat_count: number;
  currently_listening: boolean;
  last_played_at: string | null;
  rating: number;
  review: string;
  notes: string;
  date_added: string;
}

function normalizeSong(value: unknown): Song {
  const candidate = (value ?? {}) as Partial<Song> & {
    name?: string;
    singer?: string;
    link?: string;
    url?: string;
  };

  const title =
    typeof candidate.title === "string"
      ? candidate.title
      : typeof candidate.name === "string"
        ? candidate.name
        : "";
  const artist =
    typeof candidate.artist === "string"
      ? candidate.artist
      : typeof candidate.singer === "string"
        ? candidate.singer
        : "";

  return {
    id: typeof candidate.id === "string" ? candidate.id : crypto.randomUUID(),
    title,
    artist,
    album: typeof candidate.album === "string" ? candidate.album : "",
    spotifyId: typeof candidate.spotifyId === "string" ? candidate.spotifyId : "",
    coverUrl: typeof candidate.coverUrl === "string" ? candidate.coverUrl : "",
    spotifyUrl:
      typeof candidate.spotifyUrl === "string"
        ? candidate.spotifyUrl
        : typeof candidate.url === "string"
          ? candidate.url
          : typeof candidate.link === "string"
            ? candidate.link
            : "",
    previewUrl: typeof candidate.previewUrl === "string" ? candidate.previewUrl : "",
    durationMs: typeof candidate.durationMs === "number" ? candidate.durationMs : 0,
    totalMinutesListened: typeof candidate.totalMinutesListened === "number" ? candidate.totalMinutesListened : 0,
    playCount: typeof candidate.playCount === "number" ? candidate.playCount : 0,
    repeatCount: typeof candidate.repeatCount === "number" ? candidate.repeatCount : 0,
    currentlyListening: Boolean(candidate.currentlyListening),
    lastPlayedAt: typeof candidate.lastPlayedAt === "string" ? candidate.lastPlayedAt : "",
    rating: typeof candidate.rating === "number" ? candidate.rating : 0,
    review: typeof candidate.review === "string" ? candidate.review : "",
    notes: typeof candidate.notes === "string" ? candidate.notes : "",
    dateAdded: typeof candidate.dateAdded === "string" ? candidate.dateAdded : new Date().toISOString(),
  };
}

function getStorageKey(userId?: string | null) {
  return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
}

function loadSongsFromStorage(storageKey: string, legacyKeys?: string[]): Song[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.map((song) => normalizeSong(song)) : [];
    }

    if (!legacyKeys) {
      return [];
    }

    for (const legacyKey of legacyKeys) {
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

function saveSongs(songs: Song[], storageKey: string) {
  localStorage.setItem(storageKey, JSON.stringify(songs));
}

function maybeSeedScopedStorage(userId: string) {
  const scopedKey = getStorageKey(userId);
  if (localStorage.getItem(scopedKey)) {
    return;
  }

  const legacyOwner = localStorage.getItem(LEGACY_OWNER_KEY);
  const lastAuthUser = localStorage.getItem(LAST_AUTH_USER_KEY);
  if ((legacyOwner && legacyOwner !== userId) || (lastAuthUser && lastAuthUser !== userId)) {
    return;
  }

  const legacySongs = loadSongsFromStorage(STORAGE_KEY, LEGACY_STORAGE_KEYS);
  if (legacySongs.length === 0) {
    return;
  }

  localStorage.setItem(scopedKey, JSON.stringify(legacySongs));
  localStorage.setItem(LEGACY_OWNER_KEY, userId);
}

function calculateMinutesFromDuration(song: Song) {
  if (!song.durationMs || song.durationMs <= 0) {
    return 3;
  }
  return Math.max(Math.round(song.durationMs / 60000), 1);
}

function mapSongRowToSong(row: SongRow): Song {
  return {
    id: row.id,
    title: row.title ?? "",
    artist: row.artist ?? "",
    album: row.album ?? "",
    spotifyId: row.spotify_id ?? "",
    coverUrl: row.cover_url ?? "",
    spotifyUrl: row.spotify_url ?? "",
    previewUrl: row.preview_url ?? "",
    durationMs: row.duration_ms ?? 0,
    totalMinutesListened: row.total_minutes_listened ?? 0,
    playCount: row.play_count ?? 0,
    repeatCount: row.repeat_count ?? 0,
    currentlyListening: Boolean(row.currently_listening),
    lastPlayedAt: row.last_played_at ?? "",
    rating: row.rating ?? 0,
    review: row.review ?? "",
    notes: row.notes ?? "",
    dateAdded: row.date_added ?? new Date().toISOString(),
  };
}

function mapSongToInsertRow(song: Song, userId: string) {
  return {
    id: song.id,
    user_id: userId,
    title: song.title,
    artist: song.artist,
    album: song.album ?? "",
    spotify_id: song.spotifyId ?? "",
    cover_url: song.coverUrl ?? "",
    spotify_url: song.spotifyUrl ?? "",
    preview_url: song.previewUrl ?? "",
    duration_ms: Math.max(song.durationMs ?? 0, 0),
    total_minutes_listened: Math.max(song.totalMinutesListened ?? 0, 0),
    play_count: Math.max(song.playCount ?? 0, 0),
    repeat_count: Math.max(song.repeatCount ?? 0, 0),
    currently_listening: Boolean(song.currentlyListening),
    last_played_at: song.lastPlayedAt || null,
    rating: Math.max(Math.min(song.rating ?? 0, 5), 0),
    review: song.review ?? "",
    notes: song.notes ?? "",
    date_added: song.dateAdded || new Date().toISOString(),
  };
}

function songsEqual(a: Song, b: Song) {
  return (
    a.title === b.title &&
    a.artist === b.artist &&
    (a.album ?? "") === (b.album ?? "") &&
    (a.spotifyId ?? "") === (b.spotifyId ?? "") &&
    (a.coverUrl ?? "") === (b.coverUrl ?? "") &&
    (a.spotifyUrl ?? "") === (b.spotifyUrl ?? "") &&
    (a.previewUrl ?? "") === (b.previewUrl ?? "") &&
    (a.durationMs ?? 0) === (b.durationMs ?? 0) &&
    (a.totalMinutesListened ?? 0) === (b.totalMinutesListened ?? 0) &&
    (a.playCount ?? 0) === (b.playCount ?? 0) &&
    (a.repeatCount ?? 0) === (b.repeatCount ?? 0) &&
    Boolean(a.currentlyListening) === Boolean(b.currentlyListening) &&
    (a.lastPlayedAt ?? "") === (b.lastPlayedAt ?? "") &&
    (a.rating ?? 0) === (b.rating ?? 0) &&
    (a.review ?? "") === (b.review ?? "") &&
    (a.notes ?? "") === (b.notes ?? "") &&
    a.dateAdded === b.dateAdded
  );
}

async function getCurrentUserId() {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Unable to resolve Supabase user", error.message);
    return null;
  }

  return data.user?.id ?? null;
}

async function fetchSongsFromDatabase(userId: string): Promise<Song[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .eq("user_id", userId)
    .order("date_added", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as SongRow[]).map((row) => mapSongRowToSong(row));
}

async function migrateSongsToDatabase(userId: string, songs: Song[]) {
  if (!supabase || songs.length === 0) {
    return;
  }

  const rows = songs.map((song) => mapSongToInsertRow(song, userId));
  const { error } = await supabase.from("songs").upsert(rows, { onConflict: "id" });
  if (error) {
    throw error;
  }
}

async function syncSongsDiffToDatabase(userId: string, previousSongs: Song[], nextSongs: Song[]) {
  if (!supabase) {
    return;
  }

  const previousById = new Map(previousSongs.map((song) => [song.id, song]));
  const nextById = new Map(nextSongs.map((song) => [song.id, song]));

  const removedIds = [...previousById.keys()].filter((id) => !nextById.has(id));
  const changedSongs = nextSongs.filter((song) => {
    const previous = previousById.get(song.id);
    if (!previous) {
      return true;
    }
    return !songsEqual(previous, song);
  });

  if (removedIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("songs")
      .delete()
      .eq("user_id", userId)
      .in("id", removedIds);
    if (deleteError) {
      throw deleteError;
    }
  }

  if (changedSongs.length > 0) {
    const rows = changedSongs.map((song) => mapSongToInsertRow(song, userId));
    const { error: upsertError } = await supabase.from("songs").upsert(rows, { onConflict: "id" });
    if (upsertError) {
      throw upsertError;
    }
  }
}

export function useSongs() {
  const [songs, setSongs] = useState<Song[]>(() =>
    isSupabaseConfigured ? [] : loadSongsFromStorage(STORAGE_KEY, LEGACY_STORAGE_KEYS)
  );
  const [dbUserId, setDbUserId] = useState<string | null>(null);
  const [dbHydrated, setDbHydrated] = useState(false);
  const previousSongsRef = useRef<Song[] | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    let isActive = true;

    const hydrateUser = async () => {
      const userId = await getCurrentUserId();
      if (isActive) {
        setDbUserId(userId);
        if (userId) {
          localStorage.setItem(LAST_AUTH_USER_KEY, userId);
        }
      }
    };

    void hydrateUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isActive) {
        return;
      }

      setDbUserId(session?.user?.id ?? null);
      if (!session?.user?.id) {
        setDbHydrated(false);
        previousSongsRef.current = null;
        setSongs([]);
      } else {
        localStorage.setItem(LAST_AUTH_USER_KEY, session.user.id);
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !dbUserId) {
      return;
    }

    let isActive = true;
    previousSongsRef.current = null;
    maybeSeedScopedStorage(dbUserId);
    setSongs(loadSongsFromStorage(getStorageKey(dbUserId)));

    const loadFromDatabase = async () => {
      try {
        const remoteSongs = await fetchSongsFromDatabase(dbUserId);
        if (!isActive) {
          return;
        }

        const migrationFlagKey = `${MIGRATION_FLAG_PREFIX}:${dbUserId}`;
        const isMigrated = localStorage.getItem(migrationFlagKey) === "1";

        if (remoteSongs.length === 0 && !isMigrated) {
          const localSongs = loadSongsFromStorage(getStorageKey(dbUserId));
          if (localSongs.length > 0) {
            await migrateSongsToDatabase(dbUserId, localSongs);
            if (!isActive) {
              return;
            }
            setSongs(localSongs);
          } else {
            setSongs([]);
          }
          localStorage.setItem(migrationFlagKey, "1");
        } else {
          setSongs(remoteSongs);
          localStorage.setItem(migrationFlagKey, "1");
        }

        setDbHydrated(true);
      } catch (error) {
        console.error("Failed to load songs from database", error);
      }
    };

    void loadFromDatabase();

    return () => {
      isActive = false;
    };
  }, [dbUserId]);

  useEffect(() => {
    if (isSupabaseConfigured && !dbUserId) {
      return;
    }

    const storageKey = getStorageKey(dbUserId);
    saveSongs(songs, storageKey);
  }, [dbUserId, songs]);

  useEffect(() => {
    if (!supabase || !dbUserId || !dbHydrated) {
      return;
    }

    const previousSongs = previousSongsRef.current;
    if (!previousSongs) {
      previousSongsRef.current = songs;
      return;
    }

    previousSongsRef.current = songs;

    void syncSongsDiffToDatabase(dbUserId, previousSongs, songs).catch((error) => {
      console.error("Failed to sync songs diff to database", error);
    });
  }, [dbHydrated, dbUserId, songs]);

  const addSong = useCallback((song: NewSongInput) => {
    const newSong: Song = {
      ...song,
      id: crypto.randomUUID(),
      totalMinutesListened: 0,
      playCount: 0,
      repeatCount: 0,
      currentlyListening: false,
      rating: 0,
      review: "",
      dateAdded: new Date().toISOString(),
    };

    setSongs((prev) => [newSong, ...prev]);
    return newSong;
  }, []);

  const updateSong = useCallback((id: string, updates: Partial<Song>) => {
    setSongs((prev) => prev.map((song) => (song.id === id ? normalizeSong({ ...song, ...updates }) : song)));
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
          (song.album || "").toLowerCase().includes(query)
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
            song.title.trim().toLowerCase() === normalizedTitle && song.artist.trim().toLowerCase() === normalizedArtist
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
          lastPlayedAt: "",
          rating: 0,
          review: "",
          notes: "",
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
