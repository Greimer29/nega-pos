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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useActiveCurrenciesQuery } from '@/features/currencies/hooks/use-currencies'
import {
  useCreatePaymentMethodMutation,
  useUpdatePaymentMethodMutation,
} from '@/features/payment-methods/hooks/use-payment-methods'
import type { PaymentMethod } from '@/features/payment-methods/types'
import { getApiErrorMessage } from '@/lib/api-error'

type PaymentMethodFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  method?: PaymentMethod | null
}

export function PaymentMethodFormDialog({ open, onOpenChange, method }: PaymentMethodFormDialogProps) {
  const isEditing = method != null
  const createMutation = useCreatePaymentMethodMutation()
  const updateMutation = useUpdatePaymentMethodMutation()
  const { data: currencies = [] } = useActiveCurrenciesQuery()

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [currencyCode, setCurrencyCode] = useState('USD')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setError(null)
      if (isEditing) {
        setCode(method.code)
        setName(method.name)
        setCurrencyCode(method.currency_code)
      } else {
        setCode('')
        setName('')
        setCurrencyCode(currencies[0]?.code ?? 'USD')
      }
    }
  }, [open, isEditing, method, currencies])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    setIsSubmitting(true)
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          code: method.code,
          payload: {
            name: name.trim(),
            currency_code: currencyCode,
          },
        })
      } else {
        const normalizedCode = code.trim().toLowerCase().replace(/\s+/g, '_')
        if (!/^[a-z][a-z0-9_]*$/.test(normalizedCode)) {
          setError('El código debe usar minúsculas, números y guiones bajos')
          return
        }
        await createMutation.mutateAsync({
          code: normalizedCode,
          name: name.trim(),
          currency_code: currencyCode,
        })
      }
      onOpenChange(false)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar método de pago' : 'Nuevo método de pago'}</DialogTitle>
          <DialogDescription>
            Cada método se asocia a una moneda para calcular montos con la tasa configurada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isEditing ? (
            <div className="space-y-2">
              <Label>Código</Label>
              <Input value={method.code} disabled />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="pm-code">Código *</Label>
              <Input
                id="pm-code"
                placeholder="efectivo_usd"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="pm-name">Nombre *</Label>
            <Input id="pm-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pm-currency">Moneda *</Label>
            <select
              id="pm-currency"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
            >
              {currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} — {currency.name}
                </option>
              ))}
            </select>
          </div>

          {error ? <p className="text-destructive text-sm whitespace-pre-line">{error}</p> : null}

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
