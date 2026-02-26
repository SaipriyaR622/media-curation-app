import { useState, useEffect } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { TmdbMovieSearchResult, searchMovies, getMovieDetails } from '@/lib/movieService';
import { MovieStatus, NewMovieInput } from '@/lib/types';

type MovieFormData = NewMovieInput;

interface AddMovieFormProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (movie: MovieFormData) => void;
}

const EMPTY_FORM_DATA: MovieFormData = {
  title: '',
  director: '',
  year: '',
  coverUrl: '',
  backdropUrl: '',
  status: 'watchlist',
};

export default function AddMovieForm({ isOpen, onClose, onAdd }: AddMovieFormProps) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TmdbMovieSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState<MovieFormData>(EMPTY_FORM_DATA);

  // Reset form when opened/closed
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSearchResults([]);
      setFormData({ ...EMPTY_FORM_DATA });
    }
  }, [isOpen]);

  // Debounced Search Logic
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length > 2) {
        setIsLoading(true);
        const results = await searchMovies(query);
        setSearchResults(results || []);
        setIsLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = async (movie: TmdbMovieSearchResult) => {
    setFormData((prev) => ({
      ...prev,
      title: movie.title,
      year: movie.release_date?.split('-')[0] || '',
      coverUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
      backdropUrl: movie.backdrop_path ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}` : '',
    }));
    setSearchResults([]);
    setQuery(movie.title);

    // Fetch director separately
    const { director } = await getMovieDetails(movie.id);
    setFormData((prev) => ({ ...prev, director }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-border/70 bg-card/95 p-8 shadow-2xl backdrop-blur">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-serif text-3xl italic">Archive Film</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 1. SEARCH INPUT */}
        <div className="relative mb-10">
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold block mb-2">Search Database</label>
          <div className="relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movie title..."
              className="w-full bg-transparent border-b border-border/70 py-2 pl-8 font-serif text-lg text-foreground placeholder:text-muted-foreground/70 focus:border-primary/70 focus:outline-none"
            />
            {isLoading && <Loader2 className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-60 overflow-y-auto rounded-md border border-border/70 bg-popover/95 shadow-2xl ring-1 ring-border/50 backdrop-blur">
              {searchResults.slice(0, 5).map((movie) => (
                <button 
                  key={movie.id}
                  onClick={() => handleSelect(movie)}
                  className="w-full flex items-center gap-4 border-b border-border/40 p-3 text-left transition-colors last:border-0 hover:bg-muted/60"
                >
                  <img 
                    src={movie.poster_path ? `https://image.tmdb.org/t/p/w92${movie.poster_path}` : 'https://via.placeholder.com/92x138'} 
                    className="w-10 h-14 object-cover rounded-sm shadow-sm" 
                  />
                  <div>
                    <p className="font-serif text-sm font-medium leading-tight">{movie.title}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{movie.release_date?.split('-')[0]}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. DATA FORM */}
        <form className="space-y-6 border-t border-dashed border-border/50 pt-6" onSubmit={(e) => { e.preventDefault(); onAdd(formData); onClose(); }}>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold block">Director</label>
              <input 
                value={formData.director}
                onChange={(e) => setFormData({...formData, director: e.target.value})}
                placeholder="Enter director"
                className="w-full border-b border-border/70 bg-transparent py-2 font-serif text-foreground focus:border-primary/70 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold block">Collection Status</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as MovieStatus })}
                className="w-full cursor-pointer border-b border-border/70 bg-background/70 py-2.5 font-serif text-sm text-foreground focus:border-primary/70 focus:outline-none"
              >
                <option value="watchlist">Watchlist</option>
                <option value="watched">Watched</option>
                <option value="favorites">Favorites</option>
              </select>
            </div>
          </div>

          <button 
            type="submit"
            disabled={!formData.title}
            className="mt-4 w-full rounded-md bg-foreground py-4 font-serif italic text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Confirm & Add to Archive
          </button>
        </form>
      </div>
    </div>
  );
}
