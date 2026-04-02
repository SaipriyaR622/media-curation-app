import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Languages,
  Loader2,
  Music2,
  ToggleLeft,
  ToggleRight,
  Trophy,
} from 'lucide-react';
import {
  detectScriptLabel,
  generateQuiz,
  detectLanguage, 
  isLatinScript, 
  needsTranscription,
  needsTranslation,
  romanizeLines,
  translateLines,
  type DetectedLanguage,
  type QuizQuestion,
  type MultipleChoiceQuestion,
  type WordMatchQuestion,
} from '@/lib/languageUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------



// in LyricsDrawer.tsx
interface LyricsData {
  lines: string[];
  language: DetectedLanguage;
  isLatinScript: boolean;
  source: 'genius' | 'musixmatch' | 'youtube' | null;  
}
type Tab = 'lyrics' | 'transcription' | 'translation' | 'quiz';

interface TabState {
  lyrics: boolean;
  transcription: boolean;
  translation: boolean;
  quiz: boolean;
}

interface LyricsDrawerProps {
  songId: string;
  title: string;
  artist: string;
}

// ---------------------------------------------------------------------------
// Small sub-components
// ---------------------------------------------------------------------------

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="mt-3 space-y-1">
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-foreground/40 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground text-right">
        {value} / {total} lines
      </p>
    </div>
  );
}

