import { Coins, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CurrencyFormDialog } from '@/features/currencies/components/currency-form-dialog'
import {
  useCurrenciesQuery,
  useDeleteCurrencyMutation,
  useUpdateCurrencyMutation,
} from '@/features/currencies/hooks/use-currencies'
import type { Currency } from '@/features/currencies/types'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

export function CurrenciesConfigCard() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: currencies = [], isLoading, isError, error } = useCurrenciesQuery()
  const updateMutation = useUpdateCurrencyMutation()
  const deleteMutation = useDeleteCurrencyMutation()

  function openCreate() {
    setSelectedCurrency(null)
    setDialogOpen(true)
  }

  function openEdit(currency: Currency) {
    setSelectedCurrency(currency)
    setDialogOpen(true)
  }

  async function toggleActive(currency: Currency) {
    if (currency.code === 'USD') return
    setActionError(null)
    try {
      await updateMutation.mutateAsync({
        code: currency.code,
        payload: { is_active: !currency.isActive },
      })
    } catch (err) {
      setActionError(getApiErrorMessage(err))
    }
  }

  async function handleDelete(currency: Currency) {
    if (currency.code === 'USD') return
    if (!window.confirm(`¿Eliminar la moneda ${currency.code}?`)) return
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(currency.code)
    } catch (err) {
      setActionError(getApiErrorMessage(err))
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="size-4" />
            Monedas y tasas
          </CardTitle>
          <CardDescription>
            Los registros monetarios se guardan en dólares (USD). Configurá monedas y tasas de
            referencia; los reportes consolidan en $.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus />
          Nueva moneda
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {actionError ? <p className="text-destructive text-sm whitespace-pre-line">{actionError}</p> : null}

        {isLoading ? (
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        ) : isError ? (
          <p className="text-destructive text-sm whitespace-pre-line">{getApiErrorMessage(error)}</p>
        ) : currencies.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay monedas configuradas.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b text-left">
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium text-right">Tasa / USD</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currencies.map((currency) => (
                  <tr key={currency.code} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-mono font-medium">{currency.code}</td>
                    <td className="px-4 py-3">{currency.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{currency.ratePerUsd}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          currency.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {currency.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(currency)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        {currency.code !== 'USD' ? (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => void toggleActive(currency)}
                            >
                              {currency.isActive ? 'Desactivar' : 'Activar'}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => void handleDelete(currency)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <CurrencyFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currency={selectedCurrency}
      />
    </Card>
  )
}
