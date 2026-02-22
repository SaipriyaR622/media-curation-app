import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useBooks } from '@/hooks/use-books';
import { useMovies } from '@/hooks/use-movies';
import { useSongs } from '@/hooks/use-songs';
import { useProfile } from '@/hooks/use-profile';
import { Navbar } from '@/components/Navbar';
import { BookCard } from '@/components/BookCard';
import { BookDetail } from '@/components/BookDetails';
import { MovieDiarySheet } from '@/components/MovieDiarySheet';
import { Switch } from '@/components/ui/switch';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Music2, Pause, Play, Plus, UserCheck, UserPlus, X } from 'lucide-react';
import { Book, Movie, Song } from '@/lib/types';
import { isSupabaseConfigured } from '@/lib/supabase';

type ScrapbookItemKind =
  | 'book'
  | 'movie'
  | 'song'
  | 'sticky-note'
  | 'ambient-quote'
  | 'washi-tape'
  | 'paperclip';

type DrawerTab = 'media' | 'decor';
type DecorVariant = 'honey' | 'rose' | 'mint' | 'paperclip';

const CANVAS_HEIGHT = 2200;
const CANVAS_PADDING = 80;
const CANVAS_ITEM_BASE_WIDTH = 160;
const CANVAS_ITEM_BASE_HEIGHT = 240;
const CANVAS_STORAGE_KEY = 'fragments-profile-canvas-items';

const TAPE_ARTWORK: Record<Exclude<DecorVariant, 'paperclip'>, string> = {
  honey:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 62'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='0'%3E%3Cstop offset='0' stop-color='%23f9d976' stop-opacity='.92'/%3E%3Cstop offset='1' stop-color='%23f39f86' stop-opacity='.92'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect x='2' y='2' width='216' height='58' rx='8' fill='url(%23g)'/%3E%3Cpath d='M24 2v58M56 2v58M88 2v58M120 2v58M152 2v58M184 2v58' stroke='%23fff' stroke-opacity='.34' stroke-width='2'/%3E%3C/svg%3E",
  rose:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 62'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='0'%3E%3Cstop offset='0' stop-color='%23f8c7d8' stop-opacity='.92'/%3E%3Cstop offset='1' stop-color='%23f4a6c4' stop-opacity='.92'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect x='2' y='2' width='216' height='58' rx='8' fill='url(%23g)'/%3E%3Cpath d='M24 2v58M56 2v58M88 2v58M120 2v58M152 2v58M184 2v58' stroke='%23fff' stroke-opacity='.34' stroke-width='2'/%3E%3C/svg%3E",
  mint:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 62'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='0'%3E%3Cstop offset='0' stop-color='%23a6dbc9' stop-opacity='.92'/%3E%3Cstop offset='1' stop-color='%2389d6e4' stop-opacity='.92'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect x='2' y='2' width='216' height='58' rx='8' fill='url(%23g)'/%3E%3Cpath d='M24 2v58M56 2v58M88 2v58M120 2v58M152 2v58M184 2v58' stroke='%23fff' stroke-opacity='.34' stroke-width='2'/%3E%3C/svg%3E",
};

const PAPERCLIP_ARTWORK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 200'%3E%3Cg fill='none' stroke='%23494f56' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M35 54v78c0 29 50 29 50 0V46c0-18-30-18-30 0v82c0 8 12 8 12 0V67' stroke-width='10'/%3E%3Cpath d='M42 50h44' stroke='%23cfd4db' stroke-width='3'/%3E%3C/g%3E%3C/svg%3E";

interface ScrapbookItem {
  id: string;
  title: string;
  coverUrl?: string;
  kind: ScrapbookItemKind;
  book?: Book;
  movie?: Movie;
  song?: Song;
  text?: string;
  decorVariant?: DecorVariant;
  baseWidth: number;
  baseHeight: number;
  instanceId: number;
  initialX: number;
  initialY: number;
  rotation: number;
  scale: number;
  zIndex: number;
}

type PersistedScrapbookItem = Omit<ScrapbookItem, 'book' | 'movie' | 'song'>;

const SCRAPBOOK_ITEM_KINDS: ScrapbookItemKind[] = [
  'book',
  'movie',
  'song',
  'sticky-note',
  'ambient-quote',
  'washi-tape',
  'paperclip',
];
const DECOR_VARIANTS: DecorVariant[] = ['honey', 'rose', 'mint', 'paperclip'];

