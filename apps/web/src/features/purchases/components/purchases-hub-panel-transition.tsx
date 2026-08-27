import { useEffect, useState } from 'react'
import type { PurchasesHubTab } from '@/features/purchases/constants'
import { PurchasesComprasPanel } from '@/features/purchases/components/purchases-compras-panel'
import { PurchasesGastosPanel } from '@/features/purchases/components/purchases-gastos-panel'
import { PurchasesIngresosPanel } from '@/features/purchases/components/purchases-ingresos-panel'
import { cn } from '@/lib/utils'

export const PURCHASES_HUB_PANEL_EXIT_MS = 220

const PANEL_EXIT_MS = PURCHASES_HUB_PANEL_EXIT_MS

type PurchasesHubPanelTransitionProps = {
  activeTab: PurchasesHubTab
}

function renderPanel(tab: PurchasesHubTab) {
  switch (tab) {
    case 'compras':
      return <PurchasesComprasPanel />
    case 'gastos':
      return <PurchasesGastosPanel />
    case 'ingresos':
      return <PurchasesIngresosPanel />
  }
}

export function PurchasesHubPanelTransition({ activeTab }: PurchasesHubPanelTransitionProps) {
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
    }, PANEL_EXIT_MS)

    return () => window.clearTimeout(timer)
  }, [activeTab, displayedTab])

  return (
    <div
      className={cn(
        'purchases-hub-panel',
        isLeaving ? 'purchases-hub-panel--exit' : 'purchases-hub-panel--enter'
      )}
    >
      {renderPanel(displayedTab)}
    </div>
  )
}
