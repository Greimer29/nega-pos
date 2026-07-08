import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AccountFormDialog } from '@/features/accounts/components/account-form-dialog'
import { useActiveAccountsQuery } from '@/features/accounts/hooks/use-accounts'
import type { Account } from '@/features/accounts/types'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type AccountSelectProps = {
  id?: string
  label?: string
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
  className?: string
  allowEmpty?: boolean
  emptyLabel?: string
  allowCreate?: boolean
}

export function AccountSelect({
  id = 'account_id',
  label = 'Cuenta',
  value,
  onChange,
  disabled,
  className,
  allowEmpty = true,
  emptyLabel = 'Sin cuenta',
  allowCreate = false,
}: AccountSelectProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const { data, isLoading } = useActiveAccountsQuery()
  const accounts = data?.accounts ?? []

  return (
    <>
      <div className={cn('space-y-2', className)}>
        <Label htmlFor={id}>{label}</Label>
        <div className="flex gap-2">
          <select
            id={id}
            disabled={disabled || isLoading}
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 min-w-0 flex-1 rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
            value={value ?? ''}
            onChange={(e) => {
              const raw = e.target.value
              onChange(raw === '' ? null : Number(raw))
            }}
          >
            {allowEmpty ? <option value="">{emptyLabel}</option> : null}
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          {allowCreate ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              disabled={disabled}
              title="Nueva cuenta"
              aria-label="Nueva cuenta"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {allowCreate ? (
        <AccountFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(account: Account) => onChange(account.id)}
        />
      ) : null}
    </>
  )
}
