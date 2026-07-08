import { Loader2, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AccountDeleteDialog } from '@/features/accounts/components/account-delete-dialog'
import { AccountFormDialog } from '@/features/accounts/components/account-form-dialog'
import { useAccountsQuery } from '@/features/accounts/hooks/use-accounts'
import type { Account } from '@/features/accounts/types'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

export function AccountsConfigCard() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const { data, isLoading, isError, error } = useAccountsQuery({
    page: 1,
    perPage: 100,
  })

  const accounts = data?.accounts ?? []

  function openCreate() {
    setSelectedAccount(null)
    setDialogOpen(true)
  }

  function openEdit(account: Account) {
    setSelectedAccount(account)
    setDialogOpen(true)
  }

  function openDelete(account: Account) {
    setSelectedAccount(account)
    setDeleteDialogOpen(true)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="size-4" />
            Cuentas
          </CardTitle>
          <CardDescription>
            Clasificá compras y gastos por cuenta para filtrarlos en reportes.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus />
          Nueva cuenta
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {actionMessage ? (
          <p className="text-muted-foreground text-sm">{actionMessage}</p>
        ) : null}

        {isLoading ? (
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        ) : isError ? (
          <p className="text-destructive text-sm whitespace-pre-line">{getApiErrorMessage(error)}</p>
        ) : accounts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay cuentas creadas.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b text-left">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Descripción</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{account.name}</td>
                    <td className="text-muted-foreground px-4 py-3">
                      {account.description ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          account.isActive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {account.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(account)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => openDelete(account)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <AccountFormDialog open={dialogOpen} onOpenChange={setDialogOpen} account={selectedAccount} />
      <AccountDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        account={selectedAccount}
        onDeleted={(modo) => {
          setActionMessage(
            modo === 'soft'
              ? 'La cuenta se desactivó porque tiene movimientos asociados.'
              : 'Cuenta eliminada.'
          )
        }}
      />
    </Card>
  )
}
