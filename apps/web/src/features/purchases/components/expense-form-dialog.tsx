import { zodResolver } from '@hookform/resolvers/zod'

import { Loader2 } from 'lucide-react'

import { useEffect, useState } from 'react'

import { useForm } from 'react-hook-form'

import { z } from 'zod'

import { Button } from '@/components/ui/button'

import {

  Dialog,

  DialogContent,

  DialogDescription,

  DialogFooter,

  DialogHeader,

  DialogTitle,

} from '@/components/ui/dialog'

import { MoneyInput } from '@/components/decimal-input'

import { Input } from '@/components/ui/input'

import { Label } from '@/components/ui/label'

import {

  useCreateExpenseMutation,

  useUpdateExpenseMutation,

} from '@/features/purchases/hooks/use-expenses'

import { AccountSelect } from '@/features/accounts/components/account-select'

import { CurrencySelect } from '@/features/currencies/components/currency-select'

import type { Expense } from '@/features/purchases/types'

import { getApiErrorMessage } from '@/lib/api-error'



const schema = z.object({

  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),

  description: z.string().trim().min(1, 'La descripción es obligatoria').max(255),

  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),

})



type FormInput = z.input<typeof schema>

type FormValues = z.infer<typeof schema>



type ExpenseFormDialogProps = {

  open: boolean

  onOpenChange: (open: boolean) => void

  expense?: Expense | null

}



export function ExpenseFormDialog({ open, onOpenChange, expense }: ExpenseFormDialogProps) {

  const isEditing = expense != null

  const createMutation = useCreateExpenseMutation()

  const updateMutation = useUpdateExpenseMutation()

  const [accountId, setAccountId] = useState<number | null>(null)

  const [currencyCode, setCurrencyCode] = useState('USD')



  const {

    register,

    handleSubmit,

    reset,

    setError,

    formState: { errors, isSubmitting },

  } = useForm<FormInput, unknown, FormValues>({

    resolver: zodResolver(schema),

    defaultValues: {

      date: new Date().toISOString().slice(0, 10),

      description: '',

      amount: '',

    },

  })



  useEffect(() => {

    if (open) {

      setAccountId(isEditing ? expense.accountId : null)

      setCurrencyCode(isEditing ? expense.currencyCode : 'USD')

      reset(

        isEditing

          ? {

              date: expense.date,

              description: expense.description,

              amount: Number(expense.amount),

            }

          : {

              date: new Date().toISOString().slice(0, 10),

              description: '',

              amount: '',

            }

      )

    }

  }, [open, isEditing, expense, reset])



  const onSubmit = handleSubmit(async (values) => {

    try {

      const payload = { ...values, account_id: accountId, currency_code: 'USD' }

      if (isEditing) {

        await updateMutation.mutateAsync({ id: expense.id, payload })

      } else {

        await createMutation.mutateAsync(payload)

      }

      onOpenChange(false)

    } catch (err) {

      setError('root', { message: getApiErrorMessage(err) })

    }

  })



  return (

    <Dialog open={open} onOpenChange={onOpenChange}>

      <DialogContent className="sm:max-w-md">

        <DialogHeader>

          <DialogTitle>{isEditing ? 'Editar gasto' : 'Registrar gasto'}</DialogTitle>

          <DialogDescription>
            Registrá el monto en dólares (USD). Los reportes consolidan en $.
          </DialogDescription>

        </DialogHeader>



        <form onSubmit={onSubmit} className="space-y-4">

          <div className="space-y-2">

            <Label htmlFor="expense-date">Fecha *</Label>

            <Input id="expense-date" type="date" {...register('date')} />

            {errors.date ? (

              <p className="text-destructive text-sm">{errors.date.message}</p>

            ) : null}

          </div>



          <div className="space-y-2">

            <Label htmlFor="expense-description">Descripción *</Label>

            <Input id="expense-description" {...register('description')} />

            {errors.description ? (

              <p className="text-destructive text-sm">{errors.description.message}</p>

            ) : null}

          </div>



          <div className="grid gap-4 sm:grid-cols-2">

            <CurrencySelect registrationOnly value={currencyCode} onChange={setCurrencyCode} />

            <div className="space-y-2">

              <Label htmlFor="expense-amount">Monto (USD $) *</Label>

              <MoneyInput

                id="expense-amount"

                min="0"

                placeholder="0.00"

                {...register('amount')}

              />

              {errors.amount ? (

                <p className="text-destructive text-sm">{errors.amount.message}</p>

              ) : null}

            </div>

          </div>



          <AccountSelect value={accountId} onChange={setAccountId} />



          {errors.root ? <p className="text-destructive text-sm whitespace-pre-line">{errors.root.message}</p> : null}



          <DialogFooter>

            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>

              Cancelar

            </Button>

            <Button type="submit" disabled={isSubmitting}>

              {isSubmitting ? <Loader2 className="animate-spin" /> : null}

              {isEditing ? 'Guardar' : 'Registrar'}

            </Button>

          </DialogFooter>

        </form>

      </DialogContent>

    </Dialog>

  )

}


