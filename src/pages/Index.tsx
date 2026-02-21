import { useState } from 'react';
import { Search, Plus, LayoutGrid, Columns } from 'lucide-react';
import { useBooks } from '@/hooks/use-books';
import { BookCard } from '@/components/BookCard';
import { EmptyState } from '@/components/EmptyState';
import { AddBookModal } from '@/components/AddBookModal';
import { Navbar } from '@/components/Navbar';
import { BookStatus } from '@/lib/types';

const filters: { label: string; value: BookStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Want to Read', value: 'want-to-read' },
  { label: 'Reading', value: 'currently-reading' },
  { label: 'Read', value: 'read' },
];

const statusLabels: Record<BookStatus, string> = {
  'want-to-read': 'Want to Read',
  'currently-reading': 'Reading',
  read: 'Read',
};

const Index = () => {
  const { books, addBook, updateBook, filterBooks } = useBooks();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<BookStatus | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'spine'>('grid');

  const filtered = filterBooks(filter, search);
  const currentlyReading = books.filter((book) => book.status === 'currently-reading');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-serif text-4xl font-medium tracking-tight">My Library</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'spine' : 'grid')}
              className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-all hover:text-foreground"
            >
              {viewMode === 'grid' ? (
                <>
                  <Columns className="h-4 w-4" /> Spine View
                </>
              ) : (
                <>
                  <LayoutGrid className="h-4 w-4" /> Grid View
                </>
              )}
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-all hover:text-foreground"
            >
              <Plus className="h-4 w-4" /> Add Book
            </button>
          </div>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search your reading collection..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full border-b border-border bg-transparent py-2 pl-8 transition-colors focus:border-primary focus:outline-none"
          />
        </div>

        <div className="mb-12 flex gap-6 border-b border-border/40 pb-4 text-[11px] font-bold uppercase tracking-[0.2em]">
          {filters.map((entry) => (
            <button
              key={entry.value}
              onClick={() => setFilter(entry.value)}
              className={`transition-colors ${
                filter === entry.value
                  ? 'text-foreground underline underline-offset-8'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {currentlyReading.length > 0 && filter === 'all' && (
          <section className="mb-16">
            <p className="section-label mb-6">Currently Reading</p>
            <div
              className={`flex gap-5 overflow-x-auto pb-4 ${
                viewMode === 'spine' ? 'min-h-[220px] items-end border-b border-border' : ''
              }`}
            >
              {currentlyReading.map((book) => (
                <div key={book.id} className={viewMode === 'grid' ? 'w-48 flex-shrink-0' : 'flex-shrink-0'}>
                  <BookCard book={book} large viewMode={viewMode} onUpdateBook={updateBook} />
                </div>
              ))}
            </div>
          </section>
        )}

        {filtered.length === 0 && books.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <p className="py-24 text-center text-sm text-muted-foreground">No books match your search.</p>
        ) : (
          <section>
            {currentlyReading.length > 0 && filter === 'all' && <p className="section-label mb-6">Library</p>}
            <div
              className={
                viewMode === 'spine'
                  ? 'flex flex-nowrap items-end gap-1.5 overflow-x-auto border-b border-border pb-2'
                  : 'grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-4 lg:grid-cols-5'
              }
            >
              {filtered.map((book) =>
                viewMode === 'spine' ? (
                  <div key={book.id} className="flex-shrink-0">
                    <BookCard book={book} viewMode={viewMode} onUpdateBook={updateBook} />
                  </div>
                ) : (
                  <div key={book.id} className="flex flex-col gap-3">
                    <BookCard book={book} viewMode={viewMode} onUpdateBook={updateBook} />
                    <div className="space-y-1">
                      <h3 className="font-serif text-base font-medium leading-tight">{book.title}</h3>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {book.author || 'Unknown Author'}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="border border-border px-1.5 py-0.5 text-[9px] uppercase text-muted-foreground">
                          {statusLabels[book.status]}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        )}
      </main>

      <AddBookModal open={modalOpen} onOpenChange={setModalOpen} onAdd={addBook} />
    </div>
  );
};

export default Index;
