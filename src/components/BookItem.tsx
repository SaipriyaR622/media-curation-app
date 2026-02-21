// src/components/BookItem.tsx
import React from 'react';

interface BookProps {
  title: string;
  cover: string;
  pages: number;
  viewMode: 'grid' | 'spine'; // For the Spine View toggle
}

export const BookItem = ({ title, cover, pages, viewMode }: BookProps) => {
  // Logic: 100 pages = 10px thickness, 1000 pages = 50px thickness
  const thickness = Math.min(Math.max(pages / 20, 8), 50);

  if (viewMode === 'spine') {
    return (
      <div 
        className="relative flex items-end justify-center border-l border-r border-black/10 shadow-md transition-all hover:-translate-y-2 cursor-pointer bg-stone-200"
        style={{ width: `${thickness}px`, height: '200px' }}
      >
        <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-serif font-bold py-4 text-stone-700 truncate h-full">
          {title}
        </span>
      </div>
    );
  }

  return (
    <div className="group [perspective:1000px] w-40 h-60">
      <div 
        className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(-25deg)]"
        style={{ transformOrigin: 'left' }}
      >
        {/* Front Cover */}
        <div className="absolute inset-0 z-10 shadow-xl rounded-r-sm overflow-hidden [backface-visibility:hidden]">
          <img src={cover} alt={title} className="w-full h-full object-cover" />
        </div>

        {/* The Pages (Thickness) */}
        <div 
          className="absolute top-0 right-0 h-full bg-[#f5f5f5] origin-right [transform:rotateY(90deg)]"
          style={{ 
            width: `${thickness}px`,
            backgroundImage: 'repeating-linear-gradient(90deg, #e5e5e5 0px, #e5e5e5 1px, transparent 1px, transparent 3px)',
            transform: `translateX(${thickness}px) rotateY(90deg)`
          }}
        />
      </div>
    </div>
  );
};