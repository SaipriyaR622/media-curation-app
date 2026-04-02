import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Search } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';


export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, ready: false });
  const navRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');

  const openGlobalSearch = () => {
    window.dispatchEvent(new Event('open-global-search'));
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
    } finally {
      setIsLoggingOut(false);
      navigate('/login', { replace: true });
    }
  };

  const links = [
    { label: 'Books', path: '/library/books' },
    { label: 'Movies', path: '/library/movies' },
    { label: 'Songs', path: '/library/songs' },
    { label: 'Diary', path: '/library/diary' },
    { label: 'Profile', path: '/profile' },
  ];

  const activeIndex = links.findIndex(link =>
    location.pathname === link.path ||
    (link.path.includes('books') && location.pathname.startsWith('/book/')) ||
    (link.path.includes('movies') && location.pathname.startsWith('/movie/')) ||
    (link.path.includes('songs') && location.pathname.startsWith('/library/songs')) ||
    (link.path.includes('diary') && location.pathname.startsWith('/library/diary'))
  );

  useEffect(() => {
    const activeEl = linkRefs.current[activeIndex];
    const navEl = navRef.current;
    if (!activeEl || !navEl) return;
    const navRect = navEl.getBoundingClientRect();
    const linkRect = activeEl.getBoundingClientRect();
    setIndicatorStyle({
      left: linkRect.left - navRect.left,
      width: linkRect.width,
      ready: true,
    });
  }, [activeIndex, location.pathname]);

  return (
    <header className="border-b-2 border-foreground/80 bg-background">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-6">
        <Link
          to="/"
          className="font-serif text-2xl font-bold uppercase tracking-tight text-foreground"
          style={{ letterSpacing: '-0.04em' }}
        >
          Fragments
        </Link>

        <nav ref={navRef} className="relative flex items-center gap-4 md:gap-8">
          {activeIndex >= 0 && indicatorStyle.ready && (
            <div
              className="pointer-events-none absolute -bottom-[10px] h-px bg-foreground/70"
              style={{
                left: indicatorStyle.left,
                width: indicatorStyle.width,
                transition: 'left 0.3s cubic-bezier(0.25, 1, 0.5, 1), width 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
              }}
            />
          )}

          {links.map((link, i) => {
            const isActive = i === activeIndex;
            return (
              <Link
                key={link.label}
                to={link.path}
                ref={el => { linkRefs.current[i] = el; }}
                className={`text-[11px] font-semibold uppercase tracking-[0.25em] md:tracking-[0.35em] transition-colors ${
                  isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={openGlobalSearch}
            className="inline-flex items-center gap-2 border border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <Search className="h-3.5 w-3.5" />
            Search
            <span className="border border-border/70 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/80">
              {isMac ? 'Cmd+K' : 'Ctrl+K'}
            </span>
          </button>
          <Link
            to="/resources"
            className="inline-flex items-center justify-center border border-border px-2.5 py-2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Resources"
            title="Resources"
          >
            <MapPin className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center border border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingOut ? 'Logging out...' : 'Log out'}
          </button>
        </nav>
      </div>
    </header>
  );
}
