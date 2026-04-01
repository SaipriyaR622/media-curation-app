import { useCallback, useEffect, useRef, useState } from 'react';

const PRESETS = [
  { label: '25 / 5', focus: 25, rest: 5 },
  { label: '50 / 10', focus: 50, rest: 10 },
  { label: '15 / 3', focus: 15, rest: 3 },
];

const CHALLENGES = [
  { q: 'What is 17 x 4?', a: '68' },
  { q: 'Spell the word: necessary', a: 'necessary' },
  { q: 'What is 144 / 12?', a: '12' },
  { q: 'What is 23 + 49?', a: '72' },
  { q: 'How many sides does a hexagon have?', a: '6' },
  { q: 'What is 8^2?', a: '64' },
  { q: 'Spell the word: rhythm', a: 'rhythm' },
  { q: 'What is 15% of 200?', a: '30' },
  { q: 'What is 7 x 8?', a: '56' },
  { q: 'Spell the word: occurrence', a: 'occurrence' },
];

type Phase = 'focus' | 'rest';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function fmt(s: number) {
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function Particles({ phase }: { phase: Phase }) {
  const color = phase === 'rest' ? '#7aa0c4' : '#6aaa6a';
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {Array.from({ length: 18 }, (_, i) => {
        const size = 1 + (i % 4) * 0.8;
        const left = `${(i * 53 + 7) % 100}%`;
        const delay = `${(i * 0.37) % 6}s`;
        const dur = `${8 + (i % 5) * 2}s`;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left,
              bottom: '-10px',
              width: size,
              height: size,
              borderRadius: '50%',
              background: color,
              opacity: 0.15 + (i % 3) * 0.08,
              animation: `fm-float-up ${dur} ${delay} infinite linear`,
            }}
          />
        );
      })}
    </div>
  );
}

function ProgressRing({ pct, phase, seconds }: { pct: number; phase: Phase; seconds: number }) {
  const r = 110;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - pct);
  const color = phase === 'rest' ? '#7aa0c4' : '#6aaa6a';
  const dimColor = phase === 'rest' ? 'rgba(122,160,196,0.1)' : 'rgba(106,170,106,0.1)';

  return (
    <div style={{ position: 'relative', width: 280, height: 280 }}>
      <svg width="280" height="280" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="140" cy="140" r={r} fill="none" stroke={dimColor} strokeWidth="1.5" />
        <circle
          cx="140"
          cy="140"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray={circ}
          strokeDashoffset={dash}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <span
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 64,
            fontWeight: 400,
            color: '#eae6de',
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}
        >
          {fmt(seconds)}
        </span>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color,
            opacity: 0.7,
          }}
        >
          {phase === 'rest' ? 'rest' : 'focus'}
        </span>
      </div>
    </div>
  );
}

function ExitChallenge({ onSolve, onCancel }: { onSolve: () => void; onCancel: () => void }) {
  const [challenge] = useState(() => pick(CHALLENGES));
  const [val, setVal] = useState('');
  const [wrong, setWrong] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    if (val.trim().toLowerCase() === challenge.a.toLowerCase()) {
      onSolve();
    } else {
      setWrong(true);
      setShake(true);
      setVal('');
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(7,9,10,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          width: 420,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(14,18,14,0.95)',
          padding: '40px 44px',
          animation: shake ? 'fm-shake 0.4s ease' : 'fm-fade-up 0.3s ease',
        }}
      >
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)',
            marginBottom: 28,
          }}
        >
          To exit focus mode, solve this:
        </p>
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: 'italic',
            fontSize: 26,
            color: '#eae6de',
            marginBottom: 28,
            lineHeight: 1.3,
          }}
        >
          {challenge.q}
        </p>
        <input
          ref={inputRef}
          value={val}
          onChange={(e) => {
            setVal(e.target.value);
            setWrong(false);
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="your answer..."
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderBottom: `1px solid ${wrong ? '#c47878' : 'rgba(255,255,255,0.2)'}`,
            color: wrong ? '#c47878' : '#eae6de',
            fontFamily: "'DM Mono', monospace",
            fontSize: 18,
            padding: '8px 0',
            outline: 'none',
            letterSpacing: '0.05em',
            marginBottom: 8,
          }}
        />
        {wrong && (
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              letterSpacing: '0.15em',
              color: '#c47878',
              marginBottom: 24,
              textTransform: 'uppercase',
            }}
          >
            Not quite - try again
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          <button
            onClick={submit}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9.5,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              padding: '10px 24px',
              background: 'transparent',
              border: '1px solid rgba(106,170,106,0.5)',
              color: '#6aaa6a',
              cursor: 'pointer',
            }}
          >
            Submit
          </button>
          <button
            onClick={onCancel}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9.5,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              padding: '10px 24px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
            }}
          >
            Stay
          </button>
        </div>
      </div>
    </div>
  );
}

