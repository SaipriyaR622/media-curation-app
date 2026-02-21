import { Star } from 'lucide-react';
import { useState } from 'react';

interface StarRatingProps {
  rating: number;
  onChange: (rating: number) => void;
  size?: number;
}

export function StarRating({ rating, onChange, size = 18 }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-0.5" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star === rating ? 0 : star)}
          onMouseEnter={() => setHovered(star)}
          className="transition-transform duration-150 hover:scale-110"
        >
          <Star
            size={size}
            className={`transition-colors ${
              star <= (hovered || rating)
                ? 'fill-primary text-primary'
                : 'fill-transparent text-border'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