function isScrapbookItemKind(value: unknown): value is ScrapbookItemKind {
  return typeof value === 'string' && SCRAPBOOK_ITEM_KINDS.includes(value as ScrapbookItemKind);
}

function isDecorVariant(value: unknown): value is DecorVariant {
  return typeof value === 'string' && DECOR_VARIANTS.includes(value as DecorVariant);
}

function normalizePinnedItem(value: unknown): ScrapbookItem | null {
  const candidate = (value ?? {}) as Partial<PersistedScrapbookItem>;
  if (!isScrapbookItemKind(candidate.kind)) {
    return null;
  }

  return {
    id: typeof candidate.id === 'string' ? candidate.id : crypto.randomUUID(),
    title: typeof candidate.title === 'string' ? candidate.title : 'Untitled',
    coverUrl: typeof candidate.coverUrl === 'string' ? candidate.coverUrl : undefined,
    kind: candidate.kind,
    text: typeof candidate.text === 'string' ? candidate.text : undefined,
    decorVariant: isDecorVariant(candidate.decorVariant) ? candidate.decorVariant : undefined,
    baseWidth:
      typeof candidate.baseWidth === 'number' && candidate.baseWidth > 0
        ? candidate.baseWidth
        : CANVAS_ITEM_BASE_WIDTH,
    baseHeight:
      typeof candidate.baseHeight === 'number' && candidate.baseHeight > 0
        ? candidate.baseHeight
        : CANVAS_ITEM_BASE_HEIGHT,
    instanceId:
      typeof candidate.instanceId === 'number' && Number.isFinite(candidate.instanceId)
        ? candidate.instanceId
        : Math.random(),
    initialX:
      typeof candidate.initialX === 'number' && Number.isFinite(candidate.initialX)
        ? candidate.initialX
        : CANVAS_PADDING,
    initialY:
      typeof candidate.initialY === 'number' && Number.isFinite(candidate.initialY)
        ? candidate.initialY
        : CANVAS_PADDING,
    rotation:
      typeof candidate.rotation === 'number' && Number.isFinite(candidate.rotation)
        ? candidate.rotation
        : 0,
    scale:
      typeof candidate.scale === 'number' && Number.isFinite(candidate.scale)
        ? Math.min(Math.max(candidate.scale, 0.5), 2)
        : 1,
    zIndex:
      typeof candidate.zIndex === 'number' && Number.isFinite(candidate.zIndex)
        ? candidate.zIndex
        : 10,
  };
}

function loadPinnedItems(): ScrapbookItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(CANVAS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => normalizePinnedItem(entry))
      .filter((entry): entry is ScrapbookItem => entry !== null);
  } catch {
    return [];
  }
}

function savePinnedItems(items: ScrapbookItem[]) {
  if (typeof window === 'undefined') {
    return;
  }

  const persistedItems: PersistedScrapbookItem[] = items.map(({ book, movie, song, ...entry }) => entry);
  localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(persistedItems));
}

