import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
        <DialogTitle className="sr-only">Indicación para cocina</DialogTitle>

        <div className="space-y-2">
          <Label htmlFor="kitchen-note">Nota</Label>
          <Textarea
            id="kitchen-note"
            rows={5}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            autoFocus
          />
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
