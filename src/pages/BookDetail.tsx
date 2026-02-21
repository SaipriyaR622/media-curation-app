import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, X } from 'lucide-react';
import { useBooks } from '@/hooks/use-books';
import { Navbar } from '@/components/Navbar';
import { StarRating } from '@/components/StarRating';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookStatus, STATUS_LABELS } from '@/lib/types';
import { useState } from 'react';

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getBook, updateBook, deleteBook } = useBooks();
  const book = getBook(id || '');
  const [newTag, setNewTag] = useState('');

  if (!book) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32">
          <p className="text-muted-foreground">Book not found.</p>
          <button onClick={() => navigate('/library')} className="mt-4 text-sm text-foreground underline underline-offset-4">Go back</button>
        </div>
      </div>
    );
  }

  const progress = book.totalPages > 0 ? Math.round((book.currentPage / book.totalPages) * 100) : 0;

  const addTag = () => {
    if (newTag.trim() && !book.tags.includes(newTag.trim())) {
      updateBook(book.id, { tags: [...book.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    updateBook(book.id, { tags: book.tags.filter(t => t !== tag) });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-16 animate-fade-in">
        <button onClick={() => navigate('/library')} className="mb-10 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to library
        </button>

        <div className="flex flex-col gap-12 md:flex-row">
          {/* Cover */}
          <div className="flex-shrink-0">
            <div className="w-52 overflow-hidden rounded border border-border bg-muted">
              {book.coverUrl ? (
                <img src={book.coverUrl} alt={book.title} className="aspect-[2/3] w-full object-cover" />
              ) : (
                <div className="flex aspect-[2/3] w-full items-center justify-center bg-muted">
                  <span className="font-serif text-4xl text-muted-foreground">{book.title.charAt(0)}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => { deleteBook(book.id); navigate('/library'); }}
              className="mt-4 flex w-52 items-center justify-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" /> Remove book
            </button>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-10">
            <div className="space-y-3">
              <input
                value={book.title}
                onChange={e => updateBook(book.id, { title: e.target.value })}
                className="w-full bg-transparent font-serif text-3xl font-medium text-foreground focus:outline-none"
              />
              <input
                value={book.author}
                onChange={e => updateBook(book.id, { author: e.target.value })}
                className="w-full bg-transparent text-base text-muted-foreground focus:outline-none"
                placeholder="Author"
              />
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <Select value={book.status} onValueChange={(v) => updateBook(book.id, { status: v as BookStatus })}>
                <SelectTrigger className="w-48 rounded border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <StarRating rating={book.rating} onChange={(r) => updateBook(book.id, { rating: r })} />
            </div>

            {/* Progress */}
            {book.status === 'currently-reading' && (
              <div className="space-y-4">
                <p className="section-label">Reading Progress</p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={book.currentPage || ''}
                    onChange={e => updateBook(book.id, { currentPage: Math.min(parseInt(e.target.value) || 0, book.totalPages) })}
                    placeholder="Current"
                    className="w-20 border-b border-border bg-transparent pb-1 text-center text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                  <span className="text-sm text-muted-foreground">of</span>
                  <input
                    type="number"
                    value={book.totalPages || ''}
                    onChange={e => updateBook(book.id, { totalPages: parseInt(e.target.value) || 0 })}
                    placeholder="Total"
                    className="w-20 border-b border-border bg-transparent pb-1 text-center text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                  <span className="text-sm text-muted-foreground">pages</span>
                </div>
                <div className="h-0.5 w-full overflow-hidden rounded-full bg-border">
                  <div className="h-full bg-primary transition-all duration-700" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">{progress}% complete</p>
              </div>
            )}

            {/* Review */}
            <div className="space-y-4">
              <p className="section-label">Your Thoughts</p>
              <textarea
                value={book.review}
                onChange={e => updateBook(book.id, { review: e.target.value })}
                placeholder="Write your thoughts here…"
                className="min-h-[120px] w-full resize-none rounded border border-border bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <input
                value={book.favoriteQuote || ''}
                onChange={e => updateBook(book.id, { favoriteQuote: e.target.value })}
                placeholder="Favorite quote…"
                className="w-full border-b border-border bg-transparent pb-2 text-sm italic text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            {/* Tags */}
            <div className="space-y-3">
              <p className="section-label">Tags</p>
              <div className="flex flex-wrap gap-2">
                {book.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs text-muted-foreground">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-foreground"><X className="h-3 w-3" /></button>
                  </span>
                ))}
                <input
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTag()}
                  placeholder="Add tag…"
                  className="w-24 border-b border-border bg-transparent pb-1 text-xs text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
