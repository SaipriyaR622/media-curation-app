export type BookStatus = 'want-to-read' | 'currently-reading' | 'read';

export interface BookDiaryEntry {
  id: string;
  readOn: string; // YYYY-MM-DD
  rating: number;
  review: string;
  reread: boolean;
  createdAt: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  color?: string;
  status: BookStatus;
  totalPages: number;
  currentPage: number;
  rating: number;
  review: string;
  favoriteQuote?: string;
  tags: string[];
  diaryEntries: BookDiaryEntry[];
  dateAdded: string;
  dateFinished?: string;
}

export interface Profile {
  name: string;
  bio: string;
  yearlyGoal: number;
  avatarUrl?: string;
  followers: number;
  following: number;
}

export const STATUS_LABELS: Record<BookStatus, string> = {
  'want-to-read': 'Want to Read',
  'currently-reading': 'Currently Reading',
  'read': 'Read',
};

export type MovieStatus = 'watchlist' | 'watched' | 'favorites';

export interface MovieDiaryEntry {
  id: string;
  watchedOn: string; // YYYY-MM-DD
  rating: number;
  review: string;
  rewatch: boolean;
  createdAt: string;
}

export interface Movie {
  id: string;
  title: string;
  director: string;
  year: string;
  coverUrl: string;
  backdropUrl: string;
  status: MovieStatus;
  rating: number;
  review: string;
  diaryEntries: MovieDiaryEntry[];
  dateAdded: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  spotifyId?: string;
  coverUrl?: string;
  spotifyUrl?: string;
  previewUrl?: string;
  durationMs?: number;
  totalMinutesListened: number;
  playCount: number;
  repeatCount: number;
  currentlyListening: boolean;
  lastPlayedAt?: string;
  rating: number;
  review: string;
  notes?: string;
  dateAdded: string;
}

export type NewMovieInput = Omit<Movie, 'id' | 'rating' | 'review' | 'diaryEntries' | 'dateAdded'>;
export type NewSongInput = Omit<
  Song,
  'id' | 'dateAdded' | 'totalMinutesListened' | 'playCount' | 'repeatCount' | 'currentlyListening' | 'rating' | 'review'
>;

export const MOVIE_STATUS_LABELS: Record<MovieStatus, string> = {
  watchlist: 'Watchlist',
  watched: 'Watched',
  favorites: 'Favorites',
};