export function FocusMode() {
  const [preset, setPreset] = useState(0);
  const [phase, setPhase] = useState<Phase>('focus');
  const [seconds, setSeconds] = useState(PRESETS[0].focus * 60);
  const [running, setRunning] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [showExit, setShowExit] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const exitApprovedRef = useRef(false);
  const showExitRef = useRef(false);

  const totalSecs = phase === 'focus' ? PRESETS[preset].focus * 60 : PRESETS[preset].rest * 60;
  const pct = totalSecs === 0 ? 0 : seconds / totalSecs;

  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          if (tickRef.current) clearInterval(tickRef.current);
          setRunning(false);
          setJustDone(true);
          if (phase === 'focus') setSessions((n) => n + 1);
          setPhase((p) => (p === 'focus' ? 'rest' : 'focus'));
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [running, phase]);

  useEffect(() => {
    setSeconds(phase === 'focus' ? PRESETS[preset].focus * 60 : PRESETS[preset].rest * 60);
    setJustDone(false);
  }, [phase, preset]);

  const enterFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      await containerRef.current.requestFullscreen();
      setRunning(true);
    } catch {
      // no-op
    }
  }, []);

  const stopSession = useCallback(() => {
    setRunning(false);
    setPhase('focus');
    setSeconds(PRESETS[preset].focus * 60);
    setJustDone(false);
  }, [preset]);

  useEffect(() => {
    showExitRef.current = showExit;
  }, [showExit]);

  useEffect(() => {
    const onFSChange = () => {
      const isFullscreen = Boolean(document.fullscreenElement);
      setFullscreen(isFullscreen);
      if (!isFullscreen) {
        if (exitApprovedRef.current) {
          exitApprovedRef.current = false;
          stopSession();
        } else if (!showExitRef.current) {
          setRunning(false);
          setShowExit(true);
        }
      }
    };
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, [stopSession]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!showExitRef.current) {
          setRunning(false);
          setShowExit(true);
        }
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [fullscreen]);

  const beginExit = useCallback(() => {
    setRunning(false);
    setShowExit(true);
  }, []);

  const handleSolve = useCallback(async () => {
    exitApprovedRef.current = true;
    setShowExit(false);
    try {
      await document.exitFullscreen();
    } catch {
      // no-op
    }
    if (!document.fullscreenElement) {
      stopSession();
    }
  }, [stopSession]);

  const handleStay = useCallback(async () => {
    setShowExit(false);
    if (document.fullscreenElement) {
      setRunning(true);
      return;
    }
    await enterFullscreen();
  }, [enterFullscreen]);

  const reset = () => {
    setSeconds(phase === 'focus' ? PRESETS[preset].focus * 60 : PRESETS[preset].rest * 60);
    setJustDone(false);
  };

  const accent = phase === 'rest' ? '#7aa0c4' : '#6aaa6a';
  const accentDim = phase === 'rest' ? 'rgba(122,160,196,0.2)' : 'rgba(106,170,106,0.2)';

  return (
    <>
      <style>{`
        @keyframes fm-float-up { from { transform: translateY(0); opacity: 0.2; } to { transform: translateY(-100vh); opacity: 0; } }
        @keyframes fm-fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fm-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
        @keyframes fm-phase-pulse { 0%,100%{opacity:0.4} 50%{opacity:0.9} }
        @keyframes fm-ring-appear { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
      `}</style>
      <div
        ref={containerRef}
        style={{
          position: fullscreen ? 'fixed' : 'relative',
          inset: fullscreen ? 0 : undefined,
          width: fullscreen ? undefined : '100%',
          minHeight: fullscreen ? undefined : 'calc(100vh - 180px)',
          background: fullscreen ? (phase === 'rest' ? '#060a0e' : '#070a07') : '#07090a',
          display: 'flex',
          flexDirection: fullscreen ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: fullscreen ? 'hidden' : 'visible',
          userSelect: fullscreen ? 'none' : 'auto',
          fontFamily: "'DM Mono', monospace",
          marginBottom: fullscreen ? 0 : '2rem',
          zIndex: fullscreen ? 60 : 'auto',
        }}
      >
        {!fullscreen && (
          <div
            style={{
              width: 480,
              maxWidth: 'calc(100% - 2rem)',
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(12,16,12,0.9)',
              padding: '44px 48px',
              animation: 'fm-fade-up 0.5s ease both',
            }}
          >
            <div style={{ display: 'flex', gap: 8, marginBottom: 40, flexWrap: 'wrap' }}>
              {PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setPreset(i);
                    setRunning(false);
                    setPhase('focus');
                  }}
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 9,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    padding: '7px 14px',
                    background: preset === i ? accentDim : 'transparent',
                    border: `1px solid ${preset === i ? accent : 'rgba(255,255,255,0.12)'}`,
                    color: preset === i ? accent : 'rgba(255,255,255,0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <p
              style={{
                fontSize: 9,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.25)',
                marginBottom: 10,
              }}
            >
              {phase === 'focus' ? 'Focus Session' : 'Rest'}
            </p>

            <p
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 80,
                fontWeight: 400,
                color: '#eae6de',
                letterSpacing: '-0.04em',
                lineHeight: 1,
                marginBottom: 32,
              }}
            >
              {fmt(seconds)}
            </p>

            <div style={{ display: 'flex', gap: 10, marginBottom: 32, flexWrap: 'wrap' }}>
              <button
                onClick={enterFullscreen}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9.5,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  padding: '10px 24px',
                  background: accentDim,
                  border: `1px solid ${accent}`,
                  color: accent,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                Enter Focus
              </button>
              <button
                onClick={reset}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9.5,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  padding: '10px 24px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            </div>

            <p
              style={{
                fontSize: 9,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.15)',
              }}
            >
              {sessions} completed - preset {PRESETS[preset].label}
            </p>
          </div>
        )}

        {fullscreen && (
          <>
            <Particles phase={phase} />
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '24px 36px',
                zIndex: 5,
              }}
            >
              <div>
                <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 15, color: 'rgba(255,255,255,0.35)' }}>
                  Fragments
                </span>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 9,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.15)',
                    marginLeft: 16,
                  }}
                >
                  Focus Mode
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 9,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.2)',
                  }}
                >
                  {sessions} {sessions === 1 ? 'session' : 'sessions'} - {PRESETS[preset].label}
                </span>
                <button
                  onClick={beginExit}
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 9,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.25)',
                    padding: '7px 16px',
                    cursor: 'pointer',
                  }}
                >
                  Exit Focus
                </button>
              </div>
            </div>

            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                letterSpacing: '0.35em',
                textTransform: 'uppercase',
                color: accent,
                opacity: 0.6,
                marginBottom: 40,
                animation: justDone ? 'fm-phase-pulse 1.5s ease 3' : 'none',
              }}
            >
              {phase === 'focus' ? 'focus session' : 'rest - breathe'}
            </div>

            <div style={{ animation: 'fm-ring-appear 0.5s ease both' }}>
              <ProgressRing pct={pct} phase={phase} seconds={seconds} />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 48, animation: 'fm-fade-up 0.6s ease 0.2s both' }}>
              <button
                onClick={() => setRunning((r) => !r)}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9.5,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  padding: '11px 28px',
                  background: accentDim,
                  border: `1px solid ${accent}`,
                  color: accent,
                  cursor: 'pointer',
                  minWidth: 120,
                }}
              >
                {running ? 'Pause' : 'Resume'}
              </button>
              <button
                onClick={reset}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9.5,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  padding: '11px 24px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.25)',
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
              <button
                onClick={() => setPhase((p) => (p === 'focus' ? 'rest' : 'focus'))}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9.5,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  padding: '11px 24px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.25)',
                  cursor: 'pointer',
                }}
              >
                Skip
              </button>
            </div>

            <p
              style={{
                position: 'absolute',
                bottom: 36,
                fontFamily: "'Playfair Display', serif",
                fontStyle: 'italic',
                fontSize: 13,
                color: 'rgba(255,255,255,0.12)',
                letterSpacing: '0.02em',
                textAlign: 'center',
                maxWidth: 400,
                animation: 'fm-fade-up 0.8s ease 0.4s both',
              }}
            >
              {phase === 'rest' ? "Close your eyes. You've earned this." : 'Deep work is the superpower of the 21st century.'}
            </p>
          </>
        )}

        {showExit && <ExitChallenge onSolve={handleSolve} onCancel={handleStay} />}
      </div>
    </>
  );
}
