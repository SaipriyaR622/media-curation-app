import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Star, Trash2 } from 'lucide-react';
import AddMovieForm from '@/components/AddMovieForm';
import { MovieDiarySheet } from '@/components/MovieDiarySheet';
import { Navbar } from '@/components/Navbar';
import { useMovies } from '@/hooks/use-movies';
import { MOVIE_STATUS_LABELS, Movie, MovieStatus } from '@/lib/types';

const FILTERS: Array<MovieStatus | 'all'> = ['all', 'watchlist', 'watched', 'favorites'];

function TypedTitle({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (displayed.length < text.length) {
      const timeout = setTimeout(() => {
        setDisplayed(text.slice(0, displayed.length + 1));
      }, 80);
      return () => clearTimeout(timeout);
    } else {
      setDone(true);
    }
  }, [displayed, text]);

  return (
    <>
      {displayed}
      {!done && (
        <span
          className="inline-block w-[2px] h-9 bg-foreground ml-1"
          style={{ animation: 'blink 1s step-end infinite' }}
        />
      )}
    </>
  );
}
export default function Movies() {
  const { movies, addMovie, updateMovie, deleteMovie, getMovie, filterMovies, addDiaryEntry, removeDiaryEntry } =
    useMovies();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<MovieStatus | 'all'>('all');
  const [hoveredMovie, setHoveredMovie] = useState<Movie | null>(null);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);

  const filteredMovies = filterMovies(filter, searchQuery);

  const selectedMovie = useMemo(() => {
    if (!selectedMovieId) {
      return null;
    }
    return getMovie(selectedMovieId) ?? null;
  }, [getMovie, selectedMovieId]);

  useEffect(() => {
    const movieFromQuery = searchParams.get('movie');
    if (!movieFromQuery) {
      return;
    }
    if (movies.some((movie) => movie.id === movieFromQuery)) {
      setSelectedMovieId(movieFromQuery);
    }
  }, [movies, searchParams]);

  useEffect(() => {
    if (hoveredMovie && !movies.some((movie) => movie.id === hoveredMovie.id)) {
      setHoveredMovie(null);
    }
    if (selectedMovieId && !movies.some((movie) => movie.id === selectedMovieId)) {
      setSelectedMovieId(null);
    }
  }, [hoveredMovie, movies, selectedMovieId]);

  const clearMovieQueryParam = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('movie');
    setSearchParams(nextParams, { replace: true });
  };

  const handleDeleteMovie = (id: string) => {
    deleteMovie(id);
    setHoveredMovie((prev) => (prev?.id === id ? null : prev));
    if (selectedMovieId === id) {
      setSelectedMovieId(null);
      clearMovieQueryParam();
    }
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-background text-foreground">
      <div
        className="pointer-events-none fixed inset-0 -z-10 transition-all duration-700 ease-in-out"
        style={{
          backgroundImage: hoveredMovie?.backdropUrl ? `url(${hoveredMovie.backdropUrl})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: hoveredMovie?.backdropUrl ? 0.15 : 0,
          filter: 'blur(60px) saturate(1.2)',
          transform: hoveredMovie?.backdropUrl ? 'scale(1.05)' : 'scale(1)',
        }}
      />

      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
         <h1 className="font-serif text-4xl font-medium tracking-tight flex items-center">
  <TypedTitle text="My Movies" />
</h1>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-all hover:text-foreground"
          >
            <Plus className="h-4 w-4" /> Add Movie
          </button>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search your cinema collection..."
            className="w-full border-b border-border bg-transparent py-2 pl-8 transition-colors focus:border-primary focus:outline-none"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div className="mb-12 flex gap-6 border-b border-border/40 pb-4 text-[11px] font-bold uppercase tracking-[0.2em]">
          {FILTERS.map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`transition-colors ${
                filter === status ? 'text-foreground underline underline-offset-8' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {status === 'all' ? 'all' : MOVIE_STATUS_LABELS[status]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-4 lg:grid-cols-5">
          {filteredMovies.map((movie) => (
            <article
              key={movie.id}
              className="group relative flex cursor-pointer flex-col gap-3"
              onClick={() => setSelectedMovieId(movie.id)}
              onMouseEnter={() => setHoveredMovie(movie)}
              onMouseLeave={() => setHoveredMovie(null)}
            >
              <div className="relative aspect-[2/3] overflow-hidden border border-border/40 bg-card/60 shadow-md transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-2xl">
                <img src={movie.coverUrl} alt={movie.title} className="h-full w-full object-cover" />

                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDeleteMovie(movie.id);
                  }}
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-2 text-white opacity-0 shadow-lg ring-1 ring-white/10 backdrop-blur transition-opacity hover:bg-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1">
                <h3 className="font-serif text-base font-medium leading-tight">{movie.title}</h3>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{movie.director || 'Unknown Director'}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="border border-border px-1.5 py-0.5 text-[9px] uppercase text-muted-foreground">
                    {MOVIE_STATUS_LABELS[movie.status]}
                  </span>
                  {movie.rating > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                      <Star className="h-3 w-3 fill-current" />
                      {movie.rating}/5
                    </span>
                  )}
                  {movie.diaryEntries.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">{movie.diaryEntries.length} logs</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {filteredMovies.length === 0 && (
          <div className="rounded-lg border border-dashed border-border py-20 text-center">
            <p className="font-serif italic text-muted-foreground">No fragments found in this collection.</p>
          </div>
        )}
      </main>

      <AddMovieForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onAdd={addMovie} />

      <MovieDiarySheet
        movie={selectedMovie}
        open={Boolean(selectedMovie)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMovieId(null);
            clearMovieQueryParam();
          }
        }}
        onUpdateMovie={updateMovie}
        onAddDiaryEntry={addDiaryEntry}
        onRemoveDiaryEntry={removeDiaryEntry}
      />
    </div>
  );
}
