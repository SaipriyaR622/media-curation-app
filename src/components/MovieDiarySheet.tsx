import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Clapperboard, Plus, Star, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StarRating } from '@/components/StarRating';
import { MOVIE_STATUS_LABELS, Movie, MovieDiaryEntry, MovieStatus } from '@/lib/types';

interface MovieDiarySheetProps {
  movie: Movie | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateMovie: (id: string, updates: Partial<Movie>) => void;
  onAddDiaryEntry: (movieId: string, entry: Omit<MovieDiaryEntry, 'id' | 'createdAt'>) => void;
  onRemoveDiaryEntry: (movieId: string, entryId: string) => void;
}

const getToday = () => new Date().toISOString().split('T')[0];

function formatDiaryDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function MovieDiarySheet({
  movie,
  open,
  onOpenChange,
  onUpdateMovie,
  onAddDiaryEntry,
  onRemoveDiaryEntry,
}: MovieDiarySheetProps) {
  const [status, setStatus] = useState<MovieStatus>('watchlist');
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');

  const [entryDate, setEntryDate] = useState(getToday());
  const [entryRating, setEntryRating] = useState(0);
  const [entryReview, setEntryReview] = useState('');
  const [entryRewatch, setEntryRewatch] = useState(false);
  const initializedForMovieRef = useRef<string | null>(null);

  useEffect(() => {
    if (!movie || !open) {
      return;
    }

    if (initializedForMovieRef.current === movie.id) {
      return;
    }

    setStatus(movie.status);
    setRating(movie.rating);
    setReview(movie.review ?? '');
    setEntryDate(getToday());
    setEntryRating(movie.rating);
    setEntryReview('');
    setEntryRewatch(false);
    initializedForMovieRef.current = movie.id;
  }, [movie, open]);

  useEffect(() => {
    if (!open) {
      initializedForMovieRef.current = null;
    }
  }, [open]);

  const diaryEntries = useMemo(() => {
    if (!movie) {
      return [];
    }

    return [...movie.diaryEntries].sort((a, b) => {
      const dateCompare = b.watchedOn.localeCompare(a.watchedOn);
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [movie]);

  const handleSaveProfile = () => {
    if (!movie) {
      return;
    }
    onUpdateMovie(movie.id, { status, rating, review });
  };

  const handleAddEntry = () => {
    if (!movie || !entryDate) {
      return;
    }

    onAddDiaryEntry(movie.id, {
      watchedOn: entryDate,
      rating: entryRating,
      review: entryReview.trim(),
      rewatch: entryRewatch,
    });

    setEntryDate(getToday());
    setEntryRating(rating);
    setEntryReview('');
    setEntryRewatch(false);
    setStatus((prev) => (prev === 'watchlist' ? 'watched' : prev));
    if (entryRating > 0) {
      setRating(entryRating);
    }
  };

  if (!movie) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto border-l border-border bg-background sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="font-serif text-3xl leading-tight">{movie.title}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {movie.year || 'Unknown Year'} • {movie.director || 'Unknown Director'}
          </p>
        </SheetHeader>

        <div className="mt-8 space-y-8">
          <section className="space-y-4 rounded-md border border-border bg-card/40 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Select value={status} onValueChange={(value) => setStatus(value as MovieStatus)}>
                <SelectTrigger className="w-full rounded border-border sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MOVIE_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Rating</span>
                <StarRating rating={rating} onChange={setRating} />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Review</p>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Write a full review..."
                className="min-h-[130px] w-full resize-none rounded border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveProfile}
              className="w-full rounded bg-foreground px-4 py-3 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
            >
              Save Review & Rating
            </button>
          </section>

          <section className="space-y-4 rounded-md border border-border bg-card/40 p-5">
            <div className="flex items-center gap-2">
              <Clapperboard className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Log a Watch</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Date Watched</span>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Entry Rating</span>
                <div className="rounded border border-border bg-background px-3 py-[9px]">
                  <StarRating rating={entryRating} onChange={setEntryRating} size={16} />
                </div>
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={entryRewatch}
                onChange={(e) => setEntryRewatch(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              This was a rewatch
            </label>

            <textarea
              value={entryReview}
              onChange={(e) => setEntryReview(e.target.value)}
              placeholder="Diary note for this watch..."
              className="min-h-[100px] w-full resize-none rounded border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />

            <button
              type="button"
              onClick={handleAddEntry}
              className="inline-flex items-center gap-2 rounded border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              <Plus className="h-4 w-4" /> Add Diary Entry
            </button>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Diary</p>
              <span className="text-xs text-muted-foreground">{diaryEntries.length} entries</span>
            </div>

            {diaryEntries.length === 0 ? (
              <div className="rounded border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No diary entries yet.
              </div>
            ) : (
              <div className="space-y-3">
                {diaryEntries.map((entry) => (
                  <article key={entry.id} className="rounded border border-border bg-card/50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDiaryDate(entry.watchedOn)}
                        {entry.rewatch && (
                          <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            Rewatch
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveDiaryEntry(movie.id, entry.id)}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mb-3 flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3.5 w-3.5 ${
                            star <= entry.rating ? 'fill-primary text-primary' : 'fill-transparent text-border'
                          }`}
                        />
                      ))}
                    </div>

                    {entry.review ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{entry.review}</p>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">No note for this entry.</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
