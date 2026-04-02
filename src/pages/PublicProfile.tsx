import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  Clapperboard,
  Feather,
  Flame,
  Moon,
  Music2,
  Search,
  Sparkles,
  Star,
  Sun,
  Trophy,
  UserCheck,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { type FollowableProfile, useProfile } from "@/hooks/use-profile";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type CanvasKind = "book" | "movie" | "song" | "sticky-note" | "ambient-quote" | "washi-tape" | "paperclip";

interface CanvasItem {
  id: string;
  title: string;
  coverUrl?: string;
  kind: CanvasKind;
  text?: string;
  decorVariant?: "honey" | "rose" | "mint" | "paperclip";
  baseWidth: number;
  baseHeight: number;
  initialX: number;
  initialY: number;
  rotation: number;
  scale: number;
  zIndex: number;
}

interface DiaryItem {
  id: string;
  mediaType: "book" | "movie";
  title: string;
  creator: string;
  date: string;
  createdAt: string;
  rating: number;
  review: string;
  isRevisit: boolean;
}

interface ProfileRow {
  id: string;
  name: string;
  bio: string;
  avatar_url: string;
}

interface BooksRow {
  id: string;
  title: string;
  author: string;
}

interface BookDiaryRow {
  id: string;
  book_id: string;
  read_on: string;
  rating: number;
  review: string;
  reread: boolean;
  created_at: string;
}

interface MoviesRow {
  id: string;
  title: string;
  director: string;
}

interface MovieDiaryRow {
  id: string;
  movie_id: string;
  watched_on: string;
  rating: number;
  review: string;
  rewatch: boolean;
  created_at: string;
}

interface AchievementsRow {
  badges: unknown;
}

type Badge = {
  id: string;
  name: string;
  description: string;
  category: string;
  Icon: LucideIcon;
  icon: string;
  unlocked: boolean;
  progress?: string;
  tone?: "sage" | "amber" | "rose" | "sky" | "violet" | "mint";
  hidden?: boolean;
};

const CANVAS_HEIGHT = 2200;

const TAPE_ARTWORK: Record<Exclude<CanvasItem["decorVariant"], "paperclip">, string> = {
  honey:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 62'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='0'%3E%3Cstop offset='0' stop-color='%23f9d976' stop-opacity='.92'/%3E%3Cstop offset='1' stop-color='%23f39f86' stop-opacity='.92'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect x='2' y='2' width='216' height='58' rx='8' fill='url(%23g)'/%3E%3Cpath d='M24 2v58M56 2v58M88 2v58M120 2v58M152 2v58M184 2v58' stroke='%23fff' stroke-opacity='.34' stroke-width='2'/%3E%3C/svg%3E",
  rose:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 62'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='0'%3E%3Cstop offset='0' stop-color='%23f8c7d8' stop-opacity='.92'/%3E%3Cstop offset='1' stop-color='%23f4a6c4' stop-opacity='.92'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect x='2' y='2' width='216' height='58' rx='8' fill='url(%23g)'/%3E%3Cpath d='M24 2v58M56 2v58M88 2v58M120 2v58M152 2v58M184 2v58' stroke='%23fff' stroke-opacity='.34' stroke-width='2'/%3E%3C/svg%3E",
  mint:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 62'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='0'%3E%3Cstop offset='0' stop-color='%23a6dbc9' stop-opacity='.92'/%3E%3Cstop offset='1' stop-color='%2389d6e4' stop-opacity='.92'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect x='2' y='2' width='216' height='58' rx='8' fill='url(%23g)'/%3E%3Cpath d='M24 2v58M56 2v58M88 2v58M120 2v58M152 2v58M184 2v58' stroke='%23fff' stroke-opacity='.34' stroke-width='2'/%3E%3C/svg%3E",
};

const PAPERCLIP_ARTWORK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 200'%3E%3Cg fill='none' stroke='%23494f56' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M35 54v78c0 29 50 29 50 0V46c0-18-30-18-30 0v82c0 8 12 8 12 0V67' stroke-width='10'/%3E%3Cpath d='M42 50h44' stroke='%23cfd4db' stroke-width='3'/%3E%3C/g%3E%3C/svg%3E";

function formatDiaryDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const BADGE_ICON_MAP: Record<string, LucideIcon> = {
  Award,
  BookOpen,
  CheckCircle2,
  Feather,
  Flame,
  Moon,
  Music2,
  Sparkles,
  Sun,
  Trophy,
};

function normalizeBadgePayload(value: unknown): Badge[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const candidate = (entry ?? {}) as Partial<Badge>;
      if (!candidate.id || !candidate.name || !candidate.description || !candidate.category || !candidate.icon) {
        return null;
      }
      return {
        id: String(candidate.id),
        name: String(candidate.name),
        description: String(candidate.description),
        category: String(candidate.category),
        icon: String(candidate.icon),
        Icon: BADGE_ICON_MAP[String(candidate.icon)] ?? Award,
        unlocked: Boolean(candidate.unlocked),
        progress: typeof candidate.progress === "string" ? candidate.progress : "",
        tone: candidate.tone,
        hidden: Boolean(candidate.hidden),
      } as Badge;
    })
    .filter((entry): entry is Badge => Boolean(entry));
}

function normalizeCanvasItem(value: unknown): CanvasItem | null {
  const candidate = (value ?? {}) as Partial<CanvasItem>;
  const validKinds: CanvasKind[] = ["book", "movie", "song", "sticky-note", "ambient-quote", "washi-tape", "paperclip"];
  if (!candidate.kind || !validKinds.includes(candidate.kind)) {
    return null;
  }

  return {
    id: typeof candidate.id === "string" ? candidate.id : `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: typeof candidate.title === "string" ? candidate.title : "Untitled",
    coverUrl: typeof candidate.coverUrl === "string" ? candidate.coverUrl : undefined,
    kind: candidate.kind,
    text: typeof candidate.text === "string" ? candidate.text : undefined,
    decorVariant:
      candidate.decorVariant === "honey" || candidate.decorVariant === "rose" || candidate.decorVariant === "mint" || candidate.decorVariant === "paperclip"
        ? candidate.decorVariant
        : undefined,
    baseWidth: typeof candidate.baseWidth === "number" && candidate.baseWidth > 0 ? candidate.baseWidth : 160,
    baseHeight: typeof candidate.baseHeight === "number" && candidate.baseHeight > 0 ? candidate.baseHeight : 240,
    initialX: typeof candidate.initialX === "number" && Number.isFinite(candidate.initialX) ? candidate.initialX : 80,
    initialY: typeof candidate.initialY === "number" && Number.isFinite(candidate.initialY) ? candidate.initialY : 80,
    rotation: typeof candidate.rotation === "number" && Number.isFinite(candidate.rotation) ? candidate.rotation : 0,
    scale: typeof candidate.scale === "number" && Number.isFinite(candidate.scale) ? candidate.scale : 1,
    zIndex: typeof candidate.zIndex === "number" && Number.isFinite(candidate.zIndex) ? candidate.zIndex : 0,
  };
}

export default function PublicProfile() {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { currentUserId, followingIds, toggleFollow } = useProfile();
  const [profile, setProfile] = useState<FollowableProfile | null>(null);
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryItem[]>([]);
  const [publicBadges, setPublicBadges] = useState<Badge[]>([]);
  const [achievementsReady, setAchievementsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!userId) {
      setError("Profile not found.");
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }

    let isActive = true;

    const loadPublicProfile = async () => {
      setLoading(true);
      setError("");

      try {
        const [
          profileResult,
          canvasResult,
          booksResult,
          bookDiaryResult,
          moviesResult,
          movieDiaryResult,
          achievementsResult,
        ] = await Promise.all([
          supabase.from("profiles").select("id,name,bio,avatar_url").eq("id", userId).maybeSingle(),
          supabase.from("profile_canvas_items").select("items").eq("user_id", userId).maybeSingle(),
          supabase.from("books").select("id,title,author").eq("user_id", userId),
          supabase.from("book_diary_entries").select("id,book_id,read_on,rating,review,reread,created_at").eq("user_id", userId),
          supabase.from("movies").select("id,title,director").eq("user_id", userId),
          supabase.from("movie_diary_entries").select("id,movie_id,watched_on,rating,review,rewatch,created_at").eq("user_id", userId),
          supabase.from("diary_achievements").select("badges").eq("user_id", userId).maybeSingle(),
        ]);

        if (!isActive) {
          return;
        }

        if (profileResult.error) {
          throw profileResult.error;
        }
        if (canvasResult.error && (canvasResult.error as { code?: string }).code !== "42P01") {
          throw canvasResult.error;
        }
        if (booksResult.error) {
          throw booksResult.error;
        }
        if (bookDiaryResult.error) {
          throw bookDiaryResult.error;
        }
        if (moviesResult.error) {
          throw moviesResult.error;
        }
        if (movieDiaryResult.error) {
          throw movieDiaryResult.error;
        }

        const profileRow = profileResult.data as ProfileRow | null;
        if (!profileRow) {
          setError("Profile not found.");
          setLoading(false);
          return;
        }

        const mappedProfile: FollowableProfile = {
          id: profileRow.id,
          name: profileRow.name || "Reader",
          bio: profileRow.bio || "No bio yet.",
          avatarUrl: profileRow.avatar_url || "",
        };
        setProfile(mappedProfile);

        const canvasRaw = (canvasResult.data as { items?: unknown } | null)?.items;
        const mappedCanvas = Array.isArray(canvasRaw)
          ? canvasRaw
              .map((entry) => normalizeCanvasItem(entry))
              .filter((entry): entry is CanvasItem => entry !== null)
              .sort((a, b) => b.zIndex - a.zIndex)
          : [];
        setCanvasItems(mappedCanvas);

        if (achievementsResult.error) {
          const code = (achievementsResult.error as { code?: string }).code;
          if (code !== "42501" && code !== "42P01") {
            console.warn("Failed to load achievements", achievementsResult.error.message);
          }
          setPublicBadges([]);
          setAchievementsReady(true);
        } else {
          const badgesRaw = (achievementsResult.data as AchievementsRow | null)?.badges;
          setPublicBadges(normalizeBadgePayload(badgesRaw));
          setAchievementsReady(true);
        }

        const booksById = new Map<string, BooksRow>();
        ((booksResult.data ?? []) as BooksRow[]).forEach((book) => booksById.set(book.id, book));

        const moviesById = new Map<string, MoviesRow>();
        ((moviesResult.data ?? []) as MoviesRow[]).forEach((movie) => moviesById.set(movie.id, movie));

        const mergedDiary: DiaryItem[] = [];

        ((bookDiaryResult.data ?? []) as BookDiaryRow[]).forEach((entry) => {
          const book = booksById.get(entry.book_id);
          if (!book) {
            return;
          }

          mergedDiary.push({
            id: `book-${entry.id}`,
            mediaType: "book",
            title: book.title || "Untitled Book",
            creator: book.author || "Unknown Author",
            date: entry.read_on,
            createdAt: entry.created_at,
            rating: entry.rating ?? 0,
            review: entry.review ?? "",
            isRevisit: Boolean(entry.reread),
          });
        });

        ((movieDiaryResult.data ?? []) as MovieDiaryRow[]).forEach((entry) => {
          const movie = moviesById.get(entry.movie_id);
          if (!movie) {
            return;
          }

          mergedDiary.push({
            id: `movie-${entry.id}`,
            mediaType: "movie",
            title: movie.title || "Untitled Movie",
            creator: movie.director || "Unknown Director",
            date: entry.watched_on,
            createdAt: entry.created_at,
            rating: entry.rating ?? 0,
            review: entry.review ?? "",
            isRevisit: Boolean(entry.rewatch),
          });
        });

        mergedDiary.sort((a, b) => {
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) {
            return dateCompare;
          }
          return b.createdAt.localeCompare(a.createdAt);
        });

        setDiaryEntries(mergedDiary);
      } catch (loadError) {
        const message = (loadError as { message?: string } | null)?.message ?? "Failed to load profile.";
        setError(message);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadPublicProfile();

    return () => {
      isActive = false;
    };
  }, [userId]);

  const filteredDiaryEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return diaryEntries;
    }

    return diaryEntries.filter((entry) => {
      return (
        entry.title.toLowerCase().includes(query) ||
        entry.creator.toLowerCase().includes(query) ||
        entry.review.toLowerCase().includes(query)
      );
    });
  }, [diaryEntries, search]);

  const publicUnlockedCount = useMemo(
    () => publicBadges.filter((badge) => badge.unlocked).length,
    [publicBadges]
  );

  const isOwnProfile = Boolean(currentUserId && userId && currentUserId === userId);
  const isFollowing = Boolean(userId && followingIds.includes(userId));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to My Profile
          </button>

          {!isOwnProfile && userId && (
            <button
              type="button"
              onClick={() => void toggleFollow(userId)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                isFollowing
                  ? "border-border bg-background text-muted-foreground hover:text-foreground"
                  : "border-foreground bg-foreground text-background hover:opacity-90"
              }`}
            >
              {isFollowing ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}
        </div>

        {loading ? (
          <div className="rounded-lg border border-border bg-card/40 p-8 text-sm text-muted-foreground">Loading profile...</div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-8 text-sm text-destructive">{error}</div>
        ) : profile ? (
          <div className="space-y-10">
            <section className="rounded-xl border border-border bg-card/50 p-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-full border border-border bg-muted">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={`${profile.name}'s avatar`} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-serif text-2xl">{profile.name.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h1 className="font-serif text-3xl">{profile.name}</h1>
                  <p className="text-sm text-muted-foreground">{profile.bio}</p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl">Canvas</h2>
                <p className="text-xs text-muted-foreground">{canvasItems.length} items</p>
              </div>

              <div
                className="relative w-screen left-1/2 right-1/2 -ml-[50vw] overflow-visible bg-[#dbdbdb] dark:bg-muted/10"
                style={{ minHeight: CANVAS_HEIGHT }}
              >
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(circle, #000 1.5px, transparent 1.5px)",
                    backgroundSize: "40px 40px",
                  }}
                />

                {canvasItems.length === 0 ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-stone-400 font-serif italic">
                    The desk is empty. No canvas items yet.
                  </div>
                ) : (
                  canvasItems.map((item) => (
                    <div
                      key={`${item.kind}-${item.id}-${item.zIndex}`}
                      className="absolute"
                      style={{
                        zIndex: item.zIndex,
                        width: `${item.baseWidth * item.scale}px`,
                        transform: `translate(${item.initialX}px, ${item.initialY}px) rotate(${item.rotation}deg) scale(${item.scale})`,
                        transformOrigin: "top left",
                      }}
                    >
                      {item.kind === "book" || item.kind === "movie" ? (
                        <div className="overflow-hidden rounded-sm border border-border bg-card shadow-md">
                          {item.coverUrl ? (
                            <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex min-h-[220px] items-center justify-center p-2 text-center font-serif text-xs">
                              {item.title}
                            </div>
                          )}
                        </div>
                      ) : item.kind === "song" ? (
                        <div className="relative overflow-hidden rounded-md border border-border bg-card shadow-md">
                          {item.coverUrl ? (
                            <img src={item.coverUrl} alt={item.title} className="aspect-square w-full object-cover" />
                          ) : (
                            <div className="flex aspect-square w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                              Song
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-8 text-left text-white">
                            <p className="truncate text-xs font-medium">{item.title}</p>
                          </div>
                        </div>
                      ) : item.kind === "sticky-note" ? (
                        <div className="relative h-[190px] w-full rounded-sm border border-amber-200 bg-[#f7e58d] p-3 shadow-[0_18px_35px_rgba(120,90,30,0.2)]">
                          <span className="pointer-events-none absolute right-3 top-2 text-[10px] uppercase tracking-[0.18em] text-amber-700/60">
                            Note
                          </span>
                          <p className="h-full w-full whitespace-pre-wrap font-serif text-sm leading-6 text-stone-700">
                            {item.text || item.title}
                          </p>
                        </div>
                      ) : item.kind === "ambient-quote" ? (
                        <div className="w-full rounded-md border border-stone-300/60 bg-white/75 px-6 py-5 shadow-[0_16px_34px_rgba(20,20,20,0.12)]">
                          <p className="w-full text-center font-serif text-3xl italic leading-tight text-stone-700">
                            {item.text || item.title}
                          </p>
                        </div>
                      ) : item.kind === "washi-tape" ? (
                        <div className="flex h-[42px] w-full items-center justify-center">
                          <img
                            src={item.coverUrl ?? (item.decorVariant && item.decorVariant !== "paperclip" ? TAPE_ARTWORK[item.decorVariant] : TAPE_ARTWORK.honey)}
                            alt="Washi tape"
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
                  ))
                )}
              </div>
            </section>

            <section className="public-achievements space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl">Achievements</h2>
                {(isFollowing || isOwnProfile) && (
                  <p className="text-xs text-muted-foreground">{publicUnlockedCount} unlocked</p>
                )}
              </div>

              {isFollowing || isOwnProfile ? (
                achievementsReady ? (
                  publicBadges.length > 0 ? (
                    <div className="achievements-view">
                      <header className="achievements-header">
                        <div>
                          <div className="achievements-title">Achievement Cabinet</div>
                          <div className="achievements-subtitle">Shared from their diary archive.</div>
                        </div>
                        <div className="achievements-count">
                          <span className="achievements-count-num">{publicUnlockedCount}</span>
                          <span className="achievements-count-total">/ {publicBadges.length}</span>
                          <span className="achievements-count-label">Unlocked</span>
                        </div>
                      </header>

                      <div className="achievements-grid">
                        {publicBadges.map((badge) => {
                          const isLocked = !badge.unlocked;
                          const isHidden = Boolean(badge.hidden && !badge.unlocked);
                          const BadgeIcon = badge.Icon;
                          const progressText = isHidden ? "???" : badge.progress;
                          return (
                            <div key={badge.id} className={`badge-card ${isLocked ? "locked" : ""}`} data-tone={badge.tone}>
                              <div className="badge-icon">
                                <BadgeIcon size={20} />
                              </div>
                              <div className="badge-body">
                                <div className="badge-name">{isHidden ? "Hidden Badge" : badge.name}</div>
                                <div className="badge-desc">
                                  {isHidden ? "Keep journaling to reveal this one." : badge.description}
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
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border py-10 text-center">
                      <p className="font-serif italic text-muted-foreground">
                        {isOwnProfile
                          ? "Achievements will appear here after they open the Diary once."
                          : "This cabinet hasn't been shared yet."}
                      </p>
                    </div>
                  )
                ) : (
                  <div className="rounded-lg border border-border bg-card/40 p-8 text-sm text-muted-foreground">
                    Loading achievements...
                  </div>
                )
              ) : (
                <div className="rounded-lg border border-dashed border-border py-10 text-center">
                  <p className="font-serif italic text-muted-foreground">Follow to view their achievement cabinet.</p>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-serif text-2xl">Diary</h2>
                <p className="text-xs text-muted-foreground">{filteredDiaryEntries.length} entries</p>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search diary entries..."
                  className="w-full rounded-lg border border-border bg-background/70 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              {filteredDiaryEntries.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-12 text-center">
                  <p className="font-serif italic text-muted-foreground">No diary entries to show.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDiaryEntries.map((entry) => (
                    <article key={entry.id} className="rounded border border-border bg-card/50 p-5">
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        {entry.mediaType === "book" ? (
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
                            <span>{entry.mediaType === "book" ? "Reread" : "Rewatch"}</span>
                          </>
                        )}
                      </div>

                      <h3 className="font-serif text-xl leading-tight">{entry.title}</h3>
                      <p className="mb-3 text-xs uppercase tracking-[0.12em] text-muted-foreground">{entry.creator}</p>

                      <div className="mb-3 flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3.5 w-3.5 ${
                              star <= entry.rating ? "fill-primary text-primary" : "fill-transparent text-border"
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
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
