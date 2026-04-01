import { useMemo, useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Flame, Loader2, Music2, Search, X } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { useBooks } from '@/hooks/use-books';
import { useMovies } from '@/hooks/use-movies';
import { useDailyLogs } from '@/hooks/use-daily-logs';
import { useConservatory } from '@/hooks/use-conservatory';
import {
  beginSpotifyLogin,
  getCurrentlyPlayingTrack,
  isSpotifyConfigured,
  searchSpotifyTracks,
  SpotifyTrackResult,
} from '@/lib/spotifyService';

interface DiaryEntry {
  id: string;
  mediaType: 'book' | 'movie';
  title: string;
  creator: string;
  date: string; // YYYY-MM-DD
  rating: number;
  review: string;
  isRevisit: boolean;
}

interface Plant {
  id: number;
  type: number;
  stage: number;
  x: number;
  height: number;
}

interface PinnedSong {
  spotifyTrackId: string;
  title: string;
  artist: string;
  coverUrl: string;
  spotifyUrl: string;
}

type FlowerType = 'Daisy' | 'Poppy' | 'Cosmos' | 'Tulip' | 'Wildgrass';
type DiaryView = 'calendar' | 'conservatory';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DIARY_VIEWS: { key: DiaryView; label: string }[] = [
  { key: 'calendar', label: 'Calendar' },
  { key: 'conservatory', label: 'Midnight Conservatory' },
];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function shiftDateKey(key: string, deltaDays: number) {
  const parsed = parseDateKey(key);
  if (!parsed) return key;
  parsed.setDate(parsed.getDate() + deltaDays);
  return toDateKey(parsed);
}

function calculateStreak(activeDates: string[]) {
  if (activeDates.length === 0) return 0;

  const activeDateSet = new Set(activeDates);
  let targetKey = toDateKey(new Date());

  if (!activeDateSet.has(targetKey)) {
    targetKey = shiftDateKey(targetKey, -1);
    if (!activeDateSet.has(targetKey)) {
      return 0;
    }
  }

  let streak = 0;
  while (activeDateSet.has(targetKey)) {
    streak += 1;
    targetKey = shiftDateKey(targetKey, -1);
  }

  return streak;
}

const PALETTES = [
  { name: 'Sage', stem: '#6aaa6a', leaf: '#4a7a4a', petal: '#9fd49f', dark: '#2a5a2a', light: '#c8f0c8' },
  { name: 'Ethereal', stem: '#7aa0c4', leaf: '#4a6e8a', petal: '#a8c8e8', dark: '#2a4a6a', light: '#c8e4f8' },
  { name: 'Rose', stem: '#b87898', leaf: '#7a4a68', petal: '#d4889a', dark: '#5a2a48', light: '#f0bbcc' },
  { name: 'Gold', stem: '#c4aa6a', leaf: '#7a6a28', petal: '#d4ba7a', dark: '#5a4a18', light: '#e8d4a0' },
] as const;

const FLOWER_TYPES: FlowerType[] = ['Daisy', 'Poppy', 'Cosmos', 'Tulip', 'Wildgrass'];
const COST_PLANT = 50;
const COST_NOURISH = 20;
const MAX_STAGE = 4;

function Daisy({ cx, cy, p, seed }: { cx: number; cy: number; p: (typeof PALETTES)[number]; seed: number }) {
  const n = 10 + Math.floor(seed * 4);
  const petalLen = 11 + seed * 4;
  return (
    <g transform={`translate(${cx},${cy})`}>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * 360;
        const rw = 2 + (i % 3) * 0.5;
        const rh = petalLen + (i % 2) * 2;
        const op = 0.6 + (i % 2) * 0.15;
        return (
          <ellipse
            key={i}
            rx={rw}
            ry={rh}
            fill={i % 2 === 0 ? p.petal : p.light}
            transform={`rotate(${a}) translate(0,${-rh - 2})`}
            opacity={op}
          />
        );
      })}
      <circle r={5} fill={p.dark} />
      <circle r={3} fill={p.stem} />
    </g>
  );
}

