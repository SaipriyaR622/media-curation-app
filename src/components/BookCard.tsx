import { useState } from 'react';
import { Book } from '@/lib/types';
import { BookDetail } from './BookDetails';

interface BookCardProps {
  book: Book;
  large?: boolean;
  viewMode?: 'grid' | 'spine';
  flat?: boolean;
  onOpenDetails?: (book: Book) => void;
  onUpdateBook?: (id: string, updates: Partial<Book>) => void;
}

export function BookCard({ book, large, viewMode = 'grid', flat = false, onOpenDetails, onUpdateBook }: BookCardProps) {
  const [imgError, setImgError] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const usesExternalDetail = typeof onOpenDetails === 'function';

  const handleOpenDetails = () => {
    if (usesExternalDetail) {
      onOpenDetails(book);
      return;
    }

    setDetailOpen(true);
  };

  // Logic: 100 pages = ~10px thickness
  const thickness = Math.min(Math.max((book.totalPages || 300) / 25, 8), 45);

  return (
    <>
      {/* 1. WRAPPER FOR CLICK EVENTS (Works for all modes) */}
      <div 
        onClick={handleOpenDetails} 
        className="cursor-pointer h-full w-full select-none"
      >
        
        {/* 2. FLAT MODE (For the Scrapbook) */}
        {flat ? (
          <div className="w-full h-full shadow-md transition-transform hover:scale-[1.02]">
            {!imgError ? (
              <img 
                src={book.coverUrl} 
                alt={book.title} 
                className="w-full h-full object-cover rounded-sm" 
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-muted p-2 text-center border border-border rounded-sm">
                <span className="font-serif text-[10px] font-bold uppercase tracking-tighter">
                  {book.title}
                </span>
              </div>
            )}
          </div>
        ) : viewMode === 'spine' ? (
          
          /* 3. SPINE VIEW */
          <div 
            className="relative group flex items-end justify-center border-l border-border shadow-sm transition-all hover:-translate-y-2"
            style={{ 
              width: `${thickness}px`, 
              height: large ? '220px' : '180px', 
              backgroundColor: book.color || '#d1d5db'
            }}
          >
            <span className="pointer-events-none h-full truncate py-3 font-serif text-[10px] font-bold leading-none text-foreground/70 [writing-mode:vertical-rl] rotate-180">
              {book.title}
            </span>
          </div>
        ) : (
          
          /* 4. GRID/3D VIEW */
          <div className={`group [perspective:1000px] w-full ${large ? 'h-72' : 'aspect-[2/3]'}`}>
            <div 
              className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(-25deg)]"
              style={{ transformOrigin: 'left' }}
            >
              {/* Front Cover */}
              <div className="absolute inset-0 z-10 shadow-lg [backface-visibility:hidden]">
                {!imgError ? (
                  <img 
                    src={book.coverUrl} 
                    alt={book.title} 
                    className="w-full h-full object-cover rounded-r-sm" 
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-r-sm border-l-4 border-border bg-muted p-4 text-center">
                    <span className="font-serif text-sm font-bold uppercase tracking-tighter text-muted-foreground">
                      {book.title}
                    </span>
                    <div className="mt-2 h-px w-8 bg-border" />
                  </div>
                )}
              </div>

              {/* Page Thickness (The Side) */}
              <div 
                className="absolute right-0 top-0 h-full origin-right bg-card"
                style={{ 
                  width: `${thickness}px`,
                  backgroundImage: 'repeating-linear-gradient(90deg, hsl(var(--border)) 0px, hsl(var(--border)) 1px, transparent 1px, transparent 4px)',
                  transform: `translateX(${thickness}px) rotateY(90deg)`
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 5. DETAIL PANEL (JOURNAL) - Outside the click wrapper */}
      {!usesExternalDetail && (
        <BookDetail 
          book={book} 
          open={detailOpen} 
          onOpenChange={setDetailOpen} 
          onUpdate={onUpdateBook ?? (() => undefined)}
        />
      )}
    </>
  );
}
