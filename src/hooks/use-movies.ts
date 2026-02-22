import { useCallback, useEffect, useState } from "react";
import { Movie, MovieDiaryEntry, MovieStatus, NewMovieInput } from "@/lib/types";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const STORAGE_KEY = "fragments-movies";
const LEGACY_STORAGE_KEY = "my-movie-archive";
const MIGRATION_FLAG_PREFIX = "fragments-movies-migrated";
const LEGACY_OWNER_KEY = "fragments-movies-owner";
const LAST_AUTH_USER_KEY = "fragments-last-auth-user";

const today = () => new Date().toISOString().split("T")[0];

interface MovieRow {
  id: string;
  user_id: string;
  title: string;
  director: string;
  year: string;
  cover_url: string;
  backdrop_url: string;
  status: MovieStatus;
  rating: number;
  review: string;
  date_added: string;
}

interface MovieDiaryEntryRow {
  id: string;
  movie_id: string;
  user_id: string;
  watched_on: string;
  rating: number;
  review: string;
  rewatch: boolean;
  created_at: string;
}

type DiaryEntryInput = Omit<MovieDiaryEntry, "id" | "createdAt">;

function normalizeDiaryEntries(value: unknown): MovieDiaryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      const candidate = (entry ?? {}) as Partial<MovieDiaryEntry>;
      return {
        id: typeof candidate.id === "string" ? candidate.id : crypto.randomUUID(),
        watchedOn: typeof candidate.watchedOn === "string" ? candidate.watchedOn : today(),
        rating: typeof candidate.rating === "number" ? candidate.rating : 0,
        review: typeof candidate.review === "string" ? candidate.review : "",
        rewatch: Boolean(candidate.rewatch),
        createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : new Date().toISOString(),
      };
    })
    .sort((a, b) => {
      const dateCompare = b.watchedOn.localeCompare(a.watchedOn);
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
}

function normalizeMovie(value: unknown): Movie {
  const candidate = (value ?? {}) as Partial<Movie>;

  return {
    id: typeof candidate.id === "string" ? candidate.id : crypto.randomUUID(),
    title: typeof candidate.title === "string" ? candidate.title : "",
    director: typeof candidate.director === "string" ? candidate.director : "",
    year: typeof candidate.year === "string" ? candidate.year : "",
    coverUrl: typeof candidate.coverUrl === "string" ? candidate.coverUrl : "",
    backdropUrl: typeof candidate.backdropUrl === "string" ? candidate.backdropUrl : "",
    status: candidate.status === "watchlist" || candidate.status === "watched" || candidate.status === "favorites"
      ? candidate.status
      : "watchlist",
    rating: typeof candidate.rating === "number" ? candidate.rating : 0,
    review: typeof candidate.review === "string" ? candidate.review : "",
    diaryEntries: normalizeDiaryEntries(candidate.diaryEntries),
    dateAdded: typeof candidate.dateAdded === "string" ? candidate.dateAdded : new Date().toISOString(),
  };
}

function getStorageKey(userId?: string | null) {
  return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
}

function loadMoviesFromStorage(storageKey: string, legacyKey?: string): Movie[] {
  try {
    const raw = localStorage.getItem(storageKey) ?? (legacyKey ? localStorage.getItem(legacyKey) : null);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((movie) => normalizeMovie(movie));
  } catch {
    return [];
  }
}

function saveMovies(movies: Movie[], storageKey: string) {
  localStorage.setItem(storageKey, JSON.stringify(movies));
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

  const legacyMovies = loadMoviesFromStorage(STORAGE_KEY, LEGACY_STORAGE_KEY);
  if (legacyMovies.length === 0) {
    return;
  }

  localStorage.setItem(scopedKey, JSON.stringify(legacyMovies));
  localStorage.setItem(LEGACY_OWNER_KEY, userId);
}

function toDateOnly(value: string | undefined) {
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().split("T")[0];
}

function mapMovieRowToMovie(row: MovieRow, diaryEntries: MovieDiaryEntry[]): Movie {
  return {
    id: row.id,
    title: row.title ?? "",
    director: row.director ?? "",
    year: row.year ?? "",
    coverUrl: row.cover_url ?? "",
    backdropUrl: row.backdrop_url ?? "",
    status: row.status,
    rating: row.rating ?? 0,
    review: row.review ?? "",
    diaryEntries,
    dateAdded: row.date_added ?? new Date().toISOString(),
  };
}

function mapMovieToInsertRow(movie: Movie, userId: string) {
  return {
    id: movie.id,
    user_id: userId,
    title: movie.title,
    director: movie.director ?? "",
    year: movie.year ?? "",
    cover_url: movie.coverUrl ?? "",
    backdrop_url: movie.backdropUrl ?? "",
    status: movie.status,
    rating: Math.max(Math.min(movie.rating ?? 0, 5), 0),
    review: movie.review ?? "",
    date_added: movie.dateAdded || new Date().toISOString(),
  };
}

function mapMovieToUpdateRow(movie: Movie) {
  return {
    title: movie.title,
    director: movie.director ?? "",
    year: movie.year ?? "",
    cover_url: movie.coverUrl ?? "",
    backdrop_url: movie.backdropUrl ?? "",
    status: movie.status,
    rating: Math.max(Math.min(movie.rating ?? 0, 5), 0),
    review: movie.review ?? "",
    date_added: movie.dateAdded || new Date().toISOString(),
  };
}

function mapDiaryEntryToInsertRow(entry: MovieDiaryEntry, movieId: string, userId: string) {
  return {
    id: entry.id,
    movie_id: movieId,
    user_id: userId,
    watched_on: toDateOnly(entry.watchedOn) ?? today(),
    rating: Math.max(Math.min(entry.rating ?? 0, 5), 0),
    review: entry.review ?? "",
    rewatch: Boolean(entry.rewatch),
    created_at: entry.createdAt || new Date().toISOString(),
  };
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

async function fetchMoviesFromDatabase(userId: string): Promise<Movie[]> {
  if (!supabase) {
    return [];
  }

  const { data: moviesData, error: moviesError } = await supabase
    .from("movies")
    .select("*")
    .eq("user_id", userId)
    .order("date_added", { ascending: false });

  if (moviesError) {
    throw moviesError;
  }

  const movieRows = (moviesData ?? []) as MovieRow[];
  if (movieRows.length === 0) {
    return [];
  }

  const movieIds = movieRows.map((movie) => movie.id);
  const { data: diaryData, error: diaryError } = await supabase
    .from("movie_diary_entries")
    .select("*")
    .eq("user_id", userId)
    .in("movie_id", movieIds)
    .order("watched_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (diaryError) {
    throw diaryError;
  }

  const diaryEntriesByMovieId = new Map<string, MovieDiaryEntry[]>();
  ((diaryData ?? []) as MovieDiaryEntryRow[]).forEach((entry) => {
    const mapped: MovieDiaryEntry = {
      id: entry.id,
      watchedOn: entry.watched_on,
      rating: entry.rating ?? 0,
      review: entry.review ?? "",
      rewatch: Boolean(entry.rewatch),
      createdAt: entry.created_at ?? new Date().toISOString(),
    };

    const collection = diaryEntriesByMovieId.get(entry.movie_id) ?? [];
    collection.push(mapped);
    diaryEntriesByMovieId.set(entry.movie_id, collection);
  });

  return movieRows.map((row) => mapMovieRowToMovie(row, diaryEntriesByMovieId.get(row.id) ?? []));
}

async function migrateMoviesToDatabase(userId: string, movies: Movie[]) {
  if (!supabase || movies.length === 0) {
    return;
  }

  const movieRows = movies.map((movie) => mapMovieToInsertRow(movie, userId));
  const { error: moviesError } = await supabase.from("movies").upsert(movieRows, { onConflict: "id" });
  if (moviesError) {
    throw moviesError;
  }

  const diaryRows = movies.flatMap((movie) =>
    normalizeDiaryEntries(movie.diaryEntries).map((entry) => mapDiaryEntryToInsertRow(entry, movie.id, userId))
  );

  if (diaryRows.length === 0) {
    return;
  }

  const { error: diaryError } = await supabase.from("movie_diary_entries").upsert(diaryRows, { onConflict: "id" });
  if (diaryError) {
    throw diaryError;
  }
}

async function replaceDiaryEntriesInDatabase(userId: string, movieId: string, diaryEntries: MovieDiaryEntry[]) {
  if (!supabase) {
    return;
  }

  const { error: deleteError } = await supabase
    .from("movie_diary_entries")
    .delete()
    .eq("user_id", userId)
    .eq("movie_id", movieId);

  if (deleteError) {
    throw deleteError;
  }

  if (diaryEntries.length === 0) {
    return;
  }

  const diaryRows = normalizeDiaryEntries(diaryEntries).map((entry) => mapDiaryEntryToInsertRow(entry, movieId, userId));
  const { error: insertError } = await supabase.from("movie_diary_entries").insert(diaryRows);
  if (insertError) {
    throw insertError;
  }
}

export function useMovies() {
  const [movies, setMovies] = useState<Movie[]>(() => (isSupabaseConfigured ? [] : loadMoviesFromStorage(STORAGE_KEY, LEGACY_STORAGE_KEY)));
  const [dbUserId, setDbUserId] = useState<string | null>(null);

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
      if (isActive) {
        setDbUserId(session?.user?.id ?? null);
        if (!session?.user?.id) {
          setMovies([]);
        }
        if (session?.user?.id) {
          localStorage.setItem(LAST_AUTH_USER_KEY, session.user.id);
        }
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
    maybeSeedScopedStorage(dbUserId);
    setMovies(loadMoviesFromStorage(getStorageKey(dbUserId)));

    const loadFromDatabase = async () => {
      try {
        const remoteMovies = await fetchMoviesFromDatabase(dbUserId);
        if (!isActive) {
          return;
        }

        const migrationFlagKey = `${MIGRATION_FLAG_PREFIX}:${dbUserId}`;
        const isMigrated = localStorage.getItem(migrationFlagKey) === "1";

        if (remoteMovies.length === 0 && !isMigrated) {
          const localMovies = loadMoviesFromStorage(getStorageKey(dbUserId));
          if (localMovies.length > 0) {
            await migrateMoviesToDatabase(dbUserId, localMovies);
            if (!isActive) {
              return;
            }
            setMovies(localMovies);
          } else {
            setMovies([]);
          }
          localStorage.setItem(migrationFlagKey, "1");
          return;
        }

        setMovies(remoteMovies);
        localStorage.setItem(migrationFlagKey, "1");
      } catch (error) {
        console.error("Failed to load movies from database", error);
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
    saveMovies(movies, storageKey);
  }, [dbUserId, movies]);

  const addMovie = useCallback(
    (movie: NewMovieInput) => {
      const newMovie: Movie = {
        ...movie,
        id: crypto.randomUUID(),
        rating: 0,
        review: "",
        diaryEntries: [],
        dateAdded: new Date().toISOString(),
      };

      setMovies((prev) => [newMovie, ...prev]);

      if (supabase && dbUserId) {
        void supabase
          .from("movies")
          .insert(mapMovieToInsertRow(newMovie, dbUserId))
          .then(({ error }) => {
            if (error) {
              console.error("Failed to insert movie", error.message);
            }
          });
      }

      return newMovie;
    },
    [dbUserId]
  );

  const updateMovie = useCallback(
    (id: string, updates: Partial<Movie>) => {
      const nextMovies = movies.map((movie) => (movie.id === id ? normalizeMovie({ ...movie, ...updates }) : movie));
      const updatedMovie = nextMovies.find((movie) => movie.id === id);

      setMovies(nextMovies);

      if (!supabase || !dbUserId || !updatedMovie) {
        return;
      }

      const shouldReplaceDiaryEntries = Object.prototype.hasOwnProperty.call(updates, "diaryEntries");
      void supabase
        .from("movies")
        .update(mapMovieToUpdateRow(updatedMovie))
        .eq("id", id)
        .eq("user_id", dbUserId)
        .then(async ({ error }) => {
          if (error) {
            console.error("Failed to update movie", error.message);
            return;
          }

          if (!shouldReplaceDiaryEntries) {
            return;
          }

          try {
            await replaceDiaryEntriesInDatabase(dbUserId, id, updatedMovie.diaryEntries ?? []);
          } catch (diaryError) {
            console.error("Failed to sync movie diary entries", diaryError);
          }
        });
    },
    [dbUserId, movies]
  );

  const deleteMovie = useCallback(
    (id: string) => {
      setMovies((prev) => prev.filter((movie) => movie.id !== id));

      if (!supabase || !dbUserId) {
        return;
      }

      void supabase
        .from("movies")
        .delete()
        .eq("id", id)
        .eq("user_id", dbUserId)
        .then(({ error }) => {
          if (error) {
            console.error("Failed to delete movie", error.message);
          }
        });
    },
    [dbUserId]
  );

  const getMovie = useCallback((id: string) => movies.find((movie) => movie.id === id), [movies]);

  const filterMovies = useCallback(
    (status: MovieStatus | "all", search: string) => {
      return movies.filter((movie) => {
        const matchesStatus = status === "all" || movie.status === status;
        const query = search.trim().toLowerCase();
        const matchesSearch = !query || movie.title.toLowerCase().includes(query) || movie.director.toLowerCase().includes(query);
        return matchesStatus && matchesSearch;
      });
    },
    [movies]
  );

  const addDiaryEntry = useCallback(
    (movieId: string, entry: DiaryEntryInput) => {
      const currentMovie = movies.find((movie) => movie.id === movieId);
      if (!currentMovie) {
        return;
      }

      const diaryEntry: MovieDiaryEntry = {
        ...entry,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };

      const nextMovies = movies.map((movie) => {
        if (movie.id !== movieId) {
          return movie;
        }

        return {
          ...movie,
          status: movie.status === "watchlist" ? "watched" : movie.status,
          rating: entry.rating > 0 ? entry.rating : movie.rating,
          diaryEntries: [diaryEntry, ...movie.diaryEntries],
        };
      });

      setMovies(nextMovies);

      if (!supabase || !dbUserId) {
        return;
      }

      const nextStatus = currentMovie.status === "watchlist" ? "watched" : currentMovie.status;
      const nextRating = entry.rating > 0 ? entry.rating : currentMovie.rating;

      void supabase
        .from("movies")
        .update({
          status: nextStatus,
          rating: nextRating,
        })
        .eq("id", movieId)
        .eq("user_id", dbUserId)
        .then(async ({ error }) => {
          if (error) {
            console.error("Failed to update movie after diary entry", error.message);
            return;
          }

          const { error: entryError } = await supabase.from("movie_diary_entries").insert(
            mapDiaryEntryToInsertRow(diaryEntry, movieId, dbUserId)
          );
          if (entryError) {
            console.error("Failed to insert movie diary entry", entryError.message);
          }
        });
    },
    [dbUserId, movies]
  );

  const removeDiaryEntry = useCallback(
    (movieId: string, entryId: string) => {
      setMovies((prev) =>
        prev.map((movie) => {
          if (movie.id !== movieId) {
            return movie;
          }

          return {
            ...movie,
            diaryEntries: movie.diaryEntries.filter((entry) => entry.id !== entryId),
          };
        })
      );

      if (!supabase || !dbUserId) {
        return;
      }

      void supabase
        .from("movie_diary_entries")
        .delete()
        .eq("id", entryId)
        .eq("movie_id", movieId)
        .eq("user_id", dbUserId)
        .then(({ error }) => {
          if (error) {
            console.error("Failed to remove movie diary entry", error.message);
          }
        });
    },
    [dbUserId]
  );

  return {
    movies,
    addMovie,
    updateMovie,
    deleteMovie,
    getMovie,
    filterMovies,
    addDiaryEntry,
    removeDiaryEntry,
  };
}
