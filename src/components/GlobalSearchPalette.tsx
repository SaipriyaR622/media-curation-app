import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Clapperboard, Home, Music2, UserRound } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

interface BookSnapshot {
  id: string;
  title: string;
  author: string;
}

interface MovieSnapshot {
  id: string;
  title: string;
  director: string;
  year: string;
}

interface SongSnapshot {
  id: string;
  title: string;
  artist: string;
  album?: string;
  url?: string;
}

interface UserSnapshot {
  id: string;
  name: string;
  bio: string;
  avatarUrl: string;
}

const BOOK_STORAGE_BASE_KEY = 'fragments-books';
const MOVIE_STORAGE_BASE_KEY = 'fragments-movies';
const SONG_STORAGE_BASE_KEY = 'fragments-songs';
const BOOK_LEGACY_KEYS = ['cozy-book-tracker-books'];
const MOVIE_LEGACY_KEYS = ['my-movie-archive'];
const SONG_LEGACY_KEYS = ['cozy-song-journal-songs', 'fragments-tracks'];

function readStorageArray(keys: string[]): unknown[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const merged: unknown[] = [];

  keys.forEach((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        merged.push(...parsed);
      }
    } catch {
      // Ignore malformed local storage payloads.
    }
  });

  return merged;
}

function loadBooksSnapshot(keys: string[]): BookSnapshot[] {
  const entries = readStorageArray(keys);

  return entries
    .map((entry) => {
      const candidate = (entry ?? {}) as Partial<BookSnapshot>;
      return {
        id: typeof candidate.id === 'string' ? candidate.id : '',
        title: typeof candidate.title === 'string' ? candidate.title : '',
        author: typeof candidate.author === 'string' ? candidate.author : '',
      };
    })
    .filter((book) => book.id && book.title);
}

function loadMoviesSnapshot(keys: string[]): MovieSnapshot[] {
  const entries = readStorageArray(keys);

  return entries
    .map((entry) => {
      const candidate = (entry ?? {}) as Partial<MovieSnapshot>;
      return {
        id: typeof candidate.id === 'string' ? candidate.id : '',
        title: typeof candidate.title === 'string' ? candidate.title : '',
        director: typeof candidate.director === 'string' ? candidate.director : '',
        year: typeof candidate.year === 'string' ? candidate.year : '',
      };
    })
    .filter((movie) => movie.id && movie.title);
}

