// src/components/ScrapbookItem.tsx
import { motion } from 'framer-motion';
import { useState } from 'react';

interface ScrapbookItemProps {
  children: React.ReactNode;
  defaultPos?: { x: number; y: number };
}

export function ScrapbookItem({ children, defaultPos = { x: 50, y: 50 } }: ScrapbookItemProps) {
  // We use a state that persists so the "last touched" item stays on top
  const [zIndex, setZIndex] = useState(Math.floor(Math.random() * 100));

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ 
        x: defaultPos.x, 
        y: defaultPos.y, 
        // Increased rotation range for that "tossed on a desk" look
        rotate: Math.random() * 20 - 10 
      }}
      // Bring to absolute front when grabbed
      onDragStart={() => setZIndex(1000)} 
      className="absolute cursor-grab active:cursor-grabbing select-none"
      style={{ zIndex }}
      // subtle hover effect that doesn't "snap" too hard
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="relative group">
        {/* Removed p-2 and bg-white so the media itself is the object */}
        <div className="drop-shadow-xl transition-shadow duration-300 group-hover:drop-shadow-2xl">
          {children}
        </div>
        
        {/* Semi-transparent Tape: Only shows up on hover like a hidden detail */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-5 bg-white/20 backdrop-blur-[1px] border border-white/10 -rotate-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>
    </motion.div>
  );
}