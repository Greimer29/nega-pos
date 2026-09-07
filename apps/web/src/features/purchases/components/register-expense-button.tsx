import { Wallet } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PermissionGate } from '@/features/permissions/components/permission-gate'
import { ExpenseFormDialog } from '@/features/purchases/components/expense-form-dialog'

type RegisterExpenseButtonProps = {
  variant?: 'default' | 'outline' | 'ghost'
}

export function RegisterExpenseButton({ variant = 'outline' }: RegisterExpenseButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <PermissionGate permission="expenses.edit">
      <Button
        type="button"
        variant={variant}
        size="icon"
        title="Registrar gasto"
        aria-label="Registrar gasto"
        onClick={() => setOpen(true)}
      >
        <Wallet className="size-4" />
      </Button>
      <ExpenseFormDialog open={open} onOpenChange={setOpen} />
    </PermissionGate>
  )
}