function loadSongsSnapshot(keys: string[]): SongSnapshot[] {
  const entries = readStorageArray(keys);

  return entries
    .map((entry) => {
      const candidate = (entry ?? {}) as Partial<SongSnapshot> & {
        name?: string;
        singer?: string;
        link?: string;
        spotifyUrl?: string;
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
      const url =
        typeof candidate.url === 'string'
          ? candidate.url
          : typeof candidate.spotifyUrl === 'string'
            ? candidate.spotifyUrl
            : typeof candidate.link === 'string'
              ? candidate.link
              : undefined;

      return {
        id:
          typeof candidate.id === 'string' && candidate.id
            ? candidate.id
            : `${title.toLowerCase()}-${artist.toLowerCase()}`.replace(/\s+/g, '-'),
        title,
        artist,
        album: typeof candidate.album === 'string' ? candidate.album : '',
        url,
      };
    })
    .filter((song) => song.id && song.title);
}

export function GlobalSearchPalette() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<BookSnapshot[]>([]);
  const [movies, setMovies] = useState<MovieSnapshot[]>([]);
  const [songs, setSongs] = useState<SongSnapshot[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserSnapshot[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const bookKeys = useMemo(
    () => (currentUserId ? [`${BOOK_STORAGE_BASE_KEY}:${currentUserId}`] : [BOOK_STORAGE_BASE_KEY, ...BOOK_LEGACY_KEYS]),
    [currentUserId]
  );
  const movieKeys = useMemo(
    () => (currentUserId ? [`${MOVIE_STORAGE_BASE_KEY}:${currentUserId}`] : [MOVIE_STORAGE_BASE_KEY, ...MOVIE_LEGACY_KEYS]),
    [currentUserId]
  );
  const songKeys = useMemo(
    () => (currentUserId ? [`${SONG_STORAGE_BASE_KEY}:${currentUserId}`] : [SONG_STORAGE_BASE_KEY, ...SONG_LEGACY_KEYS]),
    [currentUserId]
  );

  const refreshSnapshots = useCallback(() => {
    setBooks(loadBooksSnapshot(bookKeys));
    setMovies(loadMoviesSnapshot(movieKeys));
    setSongs(loadSongsSnapshot(songKeys));
  }, [bookKeys, movieKeys, songKeys]);

  const searchUsers = useCallback(async (term: string) => {
    if (!isSupabaseConfigured || !supabase) {
      setUsers([]);
      setUsersLoading(false);
      return;
    }

    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setUsers([]);
      setUsersLoading(false);
      return;
    }

    setUsersLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id,name,bio,avatar_url')
      .ilike('name', `%${trimmed}%`)
      .order('name', { ascending: true })
      .limit(20);

    if (error) {
      setUsers([]);
      setUsersLoading(false);
      return;
    }

    const mapped = (data ?? []).map((entry) => {
      const candidate = entry as { id: string; name: string; bio: string; avatar_url: string };
      return {
        id: candidate.id,
        name: candidate.name || 'Reader',
        bio: candidate.bio || 'reader, annotator, lover of slow burns',
        avatarUrl: candidate.avatar_url || '',
      };
    });
    setUsers(mapped);
    setUsersLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      refreshSnapshots();
    }
  }, [location.key, open, refreshSnapshots]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    let isActive = true;

    const hydrateUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (isActive) {
        setCurrentUserId(data.user?.id ?? null);
      }
    };

    void hydrateUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isActive) {
        setCurrentUserId(session?.user?.id ?? null);
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setUsers([]);
      setUsersLoading(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void searchUsers(query);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [open, query, searchUsers]);

  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => {
          const next = !current;
          if (next) {
            refreshSnapshots();
          }
          return next;
        });
      }
    };

    const handleGlobalOpenEvent = () => {
      refreshSnapshots();
      setOpen(true);
    };

    window.addEventListener('keydown', handleKeyboardShortcut);
    window.addEventListener('open-global-search', handleGlobalOpenEvent);

    return () => {
      window.removeEventListener('keydown', handleKeyboardShortcut);
      window.removeEventListener('open-global-search', handleGlobalOpenEvent);
    };
  }, [refreshSnapshots]);

  const hasMediaResults = useMemo(
    () => books.length > 0 || movies.length > 0 || songs.length > 0,
    [books.length, movies.length, songs.length]
  );

  const closePalette = () => {
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search books, movies, songs, users... (Cmd/Ctrl + K)"
      />
      <CommandList>
        <CommandEmpty>No fragments found.</CommandEmpty>

        <CommandGroup heading="Navigate">
          <CommandItem
            value="Navigate to books library"
            onSelect={() => {
              navigate('/library/books');
              closePalette();
            }}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Books Library
            <CommandShortcut>↵</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="Navigate to movies library"
            onSelect={() => {
              navigate('/library/movies');
              closePalette();
            }}
          >
            <Clapperboard className="mr-2 h-4 w-4" />
            Movies Library
          </CommandItem>
          <CommandItem
            value="Navigate to songs library"
            onSelect={() => {
              navigate('/library/songs');
              closePalette();
            }}
          >
            <Music2 className="mr-2 h-4 w-4" />
            Songs Library
          </CommandItem>
          <CommandItem
            value="Navigate to diary"
            onSelect={() => {
              navigate('/library/diary');
              closePalette();
            }}
          >
            <Home className="mr-2 h-4 w-4" />
            Diary
          </CommandItem>
          <CommandItem
            value="Navigate to profile"
            onSelect={() => {
              navigate('/profile');
              closePalette();
            }}
          >
            <UserRound className="mr-2 h-4 w-4" />
            Profile
          </CommandItem>
        </CommandGroup>

        {(query.trim().length >= 2 || usersLoading) && <CommandSeparator />}

        {(query.trim().length >= 2 || usersLoading) && (
          <CommandGroup heading={`Users (${users.length})`}>
            {usersLoading && (
              <CommandItem value="Searching users..." disabled>
                <UserRound className="mr-2 h-4 w-4 text-muted-foreground" />
                Searching users...
              </CommandItem>
            )}
            {!usersLoading && users.length === 0 && (
              <CommandItem value="No users found" disabled>
                <UserRound className="mr-2 h-4 w-4 text-muted-foreground" />
                No users found.
              </CommandItem>
            )}
            {!usersLoading &&
              users.map((user) => (
                <CommandItem
                  key={`palette-user-${user.id}`}
                  value={`${user.name} ${user.bio}`}
                  onSelect={() => {
                    navigate(`/profile/${user.id}`);
                    closePalette();
                  }}
                >
                  <UserRound className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{user.name}</span>
                  <CommandShortcut className="truncate max-w-[45%]">{user.bio}</CommandShortcut>
                </CommandItem>
              ))}
          </CommandGroup>
        )}

        {hasMediaResults && <CommandSeparator />}

        {books.length > 0 && (
          <CommandGroup heading={`Books (${books.length})`}>
            {books.slice(0, 12).map((book) => (
              <CommandItem
                key={`palette-book-${book.id}`}
                value={`${book.title} ${book.author}`}
                onSelect={() => {
                  navigate(`/book/${book.id}`);
                  closePalette();
                }}
              >
                <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="truncate">{book.title}</span>
                <CommandShortcut className="truncate max-w-[45%]">{book.author || 'Unknown Author'}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {movies.length > 0 && (
          <CommandGroup heading={`Movies (${movies.length})`}>
            {movies.slice(0, 12).map((movie) => (
              <CommandItem
                key={`palette-movie-${movie.id}`}
                value={`${movie.title} ${movie.director} ${movie.year}`}
                onSelect={() => {
                  navigate(`/library/movies?movie=${movie.id}`);
                  closePalette();
                }}
              >
                <Clapperboard className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="truncate">{movie.title}</span>
                <CommandShortcut className="truncate max-w-[45%]">
                  {[movie.director || 'Unknown Director', movie.year].filter(Boolean).join(' • ')}
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {songs.length > 0 && (
          <CommandGroup heading={`Songs (${songs.length})`}>
            {songs.slice(0, 12).map((song) => (
              <CommandItem
                key={`palette-song-${song.id}`}
                value={`${song.title} ${song.artist} ${song.album || ''}`}
                onSelect={() => {
                  if (song.url) {
                    window.open(song.url, '_blank', 'noopener,noreferrer');
                  } else {
                    navigate('/library/songs');
                  }
                  closePalette();
                }}
              >
                <Music2 className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="truncate">{song.title}</span>
                <CommandShortcut className="truncate max-w-[45%]">
                  {[song.artist || 'Unknown Artist', song.album || ''].filter(Boolean).join(' • ')}
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
