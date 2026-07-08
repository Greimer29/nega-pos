import { Package } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

type PublicImageProps = {
  src: string
  alt: string
  className?: string
  fallbackClassName?: string
  showFallbackIcon?: boolean
}

export function PublicImage({
  src,
  alt,
  className,
  fallbackClassName,
  showFallbackIcon = false,
}: PublicImageProps) {
  const [failed, setFailed] = useState(false)

  if (failed || !src) {
    if (!showFallbackIcon) {
      return null
    }

    return (
      <div className={cn('flex items-center justify-center', fallbackClassName ?? className)}>
        <Package className="text-muted-foreground/60 size-7" />
      </div>
    )
  }

  return (
    <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />
  )
}
