import { Loader2, Search } from 'lucide-react'
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
import { useCustomersQuery } from '@/features/customers/hooks/use-customers'
import type { Customer } from '@/features/customers/types'

type VentasCustomerPickDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelected: (customer: Customer) => void
}

export function VentasCustomerPickDialog({
  open,
  onOpenChange,
  onSelected,
}: VentasCustomerPickDialogProps) {
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (!open) {
      setSearchInput('')
      setDebouncedSearch('')
    }
  }, [open])

  const { data, isLoading } = useCustomersQuery(
    {
      page: 1,
      perPage: 30,
      active: true,
      search: debouncedSearch || undefined,
    },
    { enabled: open }
  )

  const customers = data?.customers ?? []

  function handleSelect(customer: Customer) {
    onSelected(customer)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Buscar cliente</DialogTitle>
          <DialogDescription>
            Elegí un cliente registrado para asociarlo a la venta.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className="scrollbar-subtle max-h-72 space-y-2 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="text-muted-foreground size-5 animate-spin" />
            </div>
          ) : customers.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No hay clientes que coincidan con la búsqueda.
            </p>
          ) : (
            customers.map((customer) => (
              <button
                key={customer.id}
                type="button"
                className="hover:bg-muted flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors"
                onClick={() => handleSelect(customer)}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{customer.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {[customer.phone, customer.email].filter(Boolean).join(' · ') ||
                      'Sin contacto'}
                  </p>
                </div>
                {customer.creditDays && customer.creditDays > 0 ? (
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {customer.creditDays} días crédito
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
