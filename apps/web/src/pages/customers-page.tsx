import { Eye, Loader2, Pencil, Plus, Search, Trash2, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { TIPO_LABELS } from '@/features/customers/constants'
import { CustomerDeleteDialog } from '@/features/customers/components/customer-delete-dialog'
import { CustomerFormDialog } from '@/features/customers/components/customer-form-dialog'
import {
  useCustomersQuery,
  useDeleteCustomerMutation,
} from '@/features/customers/hooks/use-customers'
import type { Customer, CustomerTipo } from '@/features/customers/types'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

const PER_PAGE = 20

export function CustomersPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [type, setTipo] = useState<CustomerTipo | ''>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const deleteMutation = useDeleteCustomerMutation()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading, isError, error } = useCustomersQuery({
    page,
    perPage: PER_PAGE,
    search: debouncedSearch || undefined,
    type: type || undefined,
  })

  const customers = data?.customers ?? []
  const meta = data?.meta

  function openCreateDialog() {
    setSelectedCustomer(null)
    setDialogOpen(true)
  }

  function openEditDialog(customer: Customer) {
    setSelectedCustomer(customer)
    setDialogOpen(true)
  }

  function openDeleteDialog(customer: Customer) {
    setCustomerToDelete(customer)
    setDeleteDialogOpen(true)
  }

  async function confirmDelete() {
    if (!customerToDelete) {
      return
    }

    setActionError(null)

    try {
      const result = await deleteMutation.mutateAsync(customerToDelete.id)
      setDeleteDialogOpen(false)
      setCustomerToDelete(null)

      if (result.modo === 'soft') {
        setActionError(
          `"${customerToDelete.name}" fue desactivado porque tiene pedidos asociados.`
        )
      }
    } catch (deleteError) {
      setActionError(getApiErrorMessage(deleteError))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground text-sm">
            Gestioná los clientes del taller y consultá su historial de pedidos.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus />
          Nuevo cliente
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Listado</CardTitle>
            <CardDescription>
              {meta ? `${meta.total} cliente${meta.total === 1 ? '' : 's'} en total` : 'Cargando…'}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              className="border-input bg-background flex h-9 min-w-[140px] rounded-md border px-3 text-sm"
              value={type}
              onChange={(e) => {
                setTipo(e.target.value as CustomerTipo | '')
                setPage(1)
              }}
            >
              <option value="">Todos los tipos</option>
              {(['WHITE_LABEL', 'CORPORATE', 'OTHER'] as const).map((t) => (
                <option key={t} value={t}>
                  {TIPO_LABELS[t]}
                </option>
              ))}
            </select>
            <div className="relative w-full sm:max-w-xs">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                className="pl-9"
                placeholder="Buscar por nombre, email…"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {actionError ? <p className="text-destructive text-sm whitespace-pre-line">{actionError}</p> : null}

          {isLoading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Cargando clientes…
            </div>
          ) : isError ? (
            <p className="text-destructive py-8 text-center text-sm whitespace-pre-line">{getApiErrorMessage(error)}</p>
          ) : customers.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm">
                {debouncedSearch || type
                  ? 'No hay clientes que coincidan con los filtros.'
                  : 'Todavía no hay clientes cargados.'}
              </p>
              {!debouncedSearch && !type ? (
                <Button className="mt-4" variant="outline" onClick={openCreateDialog}>
                  <Plus />
                  Crear el primero
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b text-left">
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Teléfono</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-medium">{customer.name}</td>
                      <td className="text-muted-foreground px-4 py-3">{TIPO_LABELS[customer.type]}</td>
                      <td className="text-muted-foreground px-4 py-3">{customer.phone ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            customer.active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {customer.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {(customer.creditDays ?? 0) > 0 ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Estado de cuenta ${customer.name}`}
                              asChild
                            >
                              <Link to={`/customers/${customer.id}/cuenta`}>
                                <Wallet />
                              </Link>
                            </Button>
                          ) : null}
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/customers/${customer.id}`} aria-label={`Ver ${customer.name}`}>
                              <Eye />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar ${customer.name}`}
                            onClick={() => openEditDialog(customer)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Eliminar ${customer.name}`}
                            onClick={() => openDeleteDialog(customer)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {meta && meta.lastPage > 1 ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-muted-foreground text-sm">
                Página {meta.currentPage} de {meta.lastPage}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.currentPage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.currentPage >= meta.lastPage}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <CustomerFormDialog open={dialogOpen} onOpenChange={setDialogOpen} customer={selectedCustomer} />

      <CustomerDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) {
            setCustomerToDelete(null)
          }
        }}
        customer={customerToDelete}
        isPending={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