function Poppy({ cx, cy, p, seed }: { cx: number; cy: number; p: (typeof PALETTES)[number]; seed: number }) {
  const rot = seed * 30 - 15;
  return (
    <g transform={`translate(${cx},${cy}) rotate(${rot})`}>
      <path d="M 0 0 C -18 -8 -24 -30 -10 -40 C 0 -48 8 -40 6 -26 Z" fill={p.petal} opacity={0.58} />
      <path d="M 0 0 C 8 -18 28 -22 32 -10 C 36 2 20 10 10 4 Z" fill={p.light} opacity={0.52} />
      <path d="M 0 0 C 16 8 18 30 4 36 C -8 40 -16 28 -8 16 Z" fill={p.petal} opacity={0.58} />
      <path d="M 0 0 C -14 14 -32 8 -32 -4 C -32 -16 -20 -22 -10 -12 Z" fill={p.light} opacity={0.5} />
      <path d="M 0 0 C -6 -22 10 -38 20 -28 C 28 -18 24 -4 12 -4 Z" fill={p.petal} opacity={0.55} />
      <circle r={6} fill={p.dark} />
      <circle r={3} fill={p.stem} opacity={0.9} />
      {[-5, -2, 1, 4].map((ox, i) => (
        <g key={i}>
          <line
            x1={ox}
            y1={-6}
            x2={ox + (i % 2) * 2 - 1}
            y2={-12}
            stroke={p.light}
            strokeWidth={0.8}
            opacity={0.65}
          />
          <circle cx={ox + (i % 2) * 2 - 1} cy={-12} r={1.2} fill={p.light} opacity={0.75} />
        </g>
      ))}
    </g>
  );
}

function Cosmos({ cx, cy, p, seed }: { cx: number; cy: number; p: (typeof PALETTES)[number]; seed: number }) {
  const tilt = seed * 40 - 20;
  const petals = 6 + Math.floor(seed * 3);
  return (
    <g transform={`translate(${cx},${cy}) rotate(${tilt})`}>
      {Array.from({ length: petals }, (_, i) => {
        const a = (i / petals) * 360 + seed * 15;
        const len = 24 + (i % 3) * 4;
        const w = 5 + (i % 2) * 2;
        return (
          <path
            key={i}
            d={`M 0 0 C ${-w} ${-8} ${-w + 2} ${-len + 8} 0 ${-len} C ${w - 2} ${-len + 8} ${w} ${-8} 0 0`}
            fill={i % 2 === 0 ? p.petal : p.light}
            opacity={0.55 + (i % 2) * 0.1}
            transform={`rotate(${a})`}
          />
        );
      })}
      <circle r={5} fill={p.dark} />
      <circle r={2.5} fill={p.stem} opacity={0.9} />
    </g>
  );
}

function Tulip({ cx, cy, p, seed }: { cx: number; cy: number; p: (typeof PALETTES)[number]; seed: number }) {
  const tilt = seed * 16 - 8;
  return (
    <g transform={`translate(${cx},${cy}) rotate(${tilt})`}>
      <path d="M -10 0 C -18 -10 -16 -32 -8 -40 C -2 -46 4 -44 6 -32 C 8 -18 4 -6 0 0 Z" fill={p.petal} opacity={0.65} />
      <path d="M 10 0 C 18 -10 16 -32 8 -40 C 2 -46 -4 -44 -6 -32 C -8 -18 -4 -6 0 0 Z" fill={p.light} opacity={0.6} />
      <path d="M 0 2 C -14 -2 -20 -20 -14 -34 C -10 -44 -2 -44 2 -32 C 6 -18 4 -6 0 2 Z" fill={p.stem} opacity={0.55} />
      <path d="M 0 2 C 14 -2 20 -20 14 -34 C 10 -44 2 -44 -2 -32 C -6 -18 -4 -6 0 2 Z" fill={p.petal} opacity={0.5} />
      <path d="M -5 0 C -9 -14 -5 -30 0 -36 C 5 -30 9 -14 5 0 Z" fill={p.light} opacity={0.45} />
      <circle r={3} fill={p.dark} opacity={0.7} />
    </g>
  );
}

