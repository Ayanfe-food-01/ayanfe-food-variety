import { useEffect, useState } from 'react'
import { SparkIcon } from '../../assets/icons'

interface HeroImageProps {
  src?: string | null
  alt?: string
}

export function HeroImage({ src, alt = 'Ayanfe Food Variety - Quality Foodstuff' }: HeroImageProps) {
  const [hasImageError, setHasImageError] = useState(false)

  useEffect(() => {
    setHasImageError(false)
  }, [src])

  if (!src || hasImageError) {
    return (
      <div className="hero-card hero-card-fallback" aria-label="Ayanfe Food Variety quality food promise">
        <span className="hero-card-icon"><SparkIcon size={23} /></span>
        <strong>Good food starts here.</strong>
        <span>Quality staples for everyday cooking.</span>
      </div>
    )
  }

  return (
    <div className="hero-card hero-image-card">
      <img src={src} alt={alt} onError={() => setHasImageError(true)} />
    </div>
  )
}