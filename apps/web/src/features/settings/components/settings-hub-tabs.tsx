import { Banknote, FileText, Settings, Store } from 'lucide-react'
import type { SettingsHubTab } from '@/features/settings/constants'
import { UpdateAvailableDot } from '@/features/settings/components/update-available-dot'
import { useUpdateAvailable } from '@/features/settings/hooks/use-app-update-latest-query'
import { cn } from '@/lib/utils'

type SettingsHubTabsProps = {
  activeTab: SettingsHubTab
  onTabChange: (tab: SettingsHubTab) => void
}

const tabs: Array<{ id: SettingsHubTab; label: string; icon: typeof Settings }> = [
  { id: 'general', label: 'General', icon: Store },
  { id: 'formatos', label: 'Formatos', icon: FileText },
  { id: 'ventas', label: 'Ventas', icon: Banknote },
  { id: 'compras', label: 'Compras', icon: Settings },
]

export function SettingsHubTabs({ activeTab, onTabChange }: SettingsHubTabsProps) {
  const updateAvailable = useUpdateAvailable()

  return (
    <div className="flex flex-wrap gap-2 border-b pb-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            activeTab === tab.id
              ? 'bg-primary/10 text-foreground'
              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
          )}
        >
          <tab.icon className="size-4" />
          {tab.label}
          {tab.id === 'general' && updateAvailable ? <UpdateAvailableDot /> : null}
        </button>
      ))}
    </div>
  )
}
