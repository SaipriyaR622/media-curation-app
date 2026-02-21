import { useState, useEffect, type ChangeEvent } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Search, Loader2, X } from 'lucide-react';
import { BookStatus } from '@/lib/types';

interface SearchResult {
  title: string;
  author: string;
  coverUrl: string;
  key: string;
  pages?: number;
}

interface OpenLibraryDoc {
  title: string;
  author_name?: string[];
  cover_i?: number;
  key: string;
  number_of_pages_median?: number;
}

interface AddBookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (book: { title: string; author: string; coverUrl: string; totalPages: number; status: BookStatus; color?: string }) => void;
}

export function AddBookModal({ open, onOpenChange, onAdd }: AddBookModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [status, setStatus] = useState<BookStatus>('want-to-read');
  const [color, setColor] = useState('#d1d5db');

  const fragmentsColors = ['#e2cfc4', '#a3ad91', '#8b5e3c', '#4a5d4e', '#d4a373'];

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=5&fields=title,author_name,cover_i,key,number_of_pages_median`
        );
        const data = await res.json();
        setResults(
          (data.docs || []).map((d: OpenLibraryDoc) => ({
            title: d.title,
            author: d.author_name?.[0] || 'Unknown',
            coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : '',
            key: d.key,
            pages: d.number_of_pages_median || 0,
          }))
        );
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectResult = (r: SearchResult) => {
    setTitle(r.title);
    setAuthor(r.author);
    setCoverUrl(r.coverUrl || '');
    setTotalPages(r.pages?.toString() || '');
    setResults([]);
    setSearchQuery(r.title);
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({ title, author, coverUrl, totalPages: parseInt(totalPages) || 0, status, color });
    resetForm();
    onOpenChange(false);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverUrl((reader.result as string) || '');
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setSearchQuery('');
    setResults([]);
    setTitle('');
    setAuthor('');
    setCoverUrl('');
    setTotalPages('');
    setStatus('want-to-read');
    setColor('#d1d5db');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="w-full border border-border bg-background p-8 shadow-2xl sm:max-w-lg [&>button]:hidden">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif text-3xl italic">Archive Book</h2>
          <button
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative mb-10">
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Search Database
          </label>
          <div className="relative">
            <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              placeholder="Search book title..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full border-b border-stone-300 bg-transparent py-2 pl-8 font-serif text-lg focus:border-primary focus:outline-none"
            />
            {searching && <Loader2 className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-stone-400" />}
          </div>

          {results.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-sm border border-stone-200 bg-white shadow-xl">
              {results.map(r => (
                <button
                  key={r.key}
                  onClick={() => selectResult(r)}
                  className="flex w-full items-center gap-4 border-b border-stone-100 p-3 text-left transition-colors last:border-0 hover:bg-stone-50"
                >
                  {r.coverUrl ? (
                    <img src={r.coverUrl} alt="" className="h-14 w-10 rounded-sm object-cover shadow-sm" />
                  ) : (
                    <div className="flex h-14 w-10 items-center justify-center rounded-sm border border-stone-200 bg-stone-100 px-0.5 text-center text-[8px] font-serif font-bold text-stone-400">
                      NO COVER
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-serif text-sm font-medium leading-tight text-stone-900">{r.title}</p>
                    <p className="mt-1 truncate text-[10px] text-stone-400">{r.author}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <form
          className="space-y-6 border-t border-dashed border-stone-200 pt-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Title</label>
            <input
              placeholder="Enter title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border-b border-border bg-transparent py-2 font-serif focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Author</label>
              <input
                placeholder="Enter author"
                value={author}
                onChange={e => setAuthor(e.target.value)}
                className="w-full border-b border-border bg-transparent py-2 font-serif focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Pages</label>
              <input
                placeholder="Number of pages"
                type="number"
                value={totalPages}
                onChange={e => setTotalPages(e.target.value)}
                className="w-full border-b border-border bg-transparent py-2 font-serif focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Collection Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as BookStatus)}
              className="w-full cursor-pointer border-b border-border bg-transparent py-2.5 font-serif text-sm focus:outline-none"
            >
              <option value="want-to-read">Want to Read</option>
              <option value="currently-reading">Currently Reading</option>
              <option value="read">Read</option>
            </select>
          </div>

          {coverUrl && (
            <div className="flex flex-col items-center gap-2">
              <img src={coverUrl} alt="Preview" className="h-32 rounded object-cover shadow-md" />
              <button
                type="button"
                onClick={() => setCoverUrl('')}
                className="text-[10px] uppercase tracking-tighter text-muted-foreground transition-colors hover:text-destructive"
              >
                Remove Cover
              </button>
            </div>
          )}

          <div className="border-b border-border pb-2">
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cover</label>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors hover:text-primary">
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                <span>Upload Custom Cover</span>
              </label>
              <span className="text-xs text-stone-300">or</span>
              <input
                placeholder="Paste image URL..."
                value={coverUrl}
                onChange={e => setCoverUrl(e.target.value)}
                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Spine Color</label>
            <div className="flex gap-2 py-1">
              {fragmentsColors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-4 w-4 rounded-full border border-black/5 transition-transform ${color === c ? 'scale-125 ring-1 ring-stone-400' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!title.trim()}
            className="mt-4 w-full bg-foreground py-4 font-serif italic text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Confirm & Add to Archive
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
