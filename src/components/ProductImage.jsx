import { useState } from 'react'
import { ImageOff } from 'lucide-react'

// Product image with graceful fallback: if the remote URL fails, show a
// styled gradient placeholder with the product initial — never a broken image.
export default function ProductImage({ src, alt, className = '', eager = false }) {
  const [failed, setFailed] = useState(false)
  if (failed || !src) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-primary-light via-surface to-orange-100 text-primary ${className}`} role="img" aria-label={alt}>
        <ImageOff className="h-8 w-8 opacity-60" />
      </div>
    )
  }
  return <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} onError={() => setFailed(true)} className={className} />
}
