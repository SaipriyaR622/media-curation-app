import { useState, useEffect } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { TmdbMovieSearchResult, searchMovies } from '@/lib/movieService';
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

  const handleSelect = (movie: TmdbMovieSearchResult) => {
    setFormData((prev) => ({
      ...prev,
      title: movie.title,
      year: movie.release_date?.split('-')[0] || '',
      coverUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
      backdropUrl: movie.backdrop_path ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}` : '',
    }));
    setSearchResults([]);
    setQuery(movie.title);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md p-4">
      <div className="w-full max-w-lg bg-background border border-border p-8 shadow-2xl relative">
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
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movie title..."
              className="w-full bg-transparent border-b border-stone-300 py-2 pl-8 focus:outline-none focus:border-primary font-serif text-lg"
            />
            {isLoading && <Loader2 className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-stone-400" />}
          </div>
          
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-stone-200 mt-1 max-h-60 overflow-y-auto z-50 shadow-xl rounded-sm">
              {searchResults.slice(0, 5).map((movie) => (
                <button 
                  key={movie.id}
                  onClick={() => handleSelect(movie)}
                  className="w-full flex items-center gap-4 p-3 hover:bg-stone-50 border-b border-stone-100 last:border-0 transition-colors text-left"
                >
                  <img 
                    src={movie.poster_path ? `https://image.tmdb.org/t/p/w92${movie.poster_path}` : 'https://via.placeholder.com/92x138'} 
                    className="w-10 h-14 object-cover rounded-sm shadow-sm" 
                  />
                  <div>
                    <p className="font-serif text-sm font-medium leading-tight">{movie.title}</p>
                    <p className="text-[10px] text-stone-400 mt-1">{movie.release_date?.split('-')[0]}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. DATA FORM */}
        <form className="space-y-6 pt-6 border-t border-dashed border-stone-200" onSubmit={(e) => { e.preventDefault(); onAdd(formData); onClose(); }}>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold block">Director</label>
              <input 
                value={formData.director}
                onChange={(e) => setFormData({...formData, director: e.target.value})}
                placeholder="Enter director"
                className="w-full bg-transparent border-b border-border py-2 focus:outline-none font-serif"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold block">Collection Status</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as MovieStatus })}
                className="w-full bg-transparent border-b border-border py-2.5 focus:outline-none font-serif text-sm cursor-pointer"
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
            className="w-full mt-4 bg-foreground text-background py-4 font-serif italic hover:bg-foreground/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Confirm & Add to Archive
          </button>
        </form>
      </div>
    </div>
  );
}
