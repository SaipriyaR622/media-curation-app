import { useMemo, useState, useEffect, useRef } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Feather,
  Flame,
  Loader2,
  Moon,
  Music2,
  Search,
  Sparkles,
  Sun,
  Trophy,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { useBooks } from '@/hooks/use-books';
import { useMovies } from '@/hooks/use-movies';
import { useDailyLogs } from '@/hooks/use-daily-logs';
import { DailyTodoItem } from '@/lib/types';
import { useConservatory } from '@/hooks/use-conservatory';
import { FocusMode } from '@/components/FocusMode';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
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
  createdAt: string;
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
type DiaryView = 'calendar' | 'conservatory' | 'focus' | 'achievements';

type Badge = {
  id: string;
  name: string;
  description: string;
  category: string;
  Icon: LucideIcon;
  icon: string;
  unlocked: boolean;
  hidden?: boolean;
  progress?: string;
  tone?: 'sage' | 'amber' | 'rose' | 'sky' | 'violet' | 'mint';
};

type BadgePayload = Omit<Badge, 'Icon'>;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DIARY_VIEWS: { key: DiaryView; label: string }[] = [
  { key: 'calendar', label: 'Calendar' },
  { key: 'conservatory', label: 'Midnight Conservatory' },
  { key: 'focus', label: 'Focus Mode' },
  { key: 'achievements', label: 'Achievements' },
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

function calculateLongestStreak(activeDates: string[]) {
  const unique = Array.from(new Set(activeDates)).sort();
  if (unique.length === 0) return 0;
  let longest = 0;
  let current = 0;
  let prev: Date | null = null;
  unique.forEach((key) => {
    const parsed = parseDateKey(key);
    if (!parsed) return;
    if (!prev) {
      current = 1;
    } else {
      const diff = (parsed.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      current = diff === 1 ? current + 1 : 1;
    }
    if (current > longest) longest = current;
    prev = parsed;
  });
  return longest;
}

function countWords(text: string) {
  return (text.match(/\b[\p{L}\p{N}_']+\b/gu) || []).length;
}

function toMonthKey(dateKey: string) {
  return dateKey.slice(0, 7);
}

function daysBetweenKeys(aKey: string, bKey: string) {
  const a = parseDateKey(aKey);
  const b = parseDateKey(bKey);
  if (!a || !b) return 0;
  const diff = b.getTime() - a.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function toDateKeyFromIso(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return toDateKey(parsed);
}

function getSeason(monthIndex: number) {
  if (monthIndex >= 2 && monthIndex <= 4) return 'spring';
  if (monthIndex >= 5 && monthIndex <= 7) return 'summer';
  if (monthIndex >= 8 && monthIndex <= 10) return 'autumn';
  return 'winter';
}

const TODO_LIMIT = 5;

function createTodoId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeTodoItems(value: unknown): DailyTodoItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const candidate = (item ?? {}) as Partial<DailyTodoItem>;
      const text = typeof candidate.text === 'string' ? candidate.text.trim() : '';
      if (!text) return null;
      return {
        id: typeof candidate.id === 'string' ? candidate.id : createTodoId(),
        text,
        done: Boolean(candidate.done),
        rollover: typeof candidate.rollover === 'boolean' ? candidate.rollover : true,
        rolledFrom: typeof candidate.rolledFrom === 'string' ? candidate.rolledFrom : undefined,
        sourceId: typeof candidate.sourceId === 'string' ? candidate.sourceId : undefined,
        createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : undefined,
        completedAt: typeof candidate.completedAt === 'string' ? candidate.completedAt : undefined,
      } as DailyTodoItem;
    })
    .filter((item): item is DailyTodoItem => Boolean(item));
}

function serializeTodoItems(items: DailyTodoItem[]) {
  return JSON.stringify(
    items.map((item) => ({
      id: item.id,
      text: item.text,
      done: item.done,
      rollover: item.rollover ?? true,
      rolledFrom: item.rolledFrom ?? null,
      sourceId: item.sourceId ?? null,
      createdAt: item.createdAt ?? null,
      completedAt: item.completedAt ?? null,
    }))
  );
}

function getHourFromIso(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getHours();
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
  const [todoItems, setTodoItems] = useState<DailyTodoItem[]>([]);
  const [todoInput, setTodoInput] = useState('');
  const [todoReflection, setTodoReflection] = useState('');
  const [achievement, setAchievement] = useState({ show: false, streak: 0 });
  const [badgeCelebration, setBadgeCelebration] = useState<{ show: boolean; badgeId?: string }>({
    show: false,
  });
  const [songQuery, setSongQuery] = useState('');
  const [songResults, setSongResults] = useState<SpotifyTrackResult[]>([]);
  const [songSearchLoading, setSongSearchLoading] = useState(false);
  const [songSearchError, setSongSearchError] = useState('');
  const [loadingCurrentSong, setLoadingCurrentSong] = useState(false);
  const [selectedPinnedSong, setSelectedPinnedSong] = useState<PinnedSong | null>(null);
  const songSearchCacheRef = useRef<Map<string, SpotifyTrackResult[]>>(new Map());
  const achievementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const badgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const badgeSyncRef = useRef<string>('');
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
        createdAt: entry.createdAt,
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
        createdAt: entry.createdAt,
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

    const monthLogs = logs.filter((log) => {
      if (!log.date.startsWith(monthKeyPrefix)) {
        return false;
      }
      return (
        (log.pages_read ?? 0) > 0 ||
        Boolean(log.notes?.trim()) ||
        (log.todo_items?.length ?? 0) > 0 ||
        Boolean(log.todo_reflection?.trim()) ||
        Boolean(log.spotify_track_id) ||
        Boolean(log.song_title) ||
        Boolean(log.song_cover_url)
      );
    });

    monthLogs.forEach((log) => {
      activeDays.add(log.date);
      totalEntries += 1;
    });

    return { activeDays: activeDays.size, totalEntries };
  }, [entries, logs, monthKeyPrefix]);

  const meaningfulLogs = useMemo(
    () =>
      logs.filter((log) => (
        (log.pages_read ?? 0) > 0 ||
        Boolean(log.notes?.trim()) ||
        (log.todo_items?.length ?? 0) > 0 ||
        Boolean(log.todo_reflection?.trim()) ||
        Boolean(log.spotify_track_id) ||
        Boolean(log.song_title) ||
        Boolean(log.song_cover_url)
      )),
    [logs]
  );

  const diaryEntryDates = useMemo(() => {
    const dates = new Set<string>();
    entries.forEach((entry) => dates.add(entry.date));
    meaningfulLogs.forEach((log) => dates.add(log.date));
    return Array.from(dates);
  }, [entries, meaningfulLogs]);

  const diaryEntryCount = useMemo(() => entries.length + meaningfulLogs.length, [entries.length, meaningfulLogs.length]);

  const totalWordCount = useMemo(() => {
    let total = 0;
    entries.forEach((entry) => {
      total += countWords(entry.review ?? '');
    });
    meaningfulLogs.forEach((log) => {
      total += countWords(log.notes ?? '');
      total += countWords(log.todo_reflection ?? '');
    });
    return total;
  }, [entries, meaningfulLogs]);

  const minimalistUnlocked = useMemo(() => {
    const hasMinimal = (text?: string | null) => {
      const count = countWords(text ?? '');
      return count > 0 && count <= 10;
    };
    if (entries.some((entry) => hasMinimal(entry.review))) return true;
    return meaningfulLogs.some((log) => hasMinimal(log.notes) || hasMinimal(log.todo_reflection));
  }, [entries, meaningfulLogs]);

  const gratitudeCount = useMemo(() => {
    const regex = /\b(grateful|thankful|blessed)\b/i;
    const hit = new Set<string>();
    entries.forEach((entry) => {
      if (regex.test(entry.review ?? '')) {
        hit.add(entry.id);
      }
    });
    meaningfulLogs.forEach((log) => {
      if (regex.test(log.notes ?? '')) {
        hit.add(`log-${log.date}-notes`);
      }
      if (regex.test(log.todo_reflection ?? '')) {
        hit.add(`log-${log.date}-reflection`);
      }
    });
    return hit.size;
  }, [entries, meaningfulLogs]);

  const weekendWarrior = useMemo(() => {
    const monthMap = new Map<string, { sat: boolean; sun: boolean }>();
    diaryEntryDates.forEach((dateKey) => {
      const parsed = parseDateKey(dateKey);
      if (!parsed) return;
      const monthKey = toMonthKey(dateKey);
      const entry = monthMap.get(monthKey) ?? { sat: false, sun: false };
      const day = parsed.getDay();
      if (day === 6) entry.sat = true;
      if (day === 0) entry.sun = true;
      monthMap.set(monthKey, entry);
    });
    let unlocked = false;
    let best = 0;
    let bestMonth = '';
    monthMap.forEach((value, key) => {
      const count = (value.sat ? 1 : 0) + (value.sun ? 1 : 0);
      if (count > best) {
        best = count;
        bestMonth = key;
      }
      if (value.sat && value.sun) {
        unlocked = true;
      }
    });
    return { unlocked, best, bestMonth };
  }, [diaryEntryDates]);

  const seasonalProgress = useMemo(() => {
    const seasons = new Set<string>();
    diaryEntryDates.forEach((dateKey) => {
      const parsed = parseDateKey(dateKey);
      if (!parsed) return;
      seasons.add(getSeason(parsed.getMonth()));
    });
    return { count: seasons.size, seasons };
  }, [diaryEntryDates]);

  const comebackGap = useMemo(() => {
    const sorted = [...diaryEntryDates].sort();
    let maxGap = 0;
    for (let i = 1; i < sorted.length; i += 1) {
      const gap = daysBetweenKeys(sorted[i - 1], sorted[i]);
      if (gap > maxGap) maxGap = gap;
    }
    return Math.max(0, maxGap - 1);
  }, [diaryEntryDates]);

  const todoHistory = useMemo(() => {
    const map = new Map<string, { dateKey: string; sourceId?: string; createdAt?: string }>();
    logs.forEach((log) => {
      normalizeTodoItems(log.todo_items).forEach((item) => {
        map.set(item.id, { dateKey: log.date, sourceId: item.sourceId, createdAt: item.createdAt });
      });
    });
    return map;
  }, [logs]);

  const todoBadges = useMemo(() => {
    let maxDone = 0;
    let maxOverdueDays = 0;
    let cleanSlateStreak = 0;
    let cleanSlateBest = 0;
    let taskSniper = false;

    const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));
    let lastDate: string | null = null;

    sortedLogs.forEach((log) => {
      const items = normalizeTodoItems(log.todo_items);
      const doneCount = items.filter((item) => item.done).length;
      if (doneCount > maxDone) maxDone = doneCount;

      const isCleanDay =
        items.every((item) => item.done) && items.every((item) => !item.rolledFrom);

      if (isCleanDay) {
        if (lastDate && daysBetweenKeys(lastDate, log.date) === 1) {
          cleanSlateStreak += 1;
        } else {
          cleanSlateStreak = 1;
        }
      } else {
        cleanSlateStreak = 0;
      }
      if (cleanSlateStreak > cleanSlateBest) cleanSlateBest = cleanSlateStreak;
      lastDate = log.date;

      items.forEach((item) => {
        if (!item.done) return;

        const completedAt = item.completedAt ? new Date(item.completedAt) : null;
        const createdAt = item.createdAt ? new Date(item.createdAt) : null;
        if (completedAt && createdAt) {
          const diffMs = completedAt.getTime() - createdAt.getTime();
          if (diffMs >= 0 && diffMs <= 60 * 60 * 1000) {
            taskSniper = true;
          }
        }

        const createdKey = toDateKeyFromIso(item.createdAt);
        let originKey = createdKey;
        if (!originKey && item.sourceId) {
          let currentId = item.sourceId;
          let guard = 0;
          while (currentId && guard < 10) {
            const node = todoHistory.get(currentId);
            if (!node) break;
            originKey = node.createdAt ? toDateKeyFromIso(node.createdAt) ?? node.dateKey : node.dateKey;
            currentId = node.sourceId ?? '';
            guard += 1;
          }
        }
        if (originKey) {
          const overdue = Math.max(0, daysBetweenKeys(originKey, log.date));
          if (overdue > maxOverdueDays) maxOverdueDays = overdue;
        }
      });
    });

    return {
      maxDone,
      maxOverdueDays,
      cleanSlateBest,
      taskSniper,
    };
  }, [logs, todoHistory]);

  useEffect(() => {
    setSelectedDateKey(null);
  }, [currentYear, currentMonth]);

  useEffect(() => {
    return () => {
      if (achievementTimer.current) {
        clearTimeout(achievementTimer.current);
      }
      if (badgeTimer.current) {
        clearTimeout(badgeTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activeView !== 'calendar') {
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

  const todoStats = useMemo(() => {
    const total = todoItems.length;
    const completed = todoItems.filter((item) => item.done).length;
    return {
      total,
      completed,
      progress: total === 0 ? 0 : completed / total,
    };
  }, [todoItems]);

  const todosChanged = useMemo(() => {
    const stored = serializeTodoItems(normalizeTodoItems(selectedLog?.todo_items));
    const current = serializeTodoItems(todoItems);
    return stored !== current;
  }, [selectedLog, todoItems]);

  const reflectionChanged = useMemo(
    () => (todoReflection.trim() !== (selectedLog?.todo_reflection ?? '').trim()),
    [todoReflection, selectedLog]
  );

  useEffect(() => {
    if (!selectedDateKey) {
      setPagesInput('');
      setNotesInput('');
      setTodoItems([]);
      setTodoInput('');
      setTodoReflection('');
      setSongQuery('');
      setSongResults([]);
      setSongSearchError('');
      setSelectedPinnedSong(null);
      return;
    }
    setPagesInput(selectedLog ? String(selectedLog.pages_read) : '');
    setNotesInput(selectedLog?.notes ?? '');
    const baseTodos = normalizeTodoItems(selectedLog?.todo_items);
    const prevKey = shiftDateKey(selectedDateKey, -1);
    const prevLog = logsByDate.get(prevKey);
    let mergedTodos = [...baseTodos];
    if (prevLog) {
      const rolloverCandidates = normalizeTodoItems(prevLog.todo_items).filter(
        (item) => (item.rollover ?? true) && !item.done
      );
      const existingSourceIds = new Set(mergedTodos.map((item) => item.sourceId).filter(Boolean) as string[]);
      rolloverCandidates.forEach((item) => {
        if (mergedTodos.length >= TODO_LIMIT) return;
        if (existingSourceIds.has(item.id)) return;
        mergedTodos = [
          ...mergedTodos,
          {
            ...item,
            id: createTodoId(),
            done: false,
            rolledFrom: prevKey,
            sourceId: item.id,
            createdAt: item.createdAt ?? new Date().toISOString(),
            completedAt: undefined,
          },
        ];
      });
    }
    setTodoItems(mergedTodos);
    setTodoInput('');
    setTodoReflection(selectedLog?.todo_reflection ?? '');
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
  }, [selectedDateKey, selectedLog, logsByDate]);

  useEffect(() => {
    const normalizedQuery = songQuery.trim().toLowerCase();
    if (!selectedDateKey || normalizedQuery.length < 2) {
      setSongResults([]);
      setSongSearchLoading(false);
      return;
    }

    const cached = songSearchCacheRef.current.get(normalizedQuery);
    if (cached) {
      setSongResults(cached);
      setSongSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSongSearchLoading(true);
      setSongSearchError('');
      try {
        const tracks = await searchSpotifyTracks(normalizedQuery);
        songSearchCacheRef.current.set(normalizedQuery, tracks);
        setSongResults(tracks);
      } catch {
        setSongResults([]);
        setSongSearchError('Connect Spotify to search tracks.');
      } finally {
        setSongSearchLoading(false);
      }
    }, 180);

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
            loading="eager"
            decoding="async"
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
  const formatTodoDate = (dateKey: string) => {
    const parsed = parseDateKey(dateKey);
    if (!parsed) return dateKey;
    return `${MONTHS[parsed.getMonth()].slice(0, 3)} ${parsed.getDate()}`;
  };
  const addTodoItem = () => {
    const text = todoInput.trim();
    if (!text || todoItems.length >= TODO_LIMIT) return;
    setTodoItems((prev) => [
      ...prev,
      { id: createTodoId(), text, done: false, rollover: true, createdAt: new Date().toISOString() },
    ]);
    setTodoInput('');
  };
  const handleSaveLog = async () => {
    if (!selectedDateKey) return;
    const parsed = pagesInput.trim() === ''
      ? selectedLog?.pages_read ?? 0
      : Number(pagesInput);
    if (Number.isNaN(parsed)) return;
    const cleanedNotes = notesInput.trim();
    const cleanedTodos = normalizeTodoItems(todoItems).slice(0, TODO_LIMIT);
    const cleanedReflection = todoReflection.trim();
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
        : null,
      {
        todoItems: cleanedTodos,
        todoReflection: cleanedReflection.length > 0 ? cleanedReflection : null,
      }
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

  const notesChanged = notesInput.trim() !== (selectedLog?.notes ?? '');
  const pagesValue = pagesInput.trim() === '' ? String(selectedLog?.pages_read ?? '') : pagesInput.trim();
  const pagesChanged = pagesValue !== String(selectedLog?.pages_read ?? '');
  const hasLogChanges =
    pagesChanged ||
    notesChanged ||
    songChanged ||
    todosChanged ||
    reflectionChanged;

  const longestStreak = useMemo(() => calculateLongestStreak(diaryEntryDates), [diaryEntryDates]);

  const taskMasterStreak = useMemo(() => {
    const completedDates = logs
      .filter((log) => (log.todo_items?.length ?? 0) > 0 && (log.todo_items ?? []).every((item) => item.done))
      .map((log) => log.date);
    return calculateLongestStreak(completedDates);
  }, [logs]);

  const maxWordCount = useMemo(() => {
    let max = 0;
    entries.forEach((entry) => {
      max = Math.max(max, countWords(entry.review ?? ''));
    });
    meaningfulLogs.forEach((log) => {
      max = Math.max(max, countWords(log.notes ?? ''));
      max = Math.max(max, countWords(log.todo_reflection ?? ''));
    });
    return max;
  }, [entries, meaningfulLogs]);

  const hasNightOwl = useMemo(() => {
    const entryHit = entries.some((entry) => {
      const hour = getHourFromIso(entry.createdAt);
      return hour !== null && hour >= 0 && hour < 3;
    });
    if (entryHit) return true;
    return meaningfulLogs.some((log) => {
      const hour = getHourFromIso(log.created_at);
      return hour !== null && hour >= 0 && hour < 3;
    });
  }, [entries, meaningfulLogs]);

  const hasEarlyBird = useMemo(() => {
    const entryHit = entries.some((entry) => {
      const hour = getHourFromIso(entry.createdAt);
      return hour !== null && hour >= 0 && hour < 7;
    });
    if (entryHit) return true;
    return meaningfulLogs.some((log) => {
      const hour = getHourFromIso(log.created_at);
      return hour !== null && hour >= 0 && hour < 7;
    });
  }, [entries, meaningfulLogs]);


  const pinnedSongCount = useMemo(
    () => logs.filter((log) => Boolean(log.spotify_track_id || log.song_title)).length,
    [logs]
  );

  const bloomedCount = useMemo(() => plants.filter((pl) => pl.stage === MAX_STAGE).length, [plants]);

  const badges = useMemo<Badge[]>(() => ([
    {
      id: 'first-ink',
      name: 'First Ink',
      description: 'Write your very first diary entry.',
      category: 'Onboarding',
      Icon: Feather,
      icon: 'Feather',
      unlocked: diaryEntryDates.length > 0,
      progress: `${Math.min(diaryEntryDates.length, 1)}/1`,
      tone: 'sage',
    },
    {
      id: 'streak-starter',
      name: 'Streak Starter',
      description: 'Write in the diary for 3 consecutive days.',
      category: 'Consistency',
      Icon: Flame,
      icon: 'Flame',
      unlocked: longestStreak >= 3,
      progress: `${Math.min(longestStreak, 3)}/3 days`,
      tone: 'amber',
    },
    {
      id: 'habit-builder',
      name: 'Habit Builder',
      description: 'Maintain a 30-day journaling streak.',
      category: 'Consistency',
      Icon: Trophy,
      icon: 'Trophy',
      unlocked: longestStreak >= 30,
      progress: `${Math.min(longestStreak, 30)}/30 days`,
      tone: 'rose',
    },
    {
      id: 'task-master',
      name: 'Task Master',
      description: 'Complete 100% of your daily to-do list for a week.',
      category: 'Productivity',
      Icon: CheckCircle2,
      icon: 'CheckCircle2',
      unlocked: taskMasterStreak >= 7,
      progress: `${Math.min(taskMasterStreak, 7)}/7 days`,
      tone: 'mint',
    },
    {
      id: 'night-owl',
      name: 'Night Owl',
      description: 'Write an entry between 12:00 AM and 3:00 AM.',
      category: 'Behavioral',
      Icon: Moon,
      icon: 'Moon',
      unlocked: hasNightOwl,
      progress: hasNightOwl ? 'Unlocked' : '12:00 AM - 3:00 AM',
      tone: 'violet',
    },
    {
      id: 'early-bird',
      name: 'Early Bird',
      description: 'Write an entry before 7:00 AM.',
      category: 'Behavioral',
      Icon: Sun,
      icon: 'Sun',
      unlocked: hasEarlyBird,
      progress: hasEarlyBird ? 'Unlocked' : 'Before 7:00 AM',
      tone: 'amber',
    },
    {
      id: 'wordsmith',
      name: 'Wordsmith',
      description: 'Write an entry that exceeds 500 words.',
      category: 'Volume',
      Icon: BookOpen,
      icon: 'BookOpen',
      unlocked: maxWordCount >= 500,
      progress: `${Math.min(maxWordCount, 500)}/500 words`,
      tone: 'sky',
    },
    {
      id: 'year-in-review',
      name: 'A Year in Review',
      description: 'Keep the diary active for a full 365 days.',
      category: 'Milestone',
      Icon: Award,
      icon: 'Award',
      unlocked: diaryEntryDates.length >= 365,
      progress: `${Math.min(diaryEntryDates.length, 365)}/365 days`,
      tone: 'sage',
    },
    {
      id: 'century-club',
      name: 'Century Club',
      description: 'Reach 100 total diary entries.',
      category: 'Milestone',
      Icon: Trophy,
      icon: 'Trophy',
      unlocked: diaryEntryCount >= 100,
      progress: `${Math.min(diaryEntryCount, 100)}/100 entries`,
      tone: 'amber',
    },
    {
      id: 'comeback-kid',
      name: 'The Comeback Kid',
      description: 'Write an entry after missing 7 or more days.',
      category: 'Consistency',
      Icon: Flame,
      icon: 'Flame',
      unlocked: comebackGap >= 7,
      progress: `${Math.min(comebackGap, 7)}/7 missed days`,
      tone: 'rose',
    },
    {
      id: 'weekend-warrior',
      name: 'Weekend Warrior',
      description: 'Log an entry on both Saturday and Sunday for a month.',
      category: 'Consistency',
      Icon: Sun,
      icon: 'Sun',
      unlocked: weekendWarrior.unlocked,
      progress: `${Math.min(weekendWarrior.best, 2)}/2 weekend days`,
      tone: 'amber',
    },
    {
      id: 'seasoned-pro',
      name: 'Seasoned Pro',
      description: 'Write at least one entry in Spring, Summer, Autumn, and Winter.',
      category: 'Consistency',
      Icon: Award,
      icon: 'Award',
      unlocked: seasonalProgress.count >= 4,
      progress: `${Math.min(seasonalProgress.count, 4)}/4 seasons`,
      tone: 'sage',
    },
    {
      id: 'soundtrack-scribe',
      name: 'Soundtrack Scribe',
      description: 'Pin 10 songs to your daily entries.',
      category: 'Hidden',
      Icon: Music2,
      icon: 'Music2',
      unlocked: pinnedSongCount >= 10,
      progress: `${Math.min(pinnedSongCount, 10)}/10 songs`,
      tone: 'sky',
      hidden: true,
    },
    {
      id: 'garden-whisperer',
      name: 'Garden Whisperer',
      description: 'Bloom 5 plants in the conservatory.',
      category: 'Hidden',
      Icon: Sparkles,
      icon: 'Sparkles',
      unlocked: bloomedCount >= 5,
      progress: `${Math.min(bloomedCount, 5)}/5 blooms`,
      tone: 'mint',
      hidden: true,
    },
    {
      id: 'procrastination-defeated',
      name: 'Procrastination Defeated',
      description: 'Complete a task that rolled over for 3 or more days.',
      category: 'Productivity',
      Icon: CheckCircle2,
      icon: 'CheckCircle2',
      unlocked: todoBadges.maxOverdueDays >= 3,
      progress: `${Math.min(todoBadges.maxOverdueDays, 3)}/3 days`,
      tone: 'mint',
    },
    {
      id: 'overachiever',
      name: 'The Overachiever',
      description: 'Complete 5 or more tasks in a single day.',
      category: 'Productivity',
      Icon: CheckCircle2,
      icon: 'CheckCircle2',
      unlocked: todoBadges.maxDone >= 5,
      progress: `${Math.min(todoBadges.maxDone, 5)}/5 tasks`,
      tone: 'mint',
    },
    {
      id: 'clean-slate',
      name: 'Clean Slate',
      description: 'Finish a week with absolutely zero rollover tasks.',
      category: 'Productivity',
      Icon: CheckCircle2,
      icon: 'CheckCircle2',
      unlocked: todoBadges.cleanSlateBest >= 7,
      progress: `${Math.min(todoBadges.cleanSlateBest, 7)}/7 days`,
      tone: 'sage',
    },
    {
      id: 'task-sniper',
      name: 'Task Sniper',
      description: 'Complete a task within 1 hour of adding it.',
      category: 'Productivity',
      Icon: CheckCircle2,
      icon: 'CheckCircle2',
      unlocked: todoBadges.taskSniper,
      progress: todoBadges.taskSniper ? 'Unlocked' : 'Within 1 hour',
      tone: 'sky',
    },
    {
      id: 'novel-writer',
      name: 'Novel Writer',
      description: 'Hit a lifetime total of 50,000 words written across all entries.',
      category: 'Writing',
      Icon: BookOpen,
      icon: 'BookOpen',
      unlocked: totalWordCount >= 50000,
      progress: `${Math.min(totalWordCount, 50000)}/50000 words`,
      tone: 'sky',
    },
    {
      id: 'minimalist',
      name: 'The Minimalist',
      description: 'Save an entry that is one sentence or under 10 words.',
      category: 'Writing',
      Icon: Feather,
      icon: 'Feather',
      unlocked: minimalistUnlocked,
      progress: minimalistUnlocked ? 'Unlocked' : 'Under 10 words',
      tone: 'rose',
    },
    {
      id: 'gratitude-guru',
      name: 'Gratitude Guru',
      description: 'Use "grateful", "thankful", or "blessed" in 10 different entries.',
      category: 'Writing',
      Icon: Sparkles,
      icon: 'Sparkles',
      unlocked: gratitudeCount >= 10,
      progress: `${Math.min(gratitudeCount, 10)}/10 entries`,
      tone: 'amber',
    },
  ]), [
    diaryEntryDates.length,
    longestStreak,
    taskMasterStreak,
    hasNightOwl,
    hasEarlyBird,
    maxWordCount,
    diaryEntryCount,
    comebackGap,
    weekendWarrior.unlocked,
    weekendWarrior.best,
    seasonalProgress.count,
    pinnedSongCount,
    bloomedCount,
    todoBadges.maxOverdueDays,
    todoBadges.maxDone,
    todoBadges.cleanSlateBest,
    todoBadges.taskSniper,
    totalWordCount,
    minimalistUnlocked,
    gratitudeCount,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unlockedIds = badges.filter((badge) => badge.unlocked).map((badge) => badge.id);
    const storageKey = 'cozy-reads:diary-badges';
    let storedIds: string[] = [];
    try {
      const stored = window.localStorage.getItem(storageKey);
      storedIds = stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      storedIds = [];
    }
    const newlyUnlocked = unlockedIds.filter((id) => !storedIds.includes(id));
    if (newlyUnlocked.length > 0) {
      const badge = badges.find((item) => item.id === newlyUnlocked[0]);
      if (badge) {
        setBadgeCelebration({ show: true, badgeId: badge.id });
        if (badgeTimer.current) {
          clearTimeout(badgeTimer.current);
        }
        badgeTimer.current = setTimeout(() => {
          setBadgeCelebration({ show: false });
        }, 4500);
      }
    }
    const merged = Array.from(new Set([...storedIds, ...unlockedIds]));
    window.localStorage.setItem(storageKey, JSON.stringify(merged));
  }, [badges]);

  const unlockedCount = useMemo(() => badges.filter((badge) => badge.unlocked).length, [badges]);
  const celebrationBadge = useMemo(
    () => badges.find((badge) => badge.id === badgeCelebration.badgeId),
    [badges, badgeCelebration.badgeId]
  );

  const badgePayload = useMemo<BadgePayload[]>(
    () => badges.map(({ Icon, ...rest }) => rest),
    [badges]
  );

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    let isActive = true;
    const persistBadges = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          return;
        }

        const payload = JSON.stringify(badgePayload);
        if (payload === badgeSyncRef.current) {
          return;
        }
        badgeSyncRef.current = payload;

        await supabase
          .from('diary_achievements')
          .upsert(
            {
              user_id: data.user.id,
              badges: badgePayload,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
      } catch (err) {
        if (isActive) {
          console.error('Failed to sync diary achievements', err);
        }
      }
    };

    void persistBadges();

    return () => {
      isActive = false;
    };
  }, [badgePayload]);


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

        {activeView === 'focus' && (
          <FocusMode />
        )}

        {activeView === 'achievements' && (
          <section className="achievements-view">
            <header className="achievements-header">
              <div>
                <div className="achievements-title">Achievement Cabinet</div>
                <div className="achievements-subtitle">Small wins, steady streaks, and secret surprises.</div>
              </div>
              <div className="achievements-count">
                <span className="achievements-count-num">{unlockedCount}</span>
                <span className="achievements-count-total">/ {badges.length}</span>
                <span className="achievements-count-label">Unlocked</span>
              </div>
            </header>

            <div className="achievements-grid">
              {badges.map((badge) => {
                const isLocked = !badge.unlocked;
                const isHidden = Boolean(badge.hidden && !badge.unlocked);
                const BadgeIcon = badge.Icon;
                const progressText = isHidden ? '???' : badge.progress;
                return (
                  <div key={badge.id} className={`badge-card ${isLocked ? 'locked' : ''}`} data-tone={badge.tone}>
                    <div className="badge-icon">
                      <BadgeIcon size={20} />
                    </div>
                    <div className="badge-body">
                      <div className="badge-name">{isHidden ? 'Hidden Badge' : badge.name}</div>
                      <div className="badge-desc">
                        {isHidden ? 'Keep journaling to reveal this one.' : badge.description}
                      </div>
                      <div className="badge-meta">
                        <span className="badge-category">{badge.category}</span>
                        <span className="badge-progress">{progressText}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
                onClick={handleSaveLog}
                disabled={!hasLogChanges}
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
                            <img src={track.coverUrl} alt={track.title} className="song-result-cover" loading="eager" decoding="async" />
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
                    <img
                      src={selectedPinnedSong.coverUrl}
                      alt={selectedPinnedSong.title}
                      className="song-selected-cover"
                      loading="eager"
                      decoding="async"
                    />
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
            <div className="todo-block">
              <div className="todo-header-row">
                <div>
                  <label className="notes-label">Daily action items</label>
                  <div className="todo-sub">Pick 3-5 key tasks that support today's entry.</div>
                </div>
                <div className="todo-progress">
                  <span>{todoStats.completed}/{todoStats.total}</span>
                  <span className="todo-progress-label">Done</span>
                </div>
              </div>
              <div className="todo-progress-bar">
                <span style={{ width: `${Math.round(todoStats.progress * 100)}%` }} />
              </div>
              <div className="todo-input-row">
                <input
                  type="text"
                  value={todoInput}
                  onChange={(event) => setTodoInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addTodoItem();
                    }
                  }}
                  placeholder={todoItems.length >= TODO_LIMIT ? 'Task list is full' : 'Add a task...'}
                  className="todo-input"
                  maxLength={90}
                />
                <button
                  type="button"
                  className="todo-add"
                  onClick={addTodoItem}
                  disabled={todoItems.length >= TODO_LIMIT || todoInput.trim().length === 0}
                >
                  Add
                </button>
              </div>
              <div className="todo-list">
                {todoItems.length === 0 && (
                  <div className="todo-empty">Nothing here yet. Keep it light and meaningful.</div>
                )}
                {todoItems.map((item) => (
                  <div key={item.id} className={`todo-item ${item.done ? 'done' : ''}`}>
                    <label className="todo-check">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => {
                          setTodoItems((prev) =>
                            prev.map((todo) => (
                              todo.id === item.id
                                ? {
                                  ...todo,
                                  done: !todo.done,
                                  completedAt: !todo.done ? new Date().toISOString() : undefined,
                                }
                                : todo
                            ))
                          );
                        }}
                      />
                      <span className="todo-text">{item.text}</span>
                    </label>
                    <label className="todo-rollover">
                      <input
                        type="checkbox"
                        checked={item.rollover ?? true}
                        onChange={() => {
                          setTodoItems((prev) =>
                            prev.map((todo) => (
                              todo.id === item.id ? { ...todo, rollover: !(todo.rollover ?? true) } : todo
                            ))
                          );
                        }}
                      />
                      <span>Roll over</span>
                    </label>
                    {item.rolledFrom && (
                      <span className="todo-from">From {formatTodoDate(item.rolledFrom)}</span>
                    )}
                    <button
                      type="button"
                      className="todo-remove"
                      onClick={() => {
                        setTodoItems((prev) => prev.filter((todo) => todo.id !== item.id));
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="todo-reflection">
                <label className="notes-label" htmlFor="todo-reflection">
                  How did you feel about what you accomplished today?
                </label>
                <textarea
                  id="todo-reflection"
                  value={todoReflection}
                  onChange={(event) => setTodoReflection(event.target.value)}
                  placeholder="A quick check-in before closing the day..."
                  className="todo-reflection-input"
                  rows={3}
                />
              </div>
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

      {badgeCelebration.show && celebrationBadge && (
        <div className="badge-celebration-overlay" role="dialog" aria-live="polite">
          <div className="badge-celebration-card" data-tone={celebrationBadge.tone}>
            <div className="badge-celebration-icon">
              <Sparkles size={26} />
            </div>
            <div className="badge-celebration-kicker">Badge unlocked</div>
            <h2 className="badge-celebration-title">{celebrationBadge.name}</h2>
            <p className="badge-celebration-desc">{celebrationBadge.description}</p>
            <button
              type="button"
              className="badge-celebration-close"
              onClick={() => {
                if (badgeTimer.current) {
                  clearTimeout(badgeTimer.current);
                }
                setBadgeCelebration({ show: false });
              }}
            >
              Keep journaling
            </button>
            <div className="badge-confetti" aria-hidden="true">
              {Array.from({ length: 14 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
