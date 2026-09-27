import { cn } from '@/lib/utils'

type UpdateAvailableDotProps = {
  className?: string
  title?: string
}

/** Punto naranja unicolor: indica que hay una versión de la app disponible. */
export function UpdateAvailableDot({
  className,
  title = 'Versión disponible',
}: UpdateAvailableDotProps) {
  return (
    <span
      role="status"
      title={title}
      aria-label={title}
      className={cn('inline-block size-2 shrink-0 rounded-full bg-orange-500', className)}
    />
  )
}
