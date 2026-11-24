import { Star, StarHalf } from 'lucide-react'

export default function RatingStars({ rating = 0, size = 14, showValue = true }) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Rated ${rating} out of 5`}>
      <span className="inline-flex text-amber-500">
        {[0, 1, 2, 3, 4].map((i) => {
          if (i < full) return <Star key={i} style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
          if (i === full && half) return <StarHalf key={i} style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
          return <Star key={i} style={{ width: size, height: size }} className="text-gray-300" fill="currentColor" strokeWidth={0} />
        })}
      </span>
      {showValue && <span className="text-xs text-muted">{rating.toFixed(1)}</span>}
    </span>
  )
}
