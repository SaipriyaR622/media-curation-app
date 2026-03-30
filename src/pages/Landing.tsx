import { useState, useRef, useEffect, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const PHRASES = [
  'Curate what moves you.',
  'Archive what stays with you.',
  'Remember what shaped you.',
  'Collect what defines you.',
];

function useTypewriter(phrases: string[], typingSpeed = 60, deletingSpeed = 30, pauseDuration = 2000) {
  const [displayed, setDisplayed] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIndex];

    if (!isDeleting && displayed === current) {
      const pause = setTimeout(() => setIsDeleting(true), pauseDuration);
      return () => clearTimeout(pause);
    }

    if (isDeleting && displayed === '') {
      setIsDeleting(false);
      setPhraseIndex((i) => (i + 1) % phrases.length);
      return;
    }

    const timeout = setTimeout(() => {
      setDisplayed(isDeleting
        ? current.slice(0, displayed.length - 1)
        : current.slice(0, displayed.length + 1)
      );
    }, isDeleting ? deletingSpeed : typingSpeed);

    return () => clearTimeout(timeout);
  }, [displayed, isDeleting, phraseIndex, phrases, typingSpeed, deletingSpeed, pauseDuration]);

  return displayed;
}

export default function Landing() {
  const navigate = useNavigate();
  const [isEntering, setIsEntering] = useState(false);
  const containerRef = useRef(null);
  const text = useTypewriter(PHRASES);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 30, stiffness: 200 };
  const x = useSpring(useTransform(mouseX, [-1000, 1000], [-20, 20]), springConfig);
  const y = useSpring(useTransform(mouseY, [-1000, 1000], [-20, 20]), springConfig);

  const handleMouseMove = (e: MouseEvent) => {
    const { clientX, clientY } = e;
    mouseX.set(clientX - window.innerWidth / 2);
    mouseY.set(clientY - window.innerHeight / 2);
  };

  const playClickSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    audio.volume = 0.15;
    audio.play().catch(() => {});
  };

  const handleEnter = () => {
    playClickSound();
    setIsEntering(true);
    setTimeout(() => navigate('/login'), 800);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative min-h-screen w-full bg-background text-foreground flex flex-col items-center justify-center overflow-hidden cursor-default"
    >
      <motion.div
        animate={isEntering ? { scale: 1.8, opacity: 0, filter: "blur(40px)" } : { scale: 1, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.7, 0, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center justify-center w-full"
      >
        <div className="absolute inset-0 pointer-events-none select-none">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] border border-border/30 rounded-full"
          />
        </div>

        <div className="flex flex-col items-center text-center px-6">
          <motion.div
            style={{ x, y }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center"
          >
            <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground font-bold mb-4">
              Digital Archive / Vol. 01
            </p>
            <h1 className="font-serif text-7xl md:text-9xl font-medium tracking-tighter text-foreground leading-none">
              Fragments
            </h1>
            <div className="h-px w-12 bg-border my-8 opacity-50" />

            {/* Typewriter */}
            <p className="font-serif italic text-xl text-muted-foreground mb-16 h-8 flex items-center justify-center">
              {text}
              <span className="ml-[2px] inline-block w-[1.5px] h-5 bg-muted-foreground animate-pulse" />
            </p>
          </motion.div>

          <motion.button
            onClick={handleEnter}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            whileHover="hover"
            className="relative flex flex-col items-center justify-center focus:outline-none group cursor-pointer"
          >
            <div className="relative h-24 w-24 flex items-center justify-center mb-4">
              <motion.div
                variants={{ hover: { scale: 1.4, opacity: 0 } }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 rounded-full border border-border/60"
              />
              <div className="h-14 w-14 rounded-full border border-foreground flex items-center justify-center group-hover:bg-foreground transition-all duration-500">
                <motion.div
                  variants={{ hover: { x: 4, color: "hsl(var(--background))" } }}
                  className="text-foreground"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.div>
              </div>
            </div>
            <span className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-bold group-hover:text-foreground transition-colors duration-500">
              Open Archive
            </span>
          </motion.button>
        </div>
      </motion.div>

      <div className="absolute bottom-10 w-full px-10 flex justify-between items-end pointer-events-none z-20">
        <div className="text-[9px] text-muted-foreground font-mono space-y-1">
          <p className="tracking-widest underline underline-offset-2">34.0522° N, 118.2437° W</p>
          <p className="opacity-60 uppercase tracking-tighter">© 2026 Archive — Curatorial System</p>
        </div>
        <div className="hidden md:block h-[1px] w-32 bg-border/50" />
      </div>

      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03] contrast-150 brightness-110 z-50"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />
    </div>
  );
}
