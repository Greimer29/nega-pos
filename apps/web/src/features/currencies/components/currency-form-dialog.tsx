import { Loader2 } from 'lucide-react'
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
import { DecimalInput } from '@/components/decimal-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useCreateCurrencyMutation,
  useUpdateCurrencyMutation,
} from '@/features/currencies/hooks/use-currencies'
import type { Currency } from '@/features/currencies/types'
import { notifyApiError, notifyFormError } from '@/features/notifications/query-error-state'

type CurrencyFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currency?: Currency | null
  baseCurrencyCode?: string
}

export function CurrencyFormDialog({
  open,
  onOpenChange,
  currency,
  baseCurrencyCode = 'XAU',
}: CurrencyFormDialogProps) {
  const isEditing = currency != null
  const createMutation = useCreateCurrencyMutation()
  const updateMutation = useUpdateCurrencyMutation()

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [rate, setRate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (isEditing) {
        setCode(currency.code)
        setName(currency.name)
        setRate(currency.ratePerUsd)
      } else {
        setCode('')
        setName('')
        setRate('')
      }
    }
  }, [open, isEditing, currency])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const parsedRate = Number(rate)
    if (!name.trim()) {
      notifyFormError('El nombre es obligatorio')
      return
    }
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      notifyFormError('La tasa debe ser mayor a 0')
      return
    }

    setIsSubmitting(true)
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          code: currency.code,
          payload: { name: name.trim(), rate_per_usd: parsedRate },
        })
      } else {
        const normalizedCode = code.trim().toUpperCase()
        if (!/^[A-Z]{3}$/.test(normalizedCode)) {
          notifyFormError('El código debe tener 3 letras')
          return
        }
        await createMutation.mutateAsync({
          code: normalizedCode,
          name: name.trim(),
          rate_per_usd: parsedRate,
        })
      }
      onOpenChange(false)
    } catch (err) {
      notifyApiError(err, 'No se pudo guardar')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar moneda' : 'Nueva moneda'}</DialogTitle>
          <DialogDescription>
            La tasa indica cuántas unidades de esta moneda equivalen a 1 {baseCurrencyCode}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isEditing ? (
            <div className="space-y-2">
              <Label>Código</Label>
              <Input value={currency.code} disabled />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="code">Código ISO *</Label>
              <Input
                id="code"
                maxLength={3}
                placeholder="EUR"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate">Tasa (unidades por 1 {baseCurrencyCode}) *</Label>
            <DecimalInput
              id="rate"
              decimals={4}
              min="0"
              placeholder="Ej. 36.5000"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : null}
              {isEditing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
