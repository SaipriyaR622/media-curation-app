import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CalendarDays, Plus, Star, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Book } from '@/lib/types';
import { StarRating } from '@/components/StarRating';

interface BookDetailProps {
  book: Book;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: Partial<Book>) => void;
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

export function BookDetail({ book, open, onOpenChange, onUpdate }: BookDetailProps) {
  const [review, setReview] = useState(book.review || '');
  const [rating, setRating] = useState(book.rating || 0);
  const [entryDate, setEntryDate] = useState(getToday());
  const [entryRating, setEntryRating] = useState(book.rating || 0);
  const [entryReview, setEntryReview] = useState('');
  const [entryReread, setEntryReread] = useState(false);
  const initializedForBookRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      initializedForBookRef.current = null;
      return;
    }
    if (initializedForBookRef.current === book.id) {
      return;
    }

    setReview(book.review || '');
    setRating(book.rating || 0);
    setEntryDate(getToday());
    setEntryRating(book.rating || 0);
    setEntryReview('');
    setEntryReread(false);
    initializedForBookRef.current = book.id;
  }, [book, open]);

  const diaryEntries = useMemo(() => {
    return [...(book.diaryEntries || [])].sort((a, b) => {
      const dateCompare = b.readOn.localeCompare(a.readOn);
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [book.diaryEntries]);

  const handleSave = () => {
    onUpdate(book.id, { review, rating });
  };

  const handleAddDiaryEntry = () => {
    if (!entryDate) {
      return;
    }

    const diaryEntry = {
      id: crypto.randomUUID(),
      readOn: entryDate,
      rating: entryRating,
      review: entryReview.trim(),
      reread: entryReread,
      createdAt: new Date().toISOString(),
    };

    onUpdate(book.id, {
      status: 'read',
      rating: entryRating > 0 ? entryRating : rating,
      diaryEntries: [diaryEntry, ...(book.diaryEntries || [])],
    });

    setEntryDate(getToday());
    setEntryRating(rating);
    setEntryReview('');
    setEntryReread(false);
    if (entryRating > 0) {
      setRating(entryRating);
    }
  };

  const handleRemoveDiaryEntry = (entryId: string) => {
    onUpdate(book.id, {
      diaryEntries: (book.diaryEntries || []).filter((entry) => entry.id !== entryId),
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto border-l border-border bg-background sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="font-serif text-3xl leading-tight">{book.title}</SheetTitle>
          <p className="text-sm text-muted-foreground">by {book.author || 'Unknown Author'}</p>
        </SheetHeader>

        <div className="mt-8 space-y-8">
          <section className="space-y-4 rounded-md border border-border bg-card/40 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Review</p>
              <StarRating rating={rating} onChange={setRating} />
            </div>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="How did this book make you feel?"
              className="min-h-[130px] w-full resize-none rounded border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSave}
              className="w-full rounded bg-foreground px-4 py-3 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
            >
              Save Review & Rating
            </button>
          </section>

          <section className="space-y-4 rounded-md border border-border bg-card/40 p-5">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Log a Reading Session</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Date Read</span>
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
                checked={entryReread}
                onChange={(e) => setEntryReread(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              This was a reread
            </label>

            <textarea
              value={entryReview}
              onChange={(e) => setEntryReview(e.target.value)}
              placeholder="Diary note for this reading..."
              className="min-h-[100px] w-full resize-none rounded border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />

            <button
              type="button"
              onClick={handleAddDiaryEntry}
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
                        {formatDiaryDate(entry.readOn)}
                        {entry.reread && (
                          <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            Reread
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDiaryEntry(entry.id)}
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
