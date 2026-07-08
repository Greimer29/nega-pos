import { useEffect, useState } from 'react'
import type { SettingsHubTab } from '@/features/settings/constants'
import { SETTINGS_HUB_PANEL_EXIT_MS } from '@/features/settings/constants'
import { SettingsComprasPanel } from '@/features/settings/components/settings-compras-panel'
import { SettingsFormatosPanel } from '@/features/settings/components/settings-formatos-panel'
import { SettingsGeneralPanel } from '@/features/settings/components/settings-general-panel'
import { SettingsVentasPrintPanel } from '@/features/settings/components/settings-ventas-print-panel'
import { cn } from '@/lib/utils'

type SettingsHubPanelTransitionProps = {
  activeTab: SettingsHubTab
  highlightProductId?: number
}

function renderPanel(tab: SettingsHubTab, highlightProductId?: number) {
  switch (tab) {
    case 'general':
      return <SettingsGeneralPanel />
    case 'formatos':
      return <SettingsFormatosPanel />
    case 'ventas':
      return <SettingsVentasPrintPanel />
    case 'compras':
      return <SettingsComprasPanel highlightProductId={highlightProductId} />
  }
}

export function SettingsHubPanelTransition({
  activeTab,
  highlightProductId,
}: SettingsHubPanelTransitionProps) {
  const [displayedTab, setDisplayedTab] = useState(activeTab)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    if (activeTab === displayedTab) {
      return
    }

    setIsLeaving(true)
    const timer = window.setTimeout(() => {
      setDisplayedTab(activeTab)
      setIsLeaving(false)
    }, SETTINGS_HUB_PANEL_EXIT_MS)

    return () => window.clearTimeout(timer)
  }, [activeTab, displayedTab])

  return (
    <div
      className={cn(
        'settings-hub-panel',
        isLeaving ? 'settings-hub-panel--exit' : 'settings-hub-panel--enter'
      )}
    >
      {renderPanel(displayedTab, highlightProductId)}
    </div>
  )
}
