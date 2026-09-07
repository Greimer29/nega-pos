import { Coins, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { CurrencyFormDialog } from '@/features/currencies/components/currency-form-dialog'
import {
  useBaseCurrencyQuery,
  useCurrenciesQuery,
  useDeleteCurrencyMutation,
  useUpdateBaseCurrencyMutation,
  useUpdateCurrencyMutation,
} from '@/features/currencies/hooks/use-currencies'
import type { Currency } from '@/features/currencies/types'
import { notifyApiError, QueryErrorState } from '@/features/notifications/query-error-state'
import { cn } from '@/lib/utils'

export function CurrenciesConfigCard() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null)

  const { data: currencies = [], isLoading, isError, error } = useCurrenciesQuery()
  const { data: baseCurrencyCode = 'XAU' } = useBaseCurrencyQuery()
  const updateMutation = useUpdateCurrencyMutation()
  const deleteMutation = useDeleteCurrencyMutation()
  const updateBaseMutation = useUpdateBaseCurrencyMutation()

  function openCreate() {
    setSelectedCurrency(null)
    setDialogOpen(true)
  }

  function openEdit(currency: Currency) {
    setSelectedCurrency(currency)
    setDialogOpen(true)
  }

  async function toggleActive(currency: Currency) {
    if (currency.code === baseCurrencyCode) return
    try {
      await updateMutation.mutateAsync({
        code: currency.code,
        payload: { is_active: !currency.isActive },
      })
    } catch (err) {
      notifyApiError(err)
    }
  }

  async function handleDelete(currency: Currency) {
    if (currency.code === baseCurrencyCode) return
    if (!window.confirm(`¿Eliminar la moneda ${currency.code}?`)) return
    try {
      await deleteMutation.mutateAsync(currency.code)
    } catch (err) {
      notifyApiError(err)
    }
  }

  async function handleBaseCurrencyChange(code: string) {
    try {
      await updateBaseMutation.mutateAsync(code)
    } catch (err) {
      notifyApiError(err)
    }
  }

  const activeCurrencies = currencies.filter((c) => c.isActive)

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="size-4" />
            Monedas y tasas
          </CardTitle>
          <CardDescription>
            Los registros monetarios se guardan en la moneda base del sistema. La tasa de cada
            moneda es cuántas unidades equivalen a 1 unidad de la base (ej. 100 USD = 1 XAU).
          </CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus />
          Nueva moneda
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-md border p-4">
          <Label htmlFor="base-currency">Moneda base del sistema</Label>
          <select
            id="base-currency"
            className="border-input bg-background w-full max-w-xs rounded-md border px-3 py-2 text-sm"
            value={baseCurrencyCode}
            disabled={updateBaseMutation.isPending || activeCurrencies.length === 0}
            onChange={(event) => void handleBaseCurrencyChange(event.target.value)}
          >
            {activeCurrencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} — {currency.name}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground text-xs">
            Ventas, compras, costos y reportes consolidan en esta moneda. Cambiarla no reconvierte
            el histórico automáticamente (usar migración de cutover).
          </p>
        </div>

        {isLoading ? (
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        ) : isError ? (
          <QueryErrorState isError error={error} title="No se pudieron cargar las monedas" />
        ) : currencies.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay monedas configuradas.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b text-left">
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium text-right">Tasa / {baseCurrencyCode}</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currencies.map((currency) => (
                  <tr key={currency.code} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-mono font-medium">
                      {currency.code}
                      {currency.code === baseCurrencyCode ? (
                        <span className="bg-primary/10 text-primary ml-2 rounded px-1.5 py-0.5 text-xs">
                          Base
                        </span>
                      ) : null}
                    </td>
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
                        {currency.code !== baseCurrencyCode ? (
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
        baseCurrencyCode={baseCurrencyCode}
      />
    </Card>
  )
}
