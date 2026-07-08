import { Camera, Loader2, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type CircularImageFieldProps = {
  imageUrl?: string | null
  pendingPreviewUrl?: string | null
  alt?: string
  size?: number
  pending?: boolean
  error?: string | null
  onSelectFile: (file: File) => void
  onRemove?: () => void
  className?: string
}

export function CircularImageField({
  imageUrl,
  pendingPreviewUrl,
  alt = '',
  size = 150,
  pending = false,
  error,
  onSelectFile,
  onRemove,
  className,
}: CircularImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const previewUrl = pendingPreviewUrl ?? imageUrl ?? null

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className="bg-muted hover:bg-muted/80 relative shrink-0 overflow-hidden rounded-full border-2 border-dashed border-neutral-300 transition-colors"
        style={{ width: size, height: size }}
        aria-label={previewUrl ? 'Cambiar imagen' : 'Subir imagen'}
      >
        {previewUrl ? (
          <img src={previewUrl} alt={alt} className="size-full object-cover" />
        ) : (
          <span className="text-muted-foreground flex size-full flex-col items-center justify-center gap-1">
            <Camera className="size-6 opacity-60" />
            <span className="text-[10px] font-medium">Subir foto</span>
          </span>
        )}
        {pending ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 className="size-6 animate-spin text-white" />
          </span>
        ) : null}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onSelectFile(file)
          e.target.value = ''
        }}
      />
      {previewUrl && onRemove ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive h-8 gap-1.5 text-xs"
          disabled={pending}
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" />
          Eliminar foto
        </Button>
      ) : null}
      {error ? <p className="text-destructive max-w-[150px] text-center text-xs">{error}</p> : null}
    </div>
  )
}
