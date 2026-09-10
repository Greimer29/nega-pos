import { Eye, Loader2, Pencil, Plus, Search, Trash2, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { TIPO_LABELS } from '@/features/customers/constants'
import { CustomerDeleteDialog } from '@/features/customers/components/customer-delete-dialog'
import { CustomerFormDialog } from '@/features/customers/components/customer-form-dialog'
import {
  useCustomersQuery,
  useDeleteCustomerMutation,
} from '@/features/customers/hooks/use-customers'
import type { Customer, CustomerTipo } from '@/features/customers/types'
import { notifyApiError, QueryErrorState, EmptyListState } from '@/features/notifications/query-error-state'
import { toast } from '@/features/notifications/toast'
import { sessionFilterKey, useSessionPersistedState } from '@/lib/session-persisted-state'
import { cn } from '@/lib/utils'

const PER_PAGE = 20

type CustomersFilters = {
  search: string
  type: CustomerTipo | ''
  page: number
}

const DEFAULT_CUSTOMERS_FILTERS: CustomersFilters = {
  search: '',
  type: '',
  page: 1,
}

export function CustomersPage() {
  const { company } = useAuth()
  const [filters, setFilters] = useSessionPersistedState(
    sessionFilterKey('customers', company?.id),
    DEFAULT_CUSTOMERS_FILTERS
  )
  const [searchInput, setSearchInput] = useState(filters.search)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
  const deleteMutation = useDeleteCustomerMutation()

  useEffect(() => {
    setSearchInput(filters.search)
  }, [filters.search])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = searchInput.trim()
      setFilters((prev) => ({
        ...prev,
        search: nextSearch,
        page: nextSearch === prev.search ? prev.page : 1,
      }))
    }, 300)

    return () => window.clearTimeout(timer)
  }, [searchInput, setFilters])

  const { data, isLoading, isError, error } = useCustomersQuery({
    page: filters.page,
    perPage: PER_PAGE,
    search: filters.search || undefined,
    type: filters.type || undefined,
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

    try {
      const result = await deleteMutation.mutateAsync(customerToDelete.id)
      setDeleteDialogOpen(false)
      setCustomerToDelete(null)

      if (result.modo === 'soft') {
        toast.warning(
          `"${customerToDelete.name}" fue desactivado porque tiene pedidos asociados.`,
          'Desactivado'
        )
      }
    } catch (deleteError) {
      notifyApiError(deleteError)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground text-sm">
            Gestioná los clientes y consultá su historial de pedidos.
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
              value={filters.type}
              onChange={(e) => {
                const type = e.target.value as CustomerTipo | ''
                setFilters((prev) => ({ ...prev, type, page: 1 }))
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
          {isLoading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Cargando clientes…
            </div>
          ) : isError ? (
            <QueryErrorState isError error={error} title="No se pudieron cargar los clientes" />
          ) : customers.length === 0 ? (
            <EmptyListState
              title={
                filters.search || filters.type
                  ? 'No hay clientes que coincidan con los filtros'
                  : 'Todavía no hay clientes'
              }
              description={
                filters.search || filters.type
                  ? undefined
                  : 'Es normal en una empresa nueva. Creá el primero cuando lo necesites.'
              }
              action={
                !filters.search && !filters.type ? (
                  <Button variant="outline" onClick={openCreateDialog}>
                    <Plus />
                    Crear el primero
                  </Button>
                ) : null
              }
            />
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
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                  }
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.currentPage >= meta.lastPage}
                  onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
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
