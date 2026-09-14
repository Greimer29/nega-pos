import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type FiltersDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  id?: string
  children: ReactNode
}

export function FiltersDrawer({
  open,
  onOpenChange,
  title,
  description,
  id,
  children,
}: FiltersDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id={id}
        closeButtonClassName="top-3 right-3 flex size-11 items-center justify-center rounded-full bg-neutral-100 opacity-100 shadow-sm hover:bg-neutral-200 hover:opacity-100"
        closeIconClassName="size-5"
        className={cn(
          'fixed z-50 flex translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden p-0 shadow-xl duration-300',
          'data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100',
          'inset-x-0 top-auto bottom-0 left-0 right-0 h-[80dvh] max-h-[80dvh] w-full max-w-none rounded-t-2xl border-x-0 border-b-0',
          'max-md:data-[state=open]:slide-in-from-bottom max-md:data-[state=closed]:slide-out-to-bottom',
          'md:inset-y-0 md:top-0 md:right-0 md:bottom-0 md:left-auto md:h-svh md:max-h-svh md:w-[min(100vw,22rem)] md:max-w-[22rem]',
          'md:rounded-none md:rounded-l-2xl md:border md:border-y-0 md:border-r-0',
          'md:data-[state=open]:slide-in-from-right md:data-[state=closed]:slide-out-to-right'
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 pt-14 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:p-4 md:pt-14">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}
