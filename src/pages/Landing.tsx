import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export default function Landing() {
  const navigate = useNavigate();
  const [isEntering, setIsEntering] = useState(false);
  const containerRef = useRef(null);

  // 1. MOUSE FOLLOW LOGIC
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 30, stiffness: 200 };
  const x = useSpring(useTransform(mouseX, [-1000, 1000], [-20, 20]), springConfig);
  const y = useSpring(useTransform(mouseY, [-1000, 1000], [-20, 20]), springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const moveX = clientX - window.innerWidth / 2;
    const moveY = clientY - window.innerHeight / 2;
    mouseX.set(moveX);
    mouseY.set(moveY);
  };

  const playClickSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    audio.volume = 0.15;
    audio.play().catch(() => {});
  };

  const handleEnter = () => {
    playClickSound();
    setIsEntering(true);
    setTimeout(() => navigate('/Login'), 800);
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      // Changed 'cursor-none' to 'cursor-default' to bring back your normal mouse
      className="relative min-h-screen w-full bg-[#eceae6] flex flex-col items-center justify-center overflow-hidden cursor-default"
    >
      {/* THE CUSTOM CURSOR DIV HAS BEEN REMOVED FROM HERE */}

      <motion.div 
        animate={isEntering ? { scale: 1.8, opacity: 0, filter: "blur(40px)" } : { scale: 1, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.7, 0, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center justify-center w-full"
      >
        <div className="absolute inset-0 pointer-events-none select-none">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] border border-stone-400/10 rounded-full" 
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
            <p className="text-[10px] uppercase tracking-[0.5em] text-stone-400 font-bold mb-4">
              Digital Archive / Vol. 01
            </p>
            <h1 className="font-serif text-7xl md:text-9xl font-medium tracking-tighter text-stone-900 leading-none">
              Fragments
            </h1>
            <div className="h-px w-12 bg-stone-400 my-8 opacity-50" />
            <p className="font-serif italic text-xl text-stone-500 mb-16">
              Curate what moves you.
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
                className="absolute inset-0 rounded-full border border-stone-400/50"
              />
              <div className="h-14 w-14 rounded-full border border-stone-900 flex items-center justify-center group-hover:bg-stone-900 transition-all duration-500">
                <motion.div 
                  variants={{ hover: { x: 4, color: "#fff" } }}
                  className="text-stone-900"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.div>
              </div>
            </div>
            <span className="text-[11px] uppercase tracking-[0.3em] text-stone-400 font-bold group-hover:text-stone-900 transition-colors duration-500">
              Open Archive
            </span>
          </motion.button>
        </div>
      </motion.div>

      <div className="absolute bottom-10 w-full px-10 flex justify-between items-end pointer-events-none z-20">
        <div className="text-[9px] text-stone-400 font-mono space-y-1">
          <p className="tracking-widest underline underline-offset-2">34.0522° N, 118.2437° W</p>
          <p className="opacity-60 uppercase tracking-tighter">© 2026 Archive — Curatorial System</p>
        </div>
        <div className="hidden md:block h-[1px] w-32 bg-stone-300/50" />
      </div>

      <div className="pointer-events-none fixed inset-0 opacity-[0.03] contrast-150 brightness-110 z-50" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
    </div>
  );
}