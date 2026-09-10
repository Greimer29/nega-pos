import { Loader2, Pencil, Plus, Search, Trash2, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { SupplierDeleteDialog } from '@/features/suppliers/components/supplier-delete-dialog'
import { SupplierFormDialog } from '@/features/suppliers/components/supplier-form-dialog'
import {
  useDeleteSupplierMutation,
  useSuppliersQuery,
} from '@/features/suppliers/hooks/use-suppliers'
import type { Supplier } from '@/features/suppliers/types'
import { notifyApiError, QueryErrorState, EmptyListState } from '@/features/notifications/query-error-state'
import { toast } from '@/features/notifications/toast'
import { sessionFilterKey, useSessionPersistedState } from '@/lib/session-persisted-state'
import { cn } from '@/lib/utils'

const PER_PAGE = 20

type SuppliersFilters = {
  search: string
  page: number
}

const DEFAULT_SUPPLIERS_FILTERS: SuppliersFilters = {
  search: '',
  page: 1,
}

function formatRif(rif: string | null) {
  return rif ?? '—'
}

function formatTelefono(phone: string | null) {
  return phone ?? '—'
}

export function SuppliersPage() {
  const { company } = useAuth()
  const [filters, setFilters] = useSessionPersistedState(
    sessionFilterKey('suppliers', company?.id),
    DEFAULT_SUPPLIERS_FILTERS
  )
  const [searchInput, setSearchInput] = useState(filters.search)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null)
  const deleteMutation = useDeleteSupplierMutation()

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

  const { data, isLoading, isError, error } = useSuppliersQuery({
    page: filters.page,
    perPage: PER_PAGE,
    search: filters.search || undefined,
  })

  const suppliers = data?.suppliers ?? []
  const meta = data?.meta

  function openCreateDialog() {
    setSelectedSupplier(null)
    setDialogOpen(true)
  }

  function openEditDialog(supplier: Supplier) {
    setSelectedSupplier(supplier)
    setDialogOpen(true)
  }

  function openDeleteDialog(supplier: Supplier) {
    setSupplierToDelete(supplier)
    setDeleteDialogOpen(true)
  }

  async function confirmDelete() {
    if (!supplierToDelete) {
      return
    }

    try {
      const result = await deleteMutation.mutateAsync(supplierToDelete.id)
      setDeleteDialogOpen(false)
      setSupplierToDelete(null)

      if (result.modo === 'soft') {
        toast.warning(
          `"${supplierToDelete.name}" fue desactivado porque tiene registros asociados.`,
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
          <h1 className="text-2xl font-semibold tracking-tight">Proveedores</h1>
          <p className="text-muted-foreground text-sm">Gestioná los proveedores.</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus />
          Nuevo proveedor
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Listado</CardTitle>
            <CardDescription>
              {meta ? `${meta.total} proveedor${meta.total === 1 ? '' : 'es'} en total` : 'Cargando…'}
            </CardDescription>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre o RIF…"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Cargando proveedores…
            </div>
          ) : isError ? (
            <QueryErrorState isError error={error} title="No se pudieron cargar los proveedores" />
          ) : suppliers.length === 0 ? (
            <EmptyListState
              title={
                filters.search
                  ? 'No hay proveedores que coincidan con la búsqueda'
                  : 'Todavía no hay proveedores'
              }
              description={
                filters.search
                  ? undefined
                  : 'Es normal en una empresa nueva. Creá el primero cuando quieras comprar.'
              }
              action={
                !filters.search ? (
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
                    <th className="px-4 py-3 font-medium">RIF</th>
                    <th className="px-4 py-3 font-medium">Teléfono</th>
                    <th className="px-4 py-3 text-right font-medium">Saldo pendiente</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => {
                    const saldoUsd = Number(supplier.saldoPendienteUsd ?? 0)
                    const hasDebt = saldoUsd > 0
                    return (
                      <tr key={supplier.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3 font-medium">{supplier.name}</td>
                        <td className="text-muted-foreground px-4 py-3 font-mono text-xs">
                          {formatRif(supplier.rif)}
                        </td>
                        <td className="text-muted-foreground px-4 py-3">
                          {formatTelefono(supplier.phone)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={cn(
                                'font-medium tabular-nums',
                                hasDebt ? 'text-amber-800' : 'text-muted-foreground'
                              )}
                            >
                              <DisplayMoneyFromUsd
                                amountUsd={(supplier.saldoPendienteUsd ?? '0').toString()}
                              />
                            </span>
                            {supplier.tieneSaldoVencido ? (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800">
                                Vencido
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                              supplier.active
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {supplier.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Estado de cuenta ${supplier.name}`}
                              asChild
                            >
                              <Link to={`/suppliers/${supplier.id}/cuenta`}>
                                <Wallet />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Editar ${supplier.name}`}
                              onClick={() => openEditDialog(supplier)}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Eliminar ${supplier.name}`}
                              onClick={() => openDeleteDialog(supplier)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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

      <SupplierFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        supplier={selectedSupplier}
      />

      <SupplierDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) {
            setSupplierToDelete(null)
          }
        }}
        supplier={supplierToDelete}
        isPending={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
