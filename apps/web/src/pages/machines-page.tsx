import { Eye, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { MachineDeleteDialog } from '@/features/machines/components/machine-delete-dialog'
import { MachineFormDialog } from '@/features/machines/components/machine-form-dialog'
import {
  MACHINE_STATUSES,
  MACHINE_STATUS_LABELS,
  formatMachineTypeLabel,
  type MachineStatus,
} from '@/features/machines/constants'
import {
  useDeleteMachineMutation,
  useMachinesQuery,
} from '@/features/machines/hooks/use-machines'
import type { Machine } from '@/features/machines/types'
import { notifyApiError, QueryErrorState } from '@/features/notifications/query-error-state'
import { toast } from '@/features/notifications/toast'
import { sessionFilterKey, useSessionPersistedState } from '@/lib/session-persisted-state'
import { cn } from '@/lib/utils'
import { pageHeaderClass, toolbarActionsClass, toolbarHeaderClass } from '@/components/layout/responsive-toolbar'

const PER_PAGE = 20

type MachinesFilters = {
  search: string
  type: string
  status: MachineStatus | ''
  page: number
}

const DEFAULT_MACHINES_FILTERS: MachinesFilters = {
  search: '',
  type: '',
  status: '',
  page: 1,
}

export function MachinesPage() {
  const { company } = useAuth()
  const [filters, setFilters] = useSessionPersistedState(
    sessionFilterKey('machines', company?.id),
    DEFAULT_MACHINES_FILTERS
  )
  const [searchInput, setSearchInput] = useState(filters.search)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)
  const [machineToDelete, setMachineToDelete] = useState<Machine | null>(null)
  const deleteMutation = useDeleteMachineMutation()

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

  const { data, isLoading, isError, error } = useMachinesQuery({
    page: filters.page,
    perPage: PER_PAGE,
    search: filters.search || undefined,
    type: filters.type || undefined,
    status: filters.status || undefined,
  })

  const machines = data?.machines ?? []
  const meta = data?.meta

  function openCreateDialog() {
    setSelectedMachine(null)
    setDialogOpen(true)
  }

  function openEditDialog(machine: Machine) {
    setSelectedMachine(machine)
    setDialogOpen(true)
  }

  function openDeleteDialog(machine: Machine) {
    setMachineToDelete(machine)
    setDeleteDialogOpen(true)
  }

  async function confirmDelete() {
    if (!machineToDelete) {
      return
    }

    try {
      const result = await deleteMutation.mutateAsync(machineToDelete.id)
      setDeleteDialogOpen(false)
      setMachineToDelete(null)

      if (result.modo === 'soft') {
        toast.warning(
          `"${machineToDelete.name}" fue desactivada porque tiene gastos asociados.`,
          'Desactivado'
        )
      }
    } catch (deleteError) {
      notifyApiError(deleteError)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className={pageHeaderClass}>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Máquinas</h1>
          <p className="text-muted-foreground text-sm">
            Gestioná las máquinas y equipos y su estado operativo.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="w-fit shrink-0">
          <Plus />
          Nueva máquina
        </Button>
      </div>

      <Card>
        <CardHeader className={toolbarHeaderClass}>
          <div className="min-w-0">
            <CardTitle className="text-base">Listado</CardTitle>
            <CardDescription>
              {meta ? `${meta.total} máquina${meta.total === 1 ? '' : 's'} en total` : 'Cargando…'}
            </CardDescription>
          </div>
          <div className={toolbarActionsClass}>
            <Input
              className="min-w-0 w-full sm:max-w-[160px]"
              placeholder="Filtrar por tipo…"
              value={filters.type}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, type: e.target.value, page: 1 }))
              }}
            />

            <select
              className="border-input bg-background flex h-9 min-w-0 w-full rounded-md border px-3 text-sm sm:w-auto sm:min-w-[180px]"
              value={filters.status}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value as MachineStatus | '',
                  page: 1,
                }))
              }}
            >
              <option value="">Todos los estados</option>
              {MACHINE_STATUSES.map((currentStatus) => (
                <option key={currentStatus} value={currentStatus}>
                  {MACHINE_STATUS_LABELS[currentStatus]}
                </option>
              ))}
            </select>

            <div className="relative min-w-0 w-full sm:max-w-xs">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                className="pl-9"
                placeholder="Buscar por nombre, marca o modelo…"
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
              Cargando máquinas…
            </div>
          ) : isError ? (
            <QueryErrorState isError error={error} title="No se pudieron cargar las máquinas" />
          ) : machines.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm">
                {filters.search || filters.type || filters.status
                  ? 'No hay máquinas que coincidan con los filtros.'
                  : 'Todavía no hay máquinas cargadas.'}
              </p>
              {!filters.search && !filters.type && !filters.status ? (
                <Button className="mt-4" variant="outline" onClick={openCreateDialog}>
                  <Plus />
                  Crear la primera
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b text-left">
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Marca / Modelo</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Activo</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.map((machine) => (
                    <tr key={machine.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-medium">{machine.name}</td>
                      <td className="text-muted-foreground px-4 py-3">
                        {formatMachineTypeLabel(machine.type)}
                      </td>
                      <td className="text-muted-foreground px-4 py-3">
                        {[machine.brand, machine.model].filter(Boolean).join(' / ') || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            machine.status === 'OPERATIONAL'
                              ? 'bg-emerald-100 text-emerald-800'
                              : machine.status === 'UNDER_REPAIR'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {MACHINE_STATUS_LABELS[machine.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            machine.active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {machine.active ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/machines/${machine.id}`} aria-label={`Ver ${machine.name}`}>
                              <Eye />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar ${machine.name}`}
                            onClick={() => openEditDialog(machine)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Eliminar ${machine.name}`}
                            onClick={() => openDeleteDialog(machine)}
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

      <MachineFormDialog open={dialogOpen} onOpenChange={setDialogOpen} machine={selectedMachine} />

      <MachineDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) {
            setMachineToDelete(null)
          }
        }}
        machine={machineToDelete}
        isPending={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
