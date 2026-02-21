import { useMemo, useState } from 'react';
import { BookOpen, Clapperboard, Search, Star } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { useBooks } from '@/hooks/use-books';
import { useMovies } from '@/hooks/use-movies';

type DiaryFilter = 'all' | 'books' | 'movies';

interface DiaryItem {
  id: string;
  mediaType: 'book' | 'movie';
  title: string;
  creator: string;
  date: string;
  createdAt: string;
  rating: number;
  review: string;
  isRevisit: boolean;
}

const FILTERS: DiaryFilter[] = ['all', 'books', 'movies'];

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

export default function Diary() {
  const { books } = useBooks();
  const { movies } = useMovies();
  const [filter, setFilter] = useState<DiaryFilter>('all');
  const [search, setSearch] = useState('');

  const entries = useMemo(() => {
    const bookEntries: DiaryItem[] = books.flatMap((book) =>
      (book.diaryEntries || []).map((entry) => ({
        id: `book-${book.id}-${entry.id}`,
        mediaType: 'book',
        title: book.title,
        creator: book.author || 'Unknown Author',
        date: entry.readOn,
        createdAt: entry.createdAt,
        rating: entry.rating,
        review: entry.review,
        isRevisit: entry.reread,
      }))
    );

    const movieEntries: DiaryItem[] = movies.flatMap((movie) =>
      (movie.diaryEntries || []).map((entry) => ({
        id: `movie-${movie.id}-${entry.id}`,
        mediaType: 'movie',
        title: movie.title,
        creator: movie.director || 'Unknown Director',
        date: entry.watchedOn,
        createdAt: entry.createdAt,
        rating: entry.rating,
        review: entry.review,
        isRevisit: entry.rewatch,
      }))
    );

    return [...bookEntries, ...movieEntries].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [books, movies]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesFilter = filter === 'all' || (filter === 'books' ? entry.mediaType === 'book' : entry.mediaType === 'movie');
      const query = search.trim().toLowerCase();
      const matchesSearch = !query ||
        entry.title.toLowerCase().includes(query) ||
        entry.creator.toLowerCase().includes(query) ||
        entry.review.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [entries, filter, search]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-serif text-4xl font-medium tracking-tight">Shared Diary</h1>
          <p className="text-sm text-muted-foreground">{filteredEntries.length} entries</p>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search title, creator, or entry text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border-b border-border bg-transparent py-2 pl-8 transition-colors focus:border-primary focus:outline-none"
          />
        </div>

        <div className="mb-10 flex gap-6 border-b border-border/40 pb-4 text-[11px] font-bold uppercase tracking-[0.2em]">
          {FILTERS.map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`transition-colors ${filter === value ? 'text-foreground underline underline-offset-8' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {value}
            </button>
          ))}
        </div>

        {filteredEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-20 text-center">
            <p className="font-serif italic text-muted-foreground">No diary entries yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <article key={entry.id} className="rounded border border-border bg-card/50 p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {entry.mediaType === 'book' ? (
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" /> Book
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Clapperboard className="h-3.5 w-3.5" /> Movie
                    </span>
                  )}
                  <span>•</span>
                  <span>{formatDiaryDate(entry.date)}</span>
                  {entry.isRevisit && (
                    <>
                      <span>•</span>
                      <span>{entry.mediaType === 'book' ? 'Reread' : 'Rewatch'}</span>
                    </>
                  )}
                </div>

                <h2 className="font-serif text-xl leading-tight">{entry.title}</h2>
                <p className="mb-3 text-xs uppercase tracking-[0.12em] text-muted-foreground">{entry.creator}</p>

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
      </main>
    </div>
  );
}