function TabToggle({
  label,
  icon,
  enabled,
  disabled,
  onToggle,
}: {
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        enabled
          ? 'border-foreground text-foreground bg-foreground/5'
          : 'border-border text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {label}
      {enabled ? (
        <ToggleRight className="h-3.5 w-3.5 ml-1" />
      ) : (
        <ToggleLeft className="h-3.5 w-3.5 ml-1" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Multiple choice quiz
// ---------------------------------------------------------------------------

function MultipleChoiceQuiz({ question }: { question: MultipleChoiceQuestion }) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;

  return (
    <div className="rounded border border-border/50 bg-background/20 p-4 space-y-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        Multiple choice
      </p>
      <p className="font-serif text-base leading-snug">{question.originalLine}</p>
      <div className="space-y-2">
        {question.options.map((opt, i) => {
          const isCorrect = i === question.correctIndex;
          const isSelected = selected === i;
          let cls = 'w-full text-left rounded border px-3 py-2 text-xs transition-colors ';
          if (!answered) {
            cls += 'border-border/60 text-muted-foreground hover:border-foreground hover:text-foreground';
          } else if (isCorrect) {
            cls += 'border-green-500/60 bg-green-500/10 text-green-400';
          } else if (isSelected) {
            cls += 'border-red-500/60 bg-red-500/10 text-red-400';
          } else {
            cls += 'border-border/30 text-muted-foreground/50';
          }
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => setSelected(i)}
              className={cls}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {answered && (
        <p className="text-[11px] text-muted-foreground">
          {selected === question.correctIndex
            ? '✓ Correct!'
            : `✗ The correct answer was: ${question.options[question.correctIndex]}`}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Word match quiz
// ---------------------------------------------------------------------------

function WordMatchQuiz({ question }: { question: WordMatchQuestion }) {
  const [selected, setSelected] = useState<{ origIdx: number | null; transIdx: number | null }>({
    origIdx: null,
    transIdx: null,
  });
  const [matched, setMatched] = useState<Array<{ origIdx: number; transIdx: number; correct: boolean }>>([]);

  const shuffledTranslations = useRef(
    [...question.pairs.map((_, i) => i)].sort(() => Math.random() - 0.5)
  );

  const isOrigMatched = (i: number) => matched.some((m) => m.origIdx === i);
  const isTransMatched = (j: number) => matched.some((m) => m.transIdx === j);

  const handleOrigClick = (i: number) => {
    if (isOrigMatched(i)) return;
    setSelected((prev) => {
      const next = { ...prev, origIdx: prev.origIdx === i ? null : i };
      return tryMatch(next);
    });
  };

  const handleTransClick = (j: number) => {
    if (isTransMatched(j)) return;
    setSelected((prev) => {
      const next = { ...prev, transIdx: prev.transIdx === j ? null : j };
      return tryMatch(next);
    });
  };

  function tryMatch(sel: { origIdx: number | null; transIdx: number | null }) {
    if (sel.origIdx === null || sel.transIdx === null) return sel;
    const correct = sel.origIdx === shuffledTranslations.current[sel.transIdx];
    setMatched((prev) => [
      ...prev,
      { origIdx: sel.origIdx!, transIdx: sel.transIdx!, correct },
    ]);
    return { origIdx: null, transIdx: null };
  }

  const score = matched.filter((m) => m.correct).length;
  const done = matched.length === question.pairs.length;

  return (
    <div className="rounded border border-border/50 bg-background/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Word matching
        </p>
        {done && (
          <p className="text-[11px] text-muted-foreground">
            Score: {score}/{question.pairs.length}
          </p>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Match each line to its translation
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          {question.pairs.map((pair, i) => {
            const m = matched.find((x) => x.origIdx === i);
            const isSelected = selected.origIdx === i;
            let cls = 'rounded border px-2 py-2 text-xs leading-snug cursor-pointer transition-colors ';
            if (m) {
              cls += m.correct
                ? 'border-green-500/50 bg-green-500/10 text-green-400 cursor-default'
                : 'border-red-500/50 bg-red-500/10 text-red-400 cursor-default';
            } else if (isSelected) {
              cls += 'border-foreground text-foreground bg-foreground/5';
            } else {
              cls += 'border-border/60 text-muted-foreground hover:border-foreground hover:text-foreground';
            }
            return (
              <button key={i} type="button" onClick={() => handleOrigClick(i)} disabled={!!m} className={cls}>
                {pair.original}
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          {shuffledTranslations.current.map((origIdx, j) => {
            const m = matched.find((x) => x.transIdx === j);
            const isSelected = selected.transIdx === j;
            let cls = 'rounded border px-2 py-2 text-xs leading-snug cursor-pointer transition-colors ';
            if (m) {
              cls += m.correct
                ? 'border-green-500/50 bg-green-500/10 text-green-400 cursor-default'
                : 'border-red-500/50 bg-red-500/10 text-red-400 cursor-default';
            } else if (isSelected) {
              cls += 'border-foreground text-foreground bg-foreground/5';
            } else {
              cls += 'border-border/60 text-muted-foreground hover:border-foreground hover:text-foreground';
            }
            return (
              <button key={j} type="button" onClick={() => handleTransClick(j)} disabled={!!m} className={cls}>
                {question.pairs[origIdx].translated}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main LyricsDrawer
// ---------------------------------------------------------------------------

export default function LyricsDrawer({ songId, title, artist }: LyricsDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('lyrics');

  const [tabs, setTabs] = useState<TabState>({
    lyrics: true,
    transcription: false,
    translation: false,
    quiz: false,
  });

  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState<string | null>(null);

  const [transcription, setTranscription] = useState<string[] | null>(null);
  const [transcriptionLoading, setTranscriptionLoading] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState({ done: 0, total: 0 });

  const [translation, setTranslation] = useState<string[] | null>(null);
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationProgress, setTranslationProgress] = useState({ done: 0, total: 0 });

  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch lyrics
  // ---------------------------------------------------------------------------
  const fetchLyrics = useCallback(async () => {
    if (lyrics || lyricsLoading) return;
    setLyricsLoading(true);
    setLyricsError(null);
    try {
      const cleanTitle = title.replace(/\(.*?\)|\[.*?\]/g, '').trim();
      const cleanArtist = artist.split(',')[0].trim();
      const res = await fetch(
        `/api/lyrics?title=${encodeURIComponent(cleanTitle)}&artist=${encodeURIComponent(cleanArtist)}`
      );
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? 'Lyrics not found');
      }
      const data = (await res.json()) as LyricsData;
      const sampleText = data.lines.slice(0, 15).join(' ');
      const detectedLanguage = detectLanguage(sampleText);
      const correctedData = {
        ...data,
        language: detectedLanguage,
        isLatinScript: isLatinScript(sampleText),
      };

      setLyrics(correctedData);
    } catch (err) {
      setLyricsError(err instanceof Error ? err.message : 'Could not load lyrics');
    } finally {
      setLyricsLoading(false);
    }
  }, [artist, lyrics, lyricsLoading, title]);

  useEffect(() => {
    if (isOpen && !lyrics && !lyricsLoading) void fetchLyrics();
  }, [fetchLyrics, isOpen, lyrics, lyricsLoading]);

  // ---------------------------------------------------------------------------
  // Transcription (only for non-Latin scripts)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!tabs.transcription || !lyrics || transcription || transcriptionLoading) return;
    if (!needsTranscription(lyrics.language)) {
      setTranscription(null); // signal: not applicable
      return;
    }
    setTranscriptionLoading(true);
    setTranscriptionProgress({ done: 0, total: lyrics.lines.length });
    romanizeLines(lyrics.lines, lyrics.language, (done, total) =>
      setTranscriptionProgress({ done, total })
    )
      .then((lines) => setTranscription(lines))
      .catch(() => setTranscription(lyrics.lines))
      .finally(() => setTranscriptionLoading(false));
  }, [lyrics, tabs.transcription, transcription, transcriptionLoading]);

  // ---------------------------------------------------------------------------
  // Translation
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!tabs.translation || !lyrics || translation || translationLoading) return;
    if (!needsTranslation(lyrics.language)) {
      setTranslation(lyrics.lines);
      return;
    }
    setTranslationLoading(true);
    setTranslationProgress({ done: 0, total: lyrics.lines.length });
    translateLines(lyrics.lines, lyrics.language, (done, total) =>
      setTranslationProgress({ done, total })
    )
      .then((lines) => setTranslation(lines))
      .catch(() => setTranslation(lyrics.lines))
      .finally(() => setTranslationLoading(false));
  }, [lyrics, tabs.translation, translation, translationLoading]);

  // ---------------------------------------------------------------------------
  // Quiz
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!tabs.quiz || !lyrics || !translation || quiz) return;
    setQuiz(generateQuiz(lyrics.lines, translation));
  }, [lyrics, quiz, tabs.quiz, translation]);

  useEffect(() => {
    if (tabs.quiz && !tabs.translation) {
      setTabs((prev) => ({ ...prev, translation: true }));
    }
  }, [tabs.quiz, tabs.translation]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function toggleTab(tab: keyof TabState) {
    setTabs((prev) => ({ ...prev, [tab]: !prev[tab] }));
    if (!tabs[tab]) setActiveTab(tab);
  }

  const enabledTabs = (Object.keys(tabs) as Tab[]).filter((t) => tabs[t]);
  const canTranscribe = lyrics ? needsTranscription(lyrics.language) : true;
  const canTranslate = lyrics ? needsTranslation(lyrics.language) : true;
  const showQuizToggle = !!lyrics && lyrics.lines.length > 0;
  const scriptLabel = lyrics ? detectScriptLabel(lyrics.language) : '';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mt-3 border-t border-border/30 pt-3">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" />
          Learning Panel
        </span>
        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3">
          {/* Tab toggles */}
          <div className="flex flex-wrap gap-2">
            <TabToggle
              label="Lyrics"
              icon={<Music2 className="h-3 w-3" />}
              enabled={tabs.lyrics}
              onToggle={() => toggleTab('lyrics')}
            />
            <TabToggle
              label="Transcription"
              icon={<BookOpen className="h-3 w-3" />}
              enabled={tabs.transcription}
              disabled={!canTranscribe}
              onToggle={() => toggleTab('transcription')}
            />
            <TabToggle
              label="Translation"
              icon={<Languages className="h-3 w-3" />}
              enabled={tabs.translation}
              disabled={!canTranslate}
              onToggle={() => toggleTab('translation')}
            />
            {showQuizToggle && (
              <TabToggle
                label="Quiz"
                icon={<Trophy className="h-3 w-3" />}
                enabled={tabs.quiz}
                onToggle={() => toggleTab('quiz')}
              />
            )}
          </div>

          {/* Tab nav */}
          {enabledTabs.length > 1 && (
            <div className="flex gap-4 border-b border-border/30 pb-2 text-[11px] uppercase tracking-[0.16em]">
              {enabledTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`transition-colors pb-1 ${
                    activeTab === tab
                      ? 'text-foreground border-b border-foreground -mb-[9px]'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {/* Tab content */}
          <div className="max-h-72 overflow-y-auto pr-1 space-y-1 scrollbar-thin">

            {/* LYRICS */}
            {(activeTab === 'lyrics' || enabledTabs.length === 1) && tabs.lyrics && (
              <>
                {lyricsLoading && (
                  <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Fetching lyrics…
                  </div>
                )}
                {lyricsError && (
                  <p className="py-4 text-xs text-muted-foreground italic">{lyricsError}</p>
                )}
                {lyrics && (
                  <>
                    {(lyrics.source || scriptLabel) && (
                      <p className="text-[10px] text-muted-foreground/60 mb-2">
                        {lyrics.source && <>via {lyrics.source}</>}
                        {lyrics.source && scriptLabel && ' · '}
                        {scriptLabel}
                      </p>
                    )}
                    <div className="space-y-0.5">
                      {lyrics.lines.map((line, i) => (
                        <p key={i} className="text-sm leading-relaxed text-foreground/80">
                          {line}
                        </p>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* TRANSCRIPTION */}
            {activeTab === 'transcription' && tabs.transcription && (
              <>
                {transcriptionLoading && (
                  <div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Romanizing…
                    </div>
                    <ProgressBar value={transcriptionProgress.done} total={transcriptionProgress.total} />
                  </div>
                )}
                {transcription && lyrics && (
                  <div className="space-y-2">
                    {lyrics.lines.map((orig, i) => (
                      <div key={i} className="space-y-0.5">
                        <p className="text-[11px] text-muted-foreground">{orig}</p>
                        <p className="text-sm text-foreground/80 italic">{transcription[i]}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* TRANSLATION */}
            {activeTab === 'translation' && tabs.translation && (
              <>
                {translationLoading && (
                  <div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Translating…
                    </div>
                    <ProgressBar value={translationProgress.done} total={translationProgress.total} />
                  </div>
                )}
                {translation && lyrics && (
                  <div className="space-y-2">
                    {lyrics.lines.map((orig, i) => {
                      const trans = translation[i];
                      const untranslated = !trans || trans.trim().toLowerCase() === orig.trim().toLowerCase();
                      return (
                        <div key={i} className="space-y-0.5">
                          <p className="text-[11px] text-muted-foreground">{orig}</p>
                          {untranslated ? (
                            <p className="text-sm text-foreground/30 italic">— untranslatable —</p>
                          ) : (
                            <p className="text-sm text-foreground/80">{trans}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* QUIZ */}
            {activeTab === 'quiz' && tabs.quiz && (
              <>
                {!translation && (
                  <p className="text-xs text-muted-foreground py-4">
                    Translation in progress — quiz will be ready shortly…
                  </p>
                )}
                {translation && !quiz && (
                  <p className="text-xs text-muted-foreground py-4">Generating quiz…</p>
                )}
                {quiz && quiz.length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 italic">
                    Not enough lyrics to generate a quiz for this song.
                  </p>
                )}
                {quiz && quiz.length > 0 && (
                  <div className="space-y-4">
                    {quiz.map((q, i) =>
                      q.type === 'multiple-choice' ? (
                        <MultipleChoiceQuiz key={i} question={q} />
                      ) : (
                        <WordMatchQuiz key={i} question={q} />
                      )
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}