export default function Profile() {
  const { books, updateBook } = useBooks();
  const { movies, updateMovie, addDiaryEntry, removeDiaryEntry } = useMovies();
  const { songs, logPlay } = useSongs();
  const {
    profile,
    updateProfile,
    discoverProfiles,
    followingIds,
    socialReady,
    socialError,
    followsTableAvailable,
    toggleFollow,
  } = useProfile();
  const { theme, setTheme } = useTheme();
  const { scrollY } = useScroll();
  const canvasButtonBottom = useTransform(scrollY, [0, 1400], [48, 20]);
  const canvasRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pinnedItems, setPinnedItems] = useState<ScrapbookItem[]>(loadPinnedItems);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('media');
  const [noteDraft, setNoteDraft] = useState('Watch this on a rainy day.');
  const [quoteDraft, setQuoteDraft] = useState('Some stories glow louder in silence.');
  const [activeTextItemId, setActiveTextItemId] = useState<number | null>(null);
  const [selectedCanvasBookId, setSelectedCanvasBookId] = useState<string | null>(null);
  const [selectedCanvasMovieId, setSelectedCanvasMovieId] = useState<string | null>(null);
  const [playingSongInstanceId, setPlayingSongInstanceId] = useState<number | null>(null);
  const [embeddedSpotifyTrackId, setEmbeddedSpotifyTrackId] = useState<string | null>(null);
  const canvasAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    savePinnedItems(pinnedItems);
  }, [pinnedItems]);

  useEffect(() => {
    return () => {
      canvasAudioRef.current?.pause();
      canvasAudioRef.current = null;
    };
  }, []);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateProfile({ avatarUrl: reader.result as string });
    };
    reader.readAsDataURL(file);

    event.target.value = '';
  };

  const triggerAvatarUpload = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveAvatar = () => {
    updateProfile({ avatarUrl: '' });
  };

  const getSpawnPosition = (itemWidth: number, itemHeight: number) => {
    const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth;
    const viewportHeight = typeof window === 'undefined' ? 800 : window.innerHeight;
    const pageScrollY = typeof window === 'undefined' ? 0 : window.scrollY;
    const canvasTop = canvasRef.current?.offsetTop ?? 0;
    const localScrollY = Math.max(pageScrollY - canvasTop, 0);
    const spawnWidth = Math.max(viewportWidth - itemWidth - CANVAS_PADDING * 2, 1);
    const visibleHeight = Math.max(viewportHeight - itemHeight - CANVAS_PADDING * 2, 220);
    const maxCanvasY = Math.max(CANVAS_HEIGHT - itemHeight - CANVAS_PADDING, CANVAS_PADDING);
    const minY = Math.min(
      Math.max(localScrollY + CANVAS_PADDING, CANVAS_PADDING),
      maxCanvasY
    );
    const maxY = Math.min(minY + visibleHeight, maxCanvasY);
    const yRange = Math.max(maxY - minY, 1);

    return {
      initialX: Math.random() * spawnWidth + CANVAS_PADDING,
      initialY: minY + Math.random() * yRange,
    };
  };

  const pushItemToCanvas = (
    item: Omit<ScrapbookItem, 'instanceId' | 'initialX' | 'initialY' | 'rotation' | 'scale' | 'zIndex'>
  ) => {
    setPinnedItems(prev => {
      const topZ = prev.reduce((max, pinned) => Math.max(max, pinned.zIndex), 0);
      const { initialX, initialY } = getSpawnPosition(item.baseWidth, item.baseHeight);
      const rotationSpread =
        item.kind === 'washi-tape' ? 12 : item.kind === 'paperclip' ? 16 : item.kind === 'ambient-quote' ? 8 : 20;

      const newItem: ScrapbookItem = {
        ...item,
        instanceId: Math.random(),
        initialX,
        initialY,
        rotation: Math.random() * rotationSpread - rotationSpread / 2,
        scale: 1,
        zIndex: topZ + 10,
      };

      return [...prev, newItem];
    });
  };

  const addToCanvas = (item: Book | Movie | Song, kind: 'book' | 'movie' | 'song') => {
    pushItemToCanvas({
      id: item.id,
      title: item.title,
      coverUrl: item.coverUrl,
      kind,
      book: kind === 'book' ? (item as Book) : undefined,
      movie: kind === 'movie' ? (item as Movie) : undefined,
      song: kind === 'song' ? (item as Song) : undefined,
      baseWidth: kind === 'song' ? 180 : CANVAS_ITEM_BASE_WIDTH,
      baseHeight: kind === 'song' ? 180 : CANVAS_ITEM_BASE_HEIGHT,
    });
  };

  const addStickyNoteToCanvas = () => {
    pushItemToCanvas({
      id: crypto.randomUUID(),
      title: 'Sticky Note',
      kind: 'sticky-note',
      text: noteDraft.trim() || 'Watch this on a rainy day.',
      baseWidth: 210,
      baseHeight: 210,
    });
  };

  const addAmbientQuoteToCanvas = () => {
    pushItemToCanvas({
      id: crypto.randomUUID(),
      title: 'Ambient Quote',
      kind: 'ambient-quote',
      text: quoteDraft.trim() || 'Some stories glow louder in silence.',
      baseWidth: 430,
      baseHeight: 150,
    });
  };

  const addDecorFragment = (variant: DecorVariant) => {
    if (variant === 'paperclip') {
      pushItemToCanvas({
        id: crypto.randomUUID(),
        title: 'Paperclip',
        kind: 'paperclip',
        decorVariant: 'paperclip',
        coverUrl: PAPERCLIP_ARTWORK,
        baseWidth: 80,
        baseHeight: 130,
      });
      return;
    }

    pushItemToCanvas({
      id: crypto.randomUUID(),
      title: 'Washi Tape',
      kind: 'washi-tape',
      decorVariant: variant,
      coverUrl: TAPE_ARTWORK[variant],
      baseWidth: 140,
      baseHeight: 42,
    });
  };

  const updatePinnedItem = (instanceId: number, updates: Partial<ScrapbookItem>) => {
    setPinnedItems(prev =>
      prev.map(item => (item.instanceId === instanceId ? { ...item, ...updates } : item))
    );
  };

  const adjustScale = (instanceId: number, delta: number) => {
    setPinnedItems(prev =>
      prev.map(item =>
        item.instanceId === instanceId
          ? { ...item, scale: Math.min(Math.max(item.scale + delta, 0.5), 2) }
          : item
      )
    );
  };

  const adjustRotation = (instanceId: number, delta: number) => {
    setPinnedItems(prev =>
      prev.map(item =>
        item.instanceId === instanceId ? { ...item, rotation: item.rotation + delta } : item
      )
    );
  };

  const bringToFront = (instanceId: number) => {
    setPinnedItems(prev => {
      const topZ = prev.reduce((max, item) => Math.max(max, item.zIndex), 0);
      return prev.map(item =>
        item.instanceId === instanceId ? { ...item, zIndex: topZ + 10 } : item
      );
    });
  };

  const removePinnedItem = (instanceId: number) => {
    setPinnedItems((prev) => prev.filter((pinned) => pinned.instanceId !== instanceId));
    if (playingSongInstanceId === instanceId) {
      canvasAudioRef.current?.pause();
      canvasAudioRef.current = null;
      setPlayingSongInstanceId(null);
    }
  };

  const selectedCanvasBook = selectedCanvasBookId
    ? books.find((book) => book.id === selectedCanvasBookId) ?? null
    : null;
  const selectedCanvasMovie = selectedCanvasMovieId
    ? movies.find((movie) => movie.id === selectedCanvasMovieId) ?? null
    : null;

  const openCanvasItemDetails = (item: ScrapbookItem) => {
    bringToFront(item.instanceId);

    if (item.kind === 'book') {
      setSelectedCanvasBookId(item.id);
      return;
    }

    if (item.kind === 'movie') {
      setSelectedCanvasMovieId(item.id);
    }
  };

  const handleCanvasSongClick = async (item: ScrapbookItem, linkedSong?: Song) => {
    bringToFront(item.instanceId);
    const targetSong = linkedSong ?? item.song;
    if (!targetSong) {
      return;
    }

    if (!targetSong.previewUrl) {
      const spotifyTrackId = targetSong.spotifyId || extractSpotifyTrackId(targetSong.spotifyUrl);
      if (spotifyTrackId) {
        canvasAudioRef.current?.pause();
        canvasAudioRef.current = null;
        setPlayingSongInstanceId(null);
        setEmbeddedSpotifyTrackId(spotifyTrackId);
        logPlay(targetSong.id);
      }
      return;
    }

    const currentAudio = canvasAudioRef.current;
    if (playingSongInstanceId === item.instanceId && currentAudio && !currentAudio.paused) {
      currentAudio.pause();
      setPlayingSongInstanceId(null);
      return;
    }

    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    setEmbeddedSpotifyTrackId(null);

    const audio = new Audio(targetSong.previewUrl);
    audio.onended = () => setPlayingSongInstanceId(null);
    audio.onerror = () => setPlayingSongInstanceId(null);
    canvasAudioRef.current = audio;

    try {
      await audio.play();
      setPlayingSongInstanceId(item.instanceId);
      logPlay(targetSong.id);
    } catch {
      setPlayingSongInstanceId(null);
      const spotifyTrackId = targetSong.spotifyId || extractSpotifyTrackId(targetSong.spotifyUrl);
      if (spotifyTrackId) {
        setEmbeddedSpotifyTrackId(spotifyTrackId);
      }
    }
  };

  const closeEmbeddedSpotifyPlayer = () => {
    setEmbeddedSpotifyTrackId(null);
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-background transition-colors duration-500 overflow-x-hidden">
      <Navbar />

      <main className="mx-auto max-w-full px-6 py-16 animate-fade-in">
        <div className="mx-auto max-w-4xl mb-12 flex flex-col items-center text-center space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-border bg-muted shadow-sm">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={`${profile.name}'s avatar`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-serif text-3xl">
                  {profile.name.charAt(0)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={triggerAvatarUpload}
                className="rounded-full border border-border/50 bg-background px-4 py-1 text-xs uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                Change photo
              </button>
              {profile.avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="rounded-full border border-destructive/40 px-3 py-1 text-xs uppercase tracking-[0.25em] text-destructive transition-colors hover:bg-destructive/10"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleAvatarChange}
          />

          <input
            value={profile.name}
            onChange={e => updateProfile({ name: e.target.value })}
            className="block w-full bg-transparent text-center font-serif text-4xl font-medium focus:outline-none"
          />
          <textarea
            value={profile.bio}
            onChange={e => updateProfile({ bio: e.target.value })}
            placeholder="A short bio…"
            className="w-full max-w-md resize-none bg-transparent text-center text-sm text-muted-foreground focus:outline-none"
            rows={2}
          />
          <div className="mt-2 grid w-full max-w-sm grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/70 bg-background/60 px-4 py-3 text-left">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Followers</span>
              <p className="mt-1 block w-full font-serif text-2xl leading-none text-foreground">{profile.followers}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/60 px-4 py-3 text-left">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Following</span>
              <p className="mt-1 block w-full font-serif text-2xl leading-none text-foreground">{profile.following}</p>
            </div>
          </div>
        </div>

        {isSupabaseConfigured && (
          <section className="mx-auto mb-10 w-full max-w-4xl space-y-3">
            <div className="flex items-center justify-between">
              <p className="section-label">Readers</p>
              {!socialReady && <p className="text-xs text-muted-foreground">Loading social graph...</p>}
            </div>

            {socialError && (
              <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {socialError}
              </p>
            )}

            {!followsTableAvailable ? (
              <p className="rounded-xl border border-border bg-background/50 px-4 py-3 text-sm text-muted-foreground">
                Run the latest migration to enable follow relationships.
              </p>
            ) : discoverProfiles.length === 0 ? (
              <p className="rounded-xl border border-border bg-background/50 px-4 py-3 text-sm text-muted-foreground">
                No other reader profiles found yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {discoverProfiles.map((reader) => {
                  const isFollowing = followingIds.includes(reader.id);

                  return (
                    <article
                      key={reader.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-full border border-border bg-muted">
                          {reader.avatarUrl ? (
                            <img src={reader.avatarUrl} alt={`${reader.name}'s avatar`} className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center font-serif text-base text-foreground">
                              {reader.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-serif text-lg">{reader.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{reader.bio}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void toggleFollow(reader.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          isFollowing
                            ? 'border-border bg-background text-muted-foreground hover:text-foreground'
                            : 'border-foreground bg-foreground text-background hover:opacity-90'
                        }`}
                      >
                        {isFollowing ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <section
          ref={canvasRef}
          className="relative w-screen left-1/2 right-1/2 -ml-[50vw] min-h-[2200px] bg-[#dbdbdb] dark:bg-muted/10 overflow-visible"
        >
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-0 pointer-events-none text-center opacity-40">
            <p className="font-serif text-xs italic text-stone-500">
              Click to zoom in, or drag to rearrange to your liking - nothing's permanent ↴
            </p>
          </div>

          <div
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #000 1.5px, transparent 1.5px)',
              backgroundSize: '40px 40px',
            }}
          />

          <AnimatePresence>
            {pinnedItems.map(item => {
              const isTextItem = item.kind === 'sticky-note' || item.kind === 'ambient-quote';
              const isMediaItem = item.kind === 'book' || item.kind === 'movie' || item.kind === 'song';
              const isEditingText = activeTextItemId === item.instanceId;
              const linkedBook = item.kind === 'book' ? books.find((book) => book.id === item.id) ?? item.book : undefined;
              const linkedMovie = item.kind === 'movie' ? movies.find((movie) => movie.id === item.id) ?? item.movie : undefined;
              const linkedSong = item.kind === 'song' ? songs.find((song) => song.id === item.id) ?? item.song : undefined;

              return (
                <motion.div
                  key={item.instanceId}
                  drag={!isEditingText}
                  dragMomentum={false}
                  initial={{
                    x: item.initialX,
                    y: item.initialY,
                    rotate: item.rotation,
                    scale: item.scale,
                  }}
                  animate={{
                    rotate: item.rotation,
                    scale: item.scale,
                  }}
                  onDragStart={() => bringToFront(item.instanceId)}
                  onDragEnd={(event, info) => {
                    updatePinnedItem(item.instanceId, {
                      initialX: item.initialX + info.offset.x,
                      initialY: item.initialY + info.offset.y,
                    });
                  }}
                  className="absolute cursor-grab active:cursor-grabbing group/item"
                  style={{
                    zIndex: item.zIndex,
                    width: `${item.baseWidth * item.scale}px`,
                  }}
                >
                  <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm border border-border rounded-full px-3 py-2 shadow-lg z-50">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjustScale(item.instanceId, -0.1)}
                        className="text-xs font-bold hover:text-primary px-1"
                      >
                        -
                      </button>
                      <span className="text-xs text-muted-foreground">{Math.round(item.scale * 100)}%</span>
                      <button
                        type="button"
                        onClick={() => adjustScale(item.instanceId, 0.1)}
                        className="text-xs font-bold hover:text-primary px-1"
                      >
                        +
                      </button>
                      <div className="w-px h-3 bg-border self-center" />
                      <button
                        type="button"
                        onClick={() => removePinnedItem(item.instanceId)}
                        className="text-xs text-destructive hover:scale-110 px-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjustRotation(item.instanceId, -5)}
                        className="text-xs font-bold hover:text-primary px-1"
                      >
                        <span aria-hidden="true">↺</span>
                      </button>
                      <span className="text-xs text-muted-foreground">{Math.round(item.rotation)}°</span>
                      <button
                        type="button"
                        onClick={() => adjustRotation(item.instanceId, 5)}
                        className="text-xs font-bold hover:text-primary px-1"
                      >
                        <span aria-hidden="true">↻</span>
                      </button>
                    </div>
                  </div>

                  <div className={isTextItem || isMediaItem ? 'pointer-events-auto' : 'pointer-events-none'}>
                    {item.kind === 'book' ? (
                      linkedBook ? (
                        <>
                          {/* Passing flat={true} removes the 3D page-flipping details */}
                          <BookCard
                            book={linkedBook}
                            flat={true}
                            onOpenDetails={() => openCanvasItemDetails(item)}
                          />
                        </>
                      ) : (
                        <div className="overflow-hidden rounded-sm border border-border bg-card shadow-md">
                          {item.coverUrl ? (
                            <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex min-h-[220px] items-center justify-center p-2 text-center font-serif text-xs">
                              {item.title}
                            </div>
                          )}
                        </div>
                      )
                    ) : item.kind === 'movie' ? (
                      <button
                        type="button"
                        onClick={() => openCanvasItemDetails(item)}
                        className="block w-full overflow-hidden rounded-sm border border-border bg-card shadow-md transition-transform hover:scale-[1.01]"
                      >
                        {linkedMovie?.coverUrl || item.coverUrl ? (
                          <img
                            src={linkedMovie?.coverUrl ?? item.coverUrl}
                            alt={linkedMovie?.title ?? item.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex min-h-[220px] items-center justify-center p-2 text-center font-serif text-xs">
                            {linkedMovie?.title ?? item.title}
                          </div>
                        )}
                      </button>
                    ) : item.kind === 'song' ? (
                      <button
                        type="button"
                        onClick={() => void handleCanvasSongClick(item, linkedSong)}
                        className="relative block w-full overflow-hidden rounded-md border border-border bg-card shadow-md transition-transform hover:scale-[1.01]"
                      >
                        {linkedSong?.coverUrl || item.coverUrl ? (
                          <img
                            src={linkedSong?.coverUrl ?? item.coverUrl}
                            alt={linkedSong?.title ?? item.title}
                            className="aspect-square w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-square w-full items-center justify-center bg-muted">
                            <Music2 className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-8 text-left text-white">
                          <p className="truncate text-xs font-medium">{linkedSong?.title ?? item.title}</p>
                          <p className="truncate text-[10px] text-white/80">{linkedSong?.artist ?? 'Tap to play'}</p>
                        </div>
                        <span className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white">
                          {playingSongInstanceId === item.instanceId ? (
                            <Pause className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                        </span>
                      </button>
                    ) : item.kind === 'sticky-note' ? (
                      <div className="relative h-[190px] w-full rounded-sm border border-amber-200 bg-[#f7e58d] p-3 shadow-[0_18px_35px_rgba(120,90,30,0.2)]">
                        <span className="pointer-events-none absolute right-3 top-2 text-[10px] uppercase tracking-[0.18em] text-amber-700/60">
                          Note
                        </span>
                        <textarea
                          value={item.text ?? ''}
                          onPointerDown={event => {
                            event.stopPropagation();
                            setActiveTextItemId(item.instanceId);
                            bringToFront(item.instanceId);
                          }}
                          onFocus={() => {
                            setActiveTextItemId(item.instanceId);
                            bringToFront(item.instanceId);
                          }}
                          onBlur={() => {
                            setActiveTextItemId(current => (current === item.instanceId ? null : current));
                          }}
                          onChange={event => updatePinnedItem(item.instanceId, { text: event.target.value })}
                          placeholder="Jot something small..."
                          className="h-full w-full resize-none bg-transparent pr-8 font-serif text-sm leading-6 text-stone-700 placeholder:text-stone-500/70 focus:outline-none"
                        />
                      </div>
                    ) : item.kind === 'ambient-quote' ? (
                      <div className="w-full rounded-md border border-stone-300/60 bg-white/75 px-6 py-5 shadow-[0_16px_34px_rgba(20,20,20,0.12)]">
                        <input
                          value={item.text ?? ''}
                          onPointerDown={event => {
                            event.stopPropagation();
                            setActiveTextItemId(item.instanceId);
                            bringToFront(item.instanceId);
                          }}
                          onFocus={() => {
                            setActiveTextItemId(item.instanceId);
                            bringToFront(item.instanceId);
                          }}
                          onBlur={() => {
                            setActiveTextItemId(current => (current === item.instanceId ? null : current));
                          }}
                          onChange={event => updatePinnedItem(item.instanceId, { text: event.target.value })}
                          maxLength={140}
                          className="w-full bg-transparent text-center font-serif text-3xl italic leading-tight text-stone-700 placeholder:text-stone-500/70 focus:outline-none"
                          placeholder="A line that stays with you."
                        />
                      </div>
                    ) : item.kind === 'washi-tape' ? (
                      <div className="flex h-[42px] w-full items-center justify-center">
                        <img
                          src={item.coverUrl ?? TAPE_ARTWORK.honey}
                          alt={`${item.decorVariant ?? 'washi'} tape`}
                          className="h-full w-full rounded-sm object-cover opacity-95 shadow-md"
                          draggable={false}
                        />
                      </div>
                    ) : (
                      <div className="flex h-[130px] w-full items-center justify-center">
                        <img
                          src={item.coverUrl ?? PAPERCLIP_ARTWORK}
                          alt="Paperclip decor"
                          className="h-full w-full object-contain drop-shadow-md"
                          draggable={false}
                        />
                      </div>
                    )}
                  </div>

                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-4 bg-white/20 backdrop-blur-[1px] border border-white/5 rotate-2 pointer-events-none" />
                </motion.div>
              );
            })}
          </AnimatePresence>

          {pinnedItems.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-stone-400 font-serif italic">
              The desk is empty. Toss books, movies, songs, and decor onto the canvas.
            </div>
          )}
        </section>

        <div className="mx-auto max-w-4xl mt-24 grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-border pt-12">
          <section className="space-y-4">
            <p className="section-label">Preferences</p>
            <div className="flex items-center justify-between rounded-xl border border-border p-5 bg-muted/10">
              <div>
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Adjust the lighting of your room</p>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={checked => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </section>
        </div>
      </main>

      {selectedCanvasBook && (
        <BookDetail
          book={selectedCanvasBook}
          open={Boolean(selectedCanvasBook)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedCanvasBookId(null);
            }
          }}
          onUpdate={updateBook}
        />
      )}

      <MovieDiarySheet
        movie={selectedCanvasMovie}
        open={Boolean(selectedCanvasMovie)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCanvasMovieId(null);
          }
        }}
        onUpdateMovie={updateMovie}
        onAddDiaryEntry={addDiaryEntry}
        onRemoveDiaryEntry={removeDiaryEntry}
      />

      {embeddedSpotifyTrackId && (
        <div className="fixed bottom-6 right-6 z-[140] w-[min(92vw,360px)] rounded-xl border border-border bg-background/95 p-3 shadow-2xl backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Spotify Player</p>
            <button
              type="button"
              onClick={closeEmbeddedSpotifyPlayer}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close player"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <iframe
            src={`https://open.spotify.com/embed/track/${embeddedSpotifyTrackId}?utm_source=generator`}
            width="100%"
            height="152"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded"
            title="Embedded Spotify player"
          />
        </div>
      )}

      <motion.div
        className="fixed left-1/2 z-[120] -translate-x-1/2"
        style={{ bottom: canvasButtonBottom }}
      >
        <button
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className="flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-background shadow-2xl transition-transform hover:scale-105"
        >
          <Plus className={`h-4 w-4 transition-transform ${isDrawerOpen ? 'rotate-45' : ''}`} />
          <span className="text-sm font-medium">Add to Canvas</span>
        </button>

        <AnimatePresence>
          {isDrawerOpen && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: -8, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="absolute bottom-16 left-1/2 w-[92vw] max-w-3xl -translate-x-1/2 rounded-2xl border border-border bg-background/90 p-4 shadow-2xl backdrop-blur-xl"
            >
              <div className="mb-4 flex items-center gap-2 rounded-full border border-border/70 bg-muted/25 p-1 w-fit">
                <button
                  type="button"
                  onClick={() => setDrawerTab('media')}
                  className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.14em] transition-colors ${
                    drawerTab === 'media'
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Media
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab('decor')}
                  className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.14em] transition-colors ${
                    drawerTab === 'decor'
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Decor
                </button>
              </div>

              {drawerTab === 'media' ? (
                <div className="flex gap-4 overflow-x-auto no-scrollbar">
                  {books.map(book => (
                    <button
                      key={`book-${book.id}`}
                      onClick={() => addToCanvas(book, 'book')}
                      className="h-24 w-16 shrink-0 overflow-hidden rounded shadow-md transition-transform hover:-translate-y-2"
                      title={`Book: ${book.title}`}
                    >
                      <img src={book.coverUrl} alt={`Book cover: ${book.title}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                  {movies.map(movie => (
                    <button
                      key={`movie-${movie.id}`}
                      onClick={() => addToCanvas(movie, 'movie')}
                      className="relative h-24 w-16 shrink-0 overflow-hidden rounded shadow-md transition-transform hover:-translate-y-2"
                      title={`Movie: ${movie.title}`}
                    >
                      <img src={movie.coverUrl} alt={`Movie poster: ${movie.title}`} className="h-full w-full object-cover" />
                      <span className="absolute left-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[9px] uppercase tracking-wider text-white">
                        Movie
                      </span>
                    </button>
                  ))}
                  {songs.map(song => (
                    <button
                      key={`song-${song.id}`}
                      onClick={() => addToCanvas(song, 'song')}
                      className="relative h-24 w-24 shrink-0 overflow-hidden rounded shadow-md transition-transform hover:-translate-y-2"
                      title={`Song: ${song.title}`}
                    >
                      {song.coverUrl ? (
                        <img src={song.coverUrl} alt={`Song cover: ${song.title}`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted">
                          <Music2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="absolute left-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[9px] uppercase tracking-wider text-white">
                        Song
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-border/80 bg-card/60 p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Sticky Note</p>
                      <textarea
                        value={noteDraft}
                        onChange={event => setNoteDraft(event.target.value)}
                        rows={3}
                        className="mt-2 w-full resize-none rounded border border-border/70 bg-background/70 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Watch this on a rainy day."
                      />
                      <button
                        type="button"
                        onClick={addStickyNoteToCanvas}
                        className="mt-2 w-full rounded-md bg-amber-200/90 px-3 py-2 text-sm font-medium text-stone-800 transition-colors hover:bg-amber-200"
                      >
                        Drop Sticky Note
                      </button>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-card/60 p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Ambient Quote</p>
                      <input
                        value={quoteDraft}
                        onChange={event => setQuoteDraft(event.target.value)}
                        className="mt-2 w-full rounded border border-border/70 bg-background/70 px-3 py-2 font-serif text-base italic focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="A line that stays with you."
                      />
                      <button
                        type="button"
                        onClick={addAmbientQuoteToCanvas}
                        className="mt-2 w-full rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800"
                      >
                        Float Quote
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-card/60 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Tape + Paperclips</p>
                    <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar">
                      {(['honey', 'rose', 'mint'] as Array<Exclude<DecorVariant, 'paperclip'>>).map(variant => (
                        <button
                          key={variant}
                          type="button"
                          onClick={() => addDecorFragment(variant)}
                          className="flex h-14 w-32 shrink-0 items-center justify-center rounded border border-border/60 bg-background/50 p-1 transition-transform hover:-translate-y-1"
                          title={`Add ${variant} washi tape`}
                        >
                          <img
                            src={TAPE_ARTWORK[variant]}
                            alt={`${variant} washi tape`}
                            className="h-full w-full rounded-sm object-cover"
                          />
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => addDecorFragment('paperclip')}
                        className="flex h-14 w-20 shrink-0 items-center justify-center rounded border border-border/60 bg-background/50 p-1 transition-transform hover:-translate-y-1"
                        title="Add paperclip"
                      >
                        <img src={PAPERCLIP_ARTWORK} alt="Paperclip" className="h-full w-full object-contain" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function extractSpotifyTrackId(url?: string) {
  if (!url) {
    return '';
  }

  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const trackIndex = segments.findIndex((segment) => segment === 'track');
    if (trackIndex >= 0 && segments[trackIndex + 1]) {
      return segments[trackIndex + 1];
    }
  } catch {
    // URL might be malformed from legacy data.
  }

  const match = url.match(/track[/:]([A-Za-z0-9]+)/);
  return match?.[1] ?? '';
}

