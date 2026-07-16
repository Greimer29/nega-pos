import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type SaleLineKitchenNoteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  productName: string
  quantity: number
  initialNote: string
  onSave: (note: string | null) => void
}

export function SaleLineKitchenNoteDialog({
  open,
  onOpenChange,
  productName,
  quantity,
  initialNote,
  onSave,
}: SaleLineKitchenNoteDialogProps) {
  const [note, setNote] = useState(initialNote)

  useEffect(() => {
    if (open) {
      setNote(initialNote)
    }
  }, [open, initialNote])

  function handleSave() {
    const trimmed = note.trim()
    onSave(trimmed.length > 0 ? trimmed : null)
    onOpenChange(false)
  }

  function handleClear() {
    onSave(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Indicación para cocina</DialogTitle>
          <DialogDescription>
            Se imprime debajo de {productName} (x{quantity}) en la comanda. Un renglón por grupo de
            indicaciones.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="kitchen-note">Nota</Label>
          <Textarea
            id="kitchen-note"
            rows={5}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={
              '1 sin cebolla, sin mayonesa, sin zanahoria\n2 sin mostaza\n1 sin cebolla'
            }
            maxLength={1000}
            autoFocus
          />
          <p className="text-muted-foreground text-xs">
            Enter = nueva línea en la comanda. Máximo 1000 caracteres.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" onClick={handleClear}>
            Quitar nota
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave}>
              Guardar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
