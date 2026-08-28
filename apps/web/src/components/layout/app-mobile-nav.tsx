import { Menu } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AppNavLinks, SidebarBrandFooter } from '@/components/layout/app-sidebar'
import { Button } from '@/components/ui/button'

type AppMobileNavProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AppMobileNavTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="md:hidden"
      aria-label="Abrir menú"
      onClick={onClick}
    >
      <Menu className="size-5" />
    </Button>
  )
}

export function AppMobileNav({ open, onOpenChange }: AppMobileNavProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-sidebar text-sidebar-foreground data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left top-0 left-0 flex h-svh max-h-svh w-[min(100vw,18rem)] max-w-[18rem] translate-x-0 translate-y-0 flex-col rounded-none border-y-0 border-l-0 p-0 sm:rounded-none"
        aria-describedby={undefined}
      >
        <DialogHeader className="flex h-14 shrink-0 flex-row items-center border-b px-4 text-left">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            NEGA <span className="font-light text-muted-foreground">POS</span>
          </DialogTitle>
        </DialogHeader>
        <AppNavLinks onNavigate={() => onOpenChange(false)} />
        <SidebarBrandFooter className="pb-[max(0.75rem,env(safe-area-inset-bottom))]" />
      </DialogContent>
    </Dialog>
  )
}
