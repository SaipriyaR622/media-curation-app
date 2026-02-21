import { useCallback, useEffect, useState } from 'react';
import { Movie, MovieDiaryEntry, MovieStatus, NewMovieInput } from '@/lib/types';

const STORAGE_KEY = 'fragments-movies';
const LEGACY_STORAGE_KEY = 'my-movie-archive';

const today = () => new Date().toISOString().split('T')[0];

function normalizeDiaryEntries(value: unknown): MovieDiaryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      const candidate = (entry ?? {}) as Partial<MovieDiaryEntry>;
      return {
        id: typeof candidate.id === 'string' ? candidate.id : crypto.randomUUID(),
        watchedOn: typeof candidate.watchedOn === 'string' ? candidate.watchedOn : today(),
        rating: typeof candidate.rating === 'number' ? candidate.rating : 0,
        review: typeof candidate.review === 'string' ? candidate.review : '',
        rewatch: Boolean(candidate.rewatch),
        createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString(),
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
    id: typeof candidate.id === 'string' ? candidate.id : crypto.randomUUID(),
    title: typeof candidate.title === 'string' ? candidate.title : '',
    director: typeof candidate.director === 'string' ? candidate.director : '',
    year: typeof candidate.year === 'string' ? candidate.year : '',
    coverUrl: typeof candidate.coverUrl === 'string' ? candidate.coverUrl : '',
    backdropUrl: typeof candidate.backdropUrl === 'string' ? candidate.backdropUrl : '',
    status: candidate.status === 'watchlist' || candidate.status === 'watched' || candidate.status === 'favorites'
      ? candidate.status
      : 'watchlist',
    rating: typeof candidate.rating === 'number' ? candidate.rating : 0,
    review: typeof candidate.review === 'string' ? candidate.review : '',
    diaryEntries: normalizeDiaryEntries(candidate.diaryEntries),
    dateAdded: typeof candidate.dateAdded === 'string' ? candidate.dateAdded : new Date().toISOString(),
  };
}

function loadMovies(): Movie[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
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

function saveMovies(movies: Movie[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
}

type DiaryEntryInput = Omit<MovieDiaryEntry, 'id' | 'createdAt'>;

export function useMovies() {
  const [movies, setMovies] = useState<Movie[]>(loadMovies);

  useEffect(() => {
    saveMovies(movies);
  }, [movies]);

  const addMovie = useCallback((movie: NewMovieInput) => {
    const newMovie: Movie = {
      ...movie,
      id: crypto.randomUUID(),
      rating: 0,
      review: '',
      diaryEntries: [],
      dateAdded: new Date().toISOString(),
    };

    setMovies((prev) => [newMovie, ...prev]);
    return newMovie;
  }, []);

  const updateMovie = useCallback((id: string, updates: Partial<Movie>) => {
    setMovies((prev) => prev.map((movie) => (movie.id === id ? { ...movie, ...updates } : movie)));
  }, []);

  const deleteMovie = useCallback((id: string) => {
    setMovies((prev) => prev.filter((movie) => movie.id !== id));
  }, []);

  const getMovie = useCallback((id: string) => movies.find((movie) => movie.id === id), [movies]);

  const filterMovies = useCallback((status: MovieStatus | 'all', search: string) => {
    return movies.filter((movie) => {
      const matchesStatus = status === 'all' || movie.status === status;
      const query = search.trim().toLowerCase();
      const matchesSearch = !query ||
        movie.title.toLowerCase().includes(query) ||
        movie.director.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [movies]);

  const addDiaryEntry = useCallback((movieId: string, entry: DiaryEntryInput) => {
    setMovies((prev) => prev.map((movie) => {
      if (movie.id !== movieId) {
        return movie;
      }

      const diaryEntry: MovieDiaryEntry = {
        ...entry,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };

      return {
        ...movie,
        status: movie.status === 'watchlist' ? 'watched' : movie.status,
        rating: entry.rating > 0 ? entry.rating : movie.rating,
        diaryEntries: [diaryEntry, ...movie.diaryEntries],
      };
    }));
  }, []);

  const removeDiaryEntry = useCallback((movieId: string, entryId: string) => {
    setMovies((prev) => prev.map((movie) => {
      if (movie.id !== movieId) {
        return movie;
      }

      return {
        ...movie,
        diaryEntries: movie.diaryEntries.filter((entry) => entry.id !== entryId),
      };
    }));
  }, []);

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
