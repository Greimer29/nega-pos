import { Loader2 } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

type InventoryImageFieldProps = {
  label: string
  imageUrl?: string | null
  pendingPreviewUrl?: string | null
  hasRemovableImage: boolean
  pending?: boolean
  error?: string | null
  helperText?: string
  onSelectFile: (file: File) => void
  onRemove?: () => void
}

export function InventoryImageField({
  label,
  imageUrl,
  pendingPreviewUrl,
  hasRemovableImage,
  pending = false,
  error,
  helperText = 'Se guarda en el servidor local (no en la nube). JPG, PNG o WebP, máx. 5 MB.',
  onSelectFile,
  onRemove,
}: InventoryImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const previewUrl = pendingPreviewUrl ?? imageUrl ?? null

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {helperText ? <p className="text-muted-foreground text-xs">{helperText}</p> : null}
      <div className="flex items-center gap-4">
        <div className="bg-muted flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border">
          {previewUrl ? (
            <img src={previewUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-muted-foreground px-1 text-center text-xs">Sin imagen</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                onSelectFile(file)
              }
              e.target.value = ''
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {previewUrl ? 'Cambiar imagen' : 'Subir imagen'}
          </Button>
          {hasRemovableImage && onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={pending}
              onClick={onRemove}
            >
              Quitar imagen
            </Button>
          ) : null}
        </div>
      </div>
      {error ? <p className="text-destructive text-sm whitespace-pre-line">{error}</p> : null}
    </div>
  )
}