function Wildgrass({ cx, cy, p, seed }: { cx: number; cy: number; p: (typeof PALETTES)[number]; seed: number }) {
  const branches = [
    { dx: -18 + seed * 6, dy: -28, size: 3.5 },
    { dx: 20 + seed * 4, dy: -42, size: 3 },
    { dx: -12 + seed * 3, dy: -58, size: 3 },
    { dx: 22 + seed * 2, dy: -70, size: 2.5 },
    { dx: 0, dy: -80, size: 4.5 },
  ];
  return (
    <g transform={`translate(${cx},${cy})`}>
      {branches.map((b, i) => (
        <g key={i}>
          <line
            x1={0}
            y1={i === 0 ? 0 : branches[i - 1].dy}
            x2={b.dx}
            y2={b.dy}
            stroke={p.stem}
            strokeWidth={0.85}
            opacity={0.6}
            strokeLinecap="round"
          />
          <circle cx={b.dx} cy={b.dy} r={b.size} fill={p.petal} opacity={0.68} />
          <circle cx={b.dx} cy={b.dy} r={b.size * 0.45} fill={p.dark} />
          {[-b.size - 1, b.size + 1].map((ox, j) => (
            <circle key={j} cx={b.dx + ox} cy={b.dy - 1.5} r={b.size * 0.55} fill={p.light} opacity={0.48} />
          ))}
          <circle cx={b.dx} cy={b.dy - b.size - 1} r={b.size * 0.55} fill={p.light} opacity={0.48} />
        </g>
      ))}
    </g>
  );
}

const FLOWER_RENDERERS = { Daisy, Poppy, Cosmos, Tulip, Wildgrass };

function stemPath(x: number, baseY: number, tipY: number, seed: number) {
  const wobble = (seed - 0.5) * 40;
  const midX = x + wobble;
  const tipX = x + (seed - 0.5) * 10;
  return { path: `M ${x} ${baseY} Q ${midX} ${(baseY + tipY) / 2} ${tipX} ${tipY}`, tipX, tipY };
}

function Leaves({ x, baseY, tipY, seed, p }: { x: number; baseY: number; tipY: number; seed: number; p: (typeof PALETTES)[number] }) {
  const ly = baseY - (baseY - tipY) * 0.42;
  const lx = x + (seed - 0.5) * 20;
  return (
    <g opacity={0.65}>
      <path d={`M ${lx} ${ly} Q ${lx - 22} ${ly - 8} ${lx - 28} ${ly - 20}`} stroke={p.leaf} strokeWidth={1} fill="none" strokeLinecap="round" />
      <ellipse cx={lx - 22} cy={ly - 12} rx={12} ry={3.5} fill={p.leaf} transform={`rotate(-38 ${lx - 22} ${ly - 12})`} />
      <path d={`M ${lx} ${ly - 14} Q ${lx + 20} ${ly - 22} ${lx + 26} ${ly - 34}`} stroke={p.leaf} strokeWidth={1} fill="none" strokeLinecap="round" />
      <ellipse cx={lx + 20} cy={ly - 26} rx={10} ry={3} fill={p.leaf} transform={`rotate(24 ${lx + 20} ${ly - 26})`} />
    </g>
  );
}

