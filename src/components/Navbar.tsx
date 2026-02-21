import { Link, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';

export function Navbar() {
  const location = useLocation();
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');

  const openGlobalSearch = () => {
    window.dispatchEvent(new Event('open-global-search'));
  };

  const links = [
    { label: 'Books', path: '/library/books' },
    { label: 'Movies', path: '/library/movies' },
    { label: 'Songs', path: '/library/songs' },
    { label: 'Diary', path: '/library/diary' },
    { label: 'Profile', path: '/profile' },
  ];

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Changed this to Fragments to match your new landing page vibe */}
        <Link to="/" className="font-serif text-lg font-medium text-foreground">
          Fragments
        </Link>
        
        <nav className="flex items-center gap-4 md:gap-6">
          {links.map(link => {
            const isActive = location.pathname === link.path || 
              (link.path.includes('books') && location.pathname.startsWith('/book/')) ||
              (link.path.includes('movies') && location.pathname.startsWith('/movie/')) ||
              (link.path.includes('songs') && location.pathname.startsWith('/library/songs')) ||
              (link.path.includes('diary') && location.pathname.startsWith('/library/diary'));

            return (
              <Link
                key={link.label}
                to={link.path}
                className={`text-sm transition-colors ${
                  isActive
                    ? 'text-primary underline underline-offset-8 decoration-2'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={openGlobalSearch}
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Search className="h-3.5 w-3.5" />
            Search
            <span className="rounded border border-border/70 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/80">
              {isMac ? '⌘K' : 'Ctrl+K'}
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
}