function ConservatoryPlant({ plant, H }: { plant: Plant; H: number }) {
  const { x, stage, type, height } = plant;
  const palette = Math.abs(Math.floor(type)) % PALETTES.length;
  const flowerType = FLOWER_TYPES[Math.abs(Math.floor(type)) % FLOWER_TYPES.length];
  const seed = ((Math.abs(Math.floor(plant.id)) % 1000) + 1) / 1000;
  const p = PALETTES[palette];
  const baseY = H - 2;
  const maxH = Math.max(100, height);
  const xPx = (Math.min(Math.max(x, 0), 100) / 100) * 1000;
  const tipY = baseY - (maxH * Math.min(stage, 3)) / 3;
  const { path, tipX } = stemPath(xPx, baseY, tipY, seed);
  const FlowerComp = FLOWER_RENDERERS[flowerType];

  return (
    <g>
      {stage >= 1 && <path d={path} stroke={p.stem} strokeWidth={1.2} fill="none" strokeLinecap="round" opacity={0.85} />}
      {stage >= 2 && <Leaves x={xPx} baseY={baseY} tipY={tipY} seed={seed} p={p} />}
      {stage === 0 && (
        <g>
          <circle cx={xPx} cy={baseY - 4} r={2.5} fill={p.stem} opacity={0.85} />
          <circle cx={xPx} cy={baseY - 4} r={7} fill={p.stem} opacity={0}>
            <animate attributeName="opacity" values="0.2;0.02;0.2" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="r" values="5;13;5" dur="2.4s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
      {stage === 3 && (
        <g>
          <ellipse cx={tipX} cy={tipY} rx={4} ry={7} fill={p.petal} opacity={0.55} />
          <ellipse cx={tipX} cy={tipY} rx={2.5} ry={4.5} fill={p.stem} opacity={0.9} />
        </g>
      )}
      {stage === 4 && <FlowerComp cx={tipX} cy={tipY} p={p} seed={seed} />}
      {stage === 4 && (
        <circle cx={tipX} cy={tipY} r={12} fill={p.stem} opacity={0}>
          <animate attributeName="opacity" values="0.12;0.03;0.12" dur="3.5s" repeatCount="indefinite" />
          <animate attributeName="r" values="10;20;10" dur="3.5s" repeatCount="indefinite" />
        </circle>
      )}
    </g>
  );
}

export default function Diary() {
  const { books } = useBooks();
  const { movies } = useMovies();
  const { logs, upsertLog } = useDailyLogs();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [activeView, setActiveView] = useState<DiaryView>('calendar');
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [pagesInput, setPagesInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [achievement, setAchievement] = useState({ show: false, streak: 0 });
  const [songQuery, setSongQuery] = useState('');
  const [songResults, setSongResults] = useState<SpotifyTrackResult[]>([]);
  const [songSearchLoading, setSongSearchLoading] = useState(false);
  const [songSearchError, setSongSearchError] = useState('');
  const [loadingCurrentSong, setLoadingCurrentSong] = useState(false);
  const [selectedPinnedSong, setSelectedPinnedSong] = useState<PinnedSong | null>(null);
  const achievementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { plants, spentEnergy, updatePlantsAndEnergy, loading } = useConservatory();

  const entries = useMemo(() => {
    const bookEntries: DiaryEntry[] = books.flatMap((book) =>
      (book.diaryEntries || []).map((entry) => ({
        id: `book-${book.id}-${entry.id}`,
        mediaType: 'book',
        title: book.title,
        creator: book.author || 'Unknown Author',
        date: entry.readOn,
        rating: entry.rating,
        review: entry.review,
        isRevisit: entry.reread,
      }))
    );

    const movieEntries: DiaryEntry[] = movies.flatMap((movie) =>
      (movie.diaryEntries || []).map((entry) => ({
        id: `movie-${movie.id}-${entry.id}`,
        mediaType: 'movie',
        title: movie.title,
        creator: movie.director || 'Unknown Director',
        date: entry.watchedOn,
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
      return b.id.localeCompare(a.id);
    });
  }, [books, movies]);

  const entriesByDateAll = useMemo(() => {
    const map = new Map<string, DiaryEntry[]>();
    entries.forEach((entry) => {
      const list = map.get(entry.date);
      if (list) {
        list.push(entry);
      } else {
        map.set(entry.date, [entry]);
      }
    });
    return map;
  }, [entries]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, DiaryEntry[]>();
    entries.forEach((entry) => {
      const list = map.get(entry.date);
      if (list) {
        list.push(entry);
      } else {
        map.set(entry.date, [entry]);
      }
    });
    return map;
  }, [entries]);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const monthKeyPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-`;

  const activeDateKeys = useMemo(() => {
    const fromEntries = Array.from(entriesByDateAll.keys());
    const fromLogs = logs.map((log) => log.date);
    return Array.from(new Set([...fromEntries, ...fromLogs]));
  }, [entriesByDateAll, logs]);
  const currentStreak = useMemo(() => calculateStreak(activeDateKeys), [activeDateKeys]);

  const stats = useMemo(() => {
    const activeDays = new Set<string>();
    let totalEntries = 0;
    entries.forEach((entry) => {
      if (entry.date.startsWith(monthKeyPrefix)) {
        totalEntries += 1;
        activeDays.add(entry.date);
      }
    });
    return { activeDays: activeDays.size, totalEntries };
  }, [entries, monthKeyPrefix]);

  useEffect(() => {
    setSelectedDateKey(null);
  }, [currentYear, currentMonth]);

  useEffect(() => {
    return () => {
      if (achievementTimer.current) {
        clearTimeout(achievementTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activeView === 'conservatory') {
      setSelectedDateKey(null);
    }
  }, [activeView]);

  const totalLumens = useMemo(() => logs.reduce((sum, log) => sum + (log.pages_read || 0), 0), [logs]);
  const availableLumens = totalLumens - spentEnergy;
  const growablePlants = useMemo(() => plants.filter((plant) => plant.stage < MAX_STAGE), [plants]);
  const W = 1000;
  const H = 340;

  const selectedLog = useMemo(
    () => (selectedDateKey ? logs.find((log) => log.date === selectedDateKey) ?? null : null),
    [logs, selectedDateKey]
  );
  const logsByDate = useMemo(() => {
    const map = new Map<string, (typeof logs)[number]>();
    logs.forEach((log) => {
      map.set(log.date, log);
    });
    return map;
  }, [logs]);

  useEffect(() => {
    if (!selectedDateKey) {
      setPagesInput('');
      setNotesInput('');
      setSongQuery('');
      setSongResults([]);
      setSongSearchError('');
      setSelectedPinnedSong(null);
      return;
    }
    setPagesInput(selectedLog ? String(selectedLog.pages_read) : '');
    setNotesInput(selectedLog?.notes ?? '');
    setSongQuery('');
    setSongResults([]);
    setSongSearchError('');
    if (selectedLog?.spotify_track_id && selectedLog.song_title && selectedLog.song_artist) {
      setSelectedPinnedSong({
        spotifyTrackId: selectedLog.spotify_track_id,
        title: selectedLog.song_title,
        artist: selectedLog.song_artist,
        coverUrl: selectedLog.song_cover_url ?? '',
        spotifyUrl: selectedLog.song_spotify_url ?? '',
      });
    } else {
      setSelectedPinnedSong(null);
    }
  }, [selectedDateKey, selectedLog]);

  useEffect(() => {
    if (!selectedDateKey || songQuery.trim().length < 2) {
      setSongResults([]);
      setSongSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSongSearchLoading(true);
      setSongSearchError('');
      try {
        const tracks = await searchSpotifyTracks(songQuery.trim());
        setSongResults(tracks);
      } catch {
        setSongResults([]);
        setSongSearchError('Connect Spotify to search tracks.');
      } finally {
        setSongSearchLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [selectedDateKey, songQuery]);

  const todayKey = toDateKey(new Date());

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const gridCells: JSX.Element[] = [];

  for (let i = firstDay - 1; i >= 0; i -= 1) {
    gridCells.push(
      <div key={`prev-${i}`} className="cal-cell other-month" aria-hidden="true">
        <span className="cell-date">{daysInPrevMonth - i}</span>
      </div>
    );
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEntries = entriesByDate.get(key) ?? [];
    const dayLog = logsByDate.get(key);
    const isToday = key === todayKey;
    const isSelected = key === selectedDateKey;

    gridCells.push(
      <button
        key={key}
        type="button"
        className={`cal-cell ${dayEntries.length ? 'has-entry' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
        onClick={() => setSelectedDateKey((prev) => (prev === key ? null : key))}
      >
        <span className="cell-date">{day}</span>
        {dayLog?.song_cover_url && (
          <img
            src={dayLog.song_cover_url}
            alt={`${dayLog.song_title || 'Pinned song'} cover`}
            className="cell-song-cover"
            loading="lazy"
          />
        )}
        {dayEntries.length > 0 && <span className="cell-dot" />}
        <div className="cell-entries">
          {dayEntries.slice(0, 2).map((entry) => (
            <div key={entry.id} className={`cell-entry ${entry.mediaType}`}>
              {entry.title}
            </div>
          ))}
          {dayEntries.length > 2 && (
            <div className="cell-entry more">+ {dayEntries.length - 2} more</div>
          )}
        </div>
      </button>
    );
  }

  const remainingCells = 42 - gridCells.length;
  for (let day = 1; day <= remainingCells; day += 1) {
    gridCells.push(
      <div key={`next-${day}`} className="cal-cell other-month" aria-hidden="true">
        <span className="cell-date">{day}</span>
      </div>
    );
  }

  const panelEntries = selectedDateKey ? entriesByDate.get(selectedDateKey) ?? [] : [];
  const panelDate = selectedDateKey ? parseDateKey(selectedDateKey) : null;

  const goPrevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const goNextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  const handleLogPages = async () => {
    if (!selectedDateKey) return;
    const parsed = pagesInput.trim() === ''
      ? selectedLog?.pages_read ?? 0
      : Number(pagesInput);
    if (Number.isNaN(parsed)) return;
    const cleanedNotes = notesInput.trim();
    await upsertLog(
      selectedDateKey,
      parsed,
      cleanedNotes.length > 0 ? cleanedNotes : null,
      selectedPinnedSong
        ? {
            spotifyTrackId: selectedPinnedSong.spotifyTrackId,
            title: selectedPinnedSong.title,
            artist: selectedPinnedSong.artist,
            coverUrl: selectedPinnedSong.coverUrl,
            spotifyUrl: selectedPinnedSong.spotifyUrl,
          }
        : null
    );

    const projectedDates = Array.from(new Set([...activeDateKeys, selectedDateKey]));
    const newStreak = calculateStreak(projectedDates);
    if (newStreak > currentStreak && newStreak % 5 === 0) {
      setAchievement({ show: true, streak: newStreak });
      if (achievementTimer.current) {
        clearTimeout(achievementTimer.current);
      }
      achievementTimer.current = setTimeout(() => {
        setAchievement({ show: false, streak: 0 });
      }, 5000);
    }
  };

  const plantSeed = () => {
    if (availableLumens < COST_PLANT) return;
    const nextPlant: Plant = {
      id: Date.now(),
      type: Math.floor(Math.random() * 4),
      stage: 0,
      x: Math.floor(Math.random() * 80) + 10,
      height: Math.floor(Math.random() * 80) + 120,
    };
    const newPlants = [...plants, nextPlant];
    const newSpent = spentEnergy + COST_PLANT;
    updatePlantsAndEnergy(newPlants, newSpent);
  };

  const nourishGarden = () => {
    if (availableLumens < COST_NOURISH || growablePlants.length === 0) return;
    const target = growablePlants[Math.floor(Math.random() * growablePlants.length)];
    const newSpent = spentEnergy + COST_NOURISH;
    const newPlants = plants.map((plant) => (
      plant.id === target.id ? { ...plant, stage: Math.min(plant.stage + 1, MAX_STAGE) } : plant
    ));
    updatePlantsAndEnergy(newPlants, newSpent);
  };

  const applySpotifyTrack = (track: SpotifyTrackResult) => {
    setSelectedPinnedSong({
      spotifyTrackId: track.spotifyId,
      title: track.title,
      artist: track.artist,
      coverUrl: track.coverUrl,
      spotifyUrl: track.spotifyUrl,
    });
    setSongQuery(track.title);
    setSongResults([]);
    setSongSearchError('');
  };

  const handleImportCurrentSong = async () => {
    setLoadingCurrentSong(true);
    setSongSearchError('');
    try {
      const current = await getCurrentlyPlayingTrack();
      if (!current) {
        setSongSearchError('No currently playing track found.');
        return;
      }
      applySpotifyTrack(current);
    } catch {
      setSongSearchError('Could not load currently playing track.');
    } finally {
      setLoadingCurrentSong(false);
    }
  };

  const songChanged =
    (selectedPinnedSong?.spotifyTrackId ?? '') !== (selectedLog?.spotify_track_id ?? '') ||
    (selectedPinnedSong?.title ?? '') !== (selectedLog?.song_title ?? '') ||
    (selectedPinnedSong?.artist ?? '') !== (selectedLog?.song_artist ?? '') ||
    (selectedPinnedSong?.coverUrl ?? '') !== (selectedLog?.song_cover_url ?? '') ||
    (selectedPinnedSong?.spotifyUrl ?? '') !== (selectedLog?.song_spotify_url ?? '');

  return (
    <div className="diary-page">
      <Navbar />
      <div className="diary-view-switch" role="tablist" aria-label="Diary view">
        {DIARY_VIEWS.map((view) => (
          <button
            key={view.key}
            type="button"
            className={`diary-view-btn ${activeView === view.key ? 'active' : ''}`}
            onClick={() => setActiveView(view.key)}
            role="tab"
            aria-selected={activeView === view.key}
          >
            {view.label}
          </button>
        ))}
      </div>
      <div className={`calendar-wrapper ${activeView}`}>
        {activeView === 'calendar' && (
          <>
            <div className="cal-header">
              <div className="cal-title-block">
                <button className="cal-nav-btn" type="button" onClick={goPrevMonth}>
                  <ChevronLeft size={16} />
                </button>
                <div>
                  <div className="cal-month">{MONTHS[currentMonth]}</div>
                  <div className="cal-year">{currentYear}</div>
                </div>
                <button className="cal-nav-btn" type="button" onClick={goNextMonth}>
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="cal-header-meta">
                <div className="streak-badge">
                  <span className="streak-value">{currentStreak}</span>
                  <span className="streak-label">Day streak</span>
                </div>
                <div className="cal-meta">
                  <span>{stats.activeDays} active days</span>
                  <span className="highlight">{stats.totalEntries} entries</span>
                </div>
              </div>
            </div>

            <div className="day-labels">
              {DAYS_SHORT.map((day) => (
                <div key={day} className="day-label">{day}</div>
              ))}
            </div>

            <div className="cal-grid">
              {gridCells}
            </div>
          </>
        )}

        {activeView === 'conservatory' && (
          <section className="mc">
            <header className="mc-header">
              <div>
                <div className="mc-title">Midnight Conservatory</div>
                <div className="mc-tagline">1 Page Read = 1 Lumen</div>
              </div>
              <div className="mc-lumens">
                <span className="mc-lumens-num">{availableLumens.toLocaleString()}</span>
                <span className="mc-lumens-label">Lumens</span>
              </div>
              <div className="mc-btns">
                <button className="mc-btn mc-btn-plant" disabled={loading || availableLumens < COST_PLANT} onClick={plantSeed}>
                  Plant ({COST_PLANT})
                </button>
                <button
                  className="mc-btn mc-btn-nourish"
                  disabled={loading || availableLumens < COST_NOURISH || growablePlants.length === 0}
                  onClick={nourishGarden}
                >
                  Nourish ({COST_NOURISH})
                </button>
              </div>
            </header>

            <div className="mc-canvas">
              <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }} preserveAspectRatio="xMidYMax meet">
                <defs>
                  <radialGradient id="groundAtmos" cx="50%" cy="100%" r="55%">
                    <stop offset="0%" stopColor="#152015" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#07090a" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="soilFade" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                    <stop offset="12%" stopColor="rgba(255,255,255,0.07)" />
                    <stop offset="88%" stopColor="rgba(255,255,255,0.07)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                  </linearGradient>
                </defs>

                <rect x={0} y={0} width={W} height={H} fill="url(#groundAtmos)" />
                {Array.from({ length: 38 }, (_, i) => (
                  <circle
                    key={i}
                    cx={(i * 89 + 23) % W}
                    cy={(i * 163 + 11) % (H * 0.5)}
                    r={0.35 + (i % 3) * 0.28}
                    fill="white"
                    opacity={0.04 + (i % 6) * 0.018}
                  />
                ))}

                {plants.map((pl) => <ConservatoryPlant key={pl.id} plant={pl} H={H} />)}

                {plants.length === 0 && (
                  <text
                    x={W / 2}
                    y={H / 2}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.09)"
                    fontSize="10"
                    fontFamily="DM Mono, monospace"
                    letterSpacing="3"
                  >
                    PLANT YOUR FIRST SEED
                  </text>
                )}

                <line x1={0} y1={H - 1} x2={W} y2={H - 1} stroke="url(#soilFade)" strokeWidth="1" />
              </svg>
            </div>

            <footer className="mc-footer">
              <div className="mc-legend">
                {PALETTES.map((palette, i) => {
                  const count = plants.filter((pl) => Math.abs(Math.floor(pl.type)) % PALETTES.length === i).length;
                  return (
                    <div key={palette.name} className={`mc-legend-item${count > 0 ? ' active' : ''}`}>
                      <div className="mc-legend-dot" style={{ background: palette.stem }} />
                      {palette.name} · {count}
                    </div>
                  );
                })}
              </div>
              <div className="mc-bloomed">
                {plants.filter((pl) => pl.stage === MAX_STAGE).length} / {plants.length} bloomed
              </div>
            </footer>
          </section>
        )}
      </div>

      <div className={`day-panel ${selectedDateKey && activeView === 'calendar' ? 'open' : ''}`}>
        <div className="day-panel-header">
          <div className="day-panel-date">
            {panelDate
              ? `${DAYS_SHORT[panelDate.getDay()]}, ${panelDate.getDate()} ${MONTHS[panelDate.getMonth()]}`
              : '—'}
          </div>
          {selectedDateKey && (
            <div className="pages-input-row">
              <span className="pages-label">Pages read</span>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={pagesInput}
                onChange={(event) => setPagesInput(event.target.value)}
                className="pages-input"
              />
              <button
                type="button"
                className="pages-log"
                onClick={handleLogPages}
                disabled={
                  (pagesInput.trim() === '' && notesInput.trim() === '') ||
                  (pagesInput.trim() === String(selectedLog?.pages_read ?? '') &&
                    notesInput.trim() === (selectedLog?.notes ?? '') &&
                    !songChanged)
                }
              >
                Save
              </button>
            </div>
          )}
          {selectedDateKey && (
            <div className="song-pin-block">
              <div className="song-pin-header-row">
                <label className="notes-label" htmlFor="daily-song-search">
                  Pinned song
                </label>
                {selectedPinnedSong && (
                  <button
                    type="button"
                    className="song-clear-btn"
                    onClick={() => {
                      setSelectedPinnedSong(null);
                      setSongQuery('');
                      setSongResults([]);
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
              {isSpotifyConfigured() ? (
                <>
                  <div className="song-search-row">
                    <Search size={13} />
                    <input
                      id="daily-song-search"
                      value={songQuery}
                      onChange={(event) => setSongQuery(event.target.value)}
                      placeholder="Search Spotify track..."
                      className="song-search-input"
                    />
                    {songSearchLoading && <Loader2 className="spin" size={13} />}
                  </div>
                  <div className="song-actions-row">
                    <button
                      type="button"
                      className="song-action-btn"
                      onClick={async () => {
                        setSongSearchError('');
                        try {
                          await beginSpotifyLogin();
                        } catch (error) {
                          setSongSearchError(
                            error instanceof Error ? error.message : 'Spotify connect failed.'
                          );
                        }
                      }}
                    >
                      Connect Spotify
                    </button>
                    <button
                      type="button"
                      className="song-action-btn"
                      onClick={handleImportCurrentSong}
                      disabled={loadingCurrentSong}
                    >
                      {loadingCurrentSong ? <Loader2 className="spin" size={13} /> : <Music2 size={13} />}
                      Import Current
                    </button>
                  </div>
                  {songResults.length > 0 && (
                    <div className="song-results">
                      {songResults.map((track) => (
                        <button
                          key={track.spotifyId}
                          type="button"
                          className="song-result-item"
                          onClick={() => applySpotifyTrack(track)}
                        >
                          {track.coverUrl ? (
                            <img src={track.coverUrl} alt={track.title} className="song-result-cover" />
                          ) : (
                            <div className="song-result-cover placeholder">
                              <Music2 size={12} />
                            </div>
                          )}
                          <div className="song-result-meta">
                            <span>{track.title}</span>
                            <span>{track.artist}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="song-connect-hint">
                  Add `VITE_SPOTIFY_CLIENT_ID` in `.env` to enable Spotify search.
                </div>
              )}

              {songSearchError && <div className="song-error">{songSearchError}</div>}

              {selectedPinnedSong && (
                <div className="song-selected">
                  {selectedPinnedSong.coverUrl ? (
                    <img src={selectedPinnedSong.coverUrl} alt={selectedPinnedSong.title} className="song-selected-cover" />
                  ) : (
                    <div className="song-selected-cover placeholder">
                      <Music2 size={14} />
                    </div>
                  )}
                  <div className="song-selected-meta">
                    <div>{selectedPinnedSong.title}</div>
                    <div>{selectedPinnedSong.artist}</div>
                  </div>
                </div>
              )}
            </div>
          )}
          {selectedDateKey && (
            <div className="notes-block">
              <label className="notes-label" htmlFor="daily-notes">
                Notes
              </label>
              <textarea
                id="daily-notes"
                value={notesInput}
                onChange={(event) => setNotesInput(event.target.value)}
                placeholder="Quick thoughts, reflections, quotes..."
                className="notes-input"
                rows={4}
              />
            </div>
          )}
          <div className="day-panel-sub">
            {panelEntries.length > 0 ? `${panelEntries.length} entries` : 'No entries'}
          </div>
          <button className="day-panel-close" type="button" onClick={() => setSelectedDateKey(null)}>
            <X size={14} />
          </button>
        </div>

        <div className="day-panel-entries">
          {panelEntries.length === 0 ? (
            <div className="day-panel-empty">Nothing logged this day</div>
          ) : (
            panelEntries.map((entry) => (
              <div key={entry.id} className="panel-entry">
                <div className={`panel-entry-type ${entry.mediaType}`}>{entry.mediaType}</div>
                <div className="panel-entry-title">{entry.title}</div>
                <div className="panel-entry-creator">{entry.creator}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {achievement.show && (
        <div className="diary-achievement-overlay" role="dialog" aria-live="polite">
          <div className="diary-achievement-card">
            <div className="diary-achievement-badge">
              <Flame size={28} />
            </div>
            <h2 className="diary-achievement-title">Milestone reached</h2>
            <p className="diary-achievement-subtitle">
              Consistency compounds. The archive expands.
            </p>
            <div className="diary-achievement-score">{achievement.streak}</div>
            <div className="diary-achievement-caption">Consecutive days</div>
            <button
              type="button"
              className="diary-achievement-close"
              onClick={() => {
                if (achievementTimer.current) {
                  clearTimeout(achievementTimer.current);
                }
                setAchievement({ show: false, streak: 0 });
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
