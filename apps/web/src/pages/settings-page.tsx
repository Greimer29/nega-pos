import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PanelHeader } from '@/components/layout/panel-header'
import { SettingsHubPanelTransition } from '@/features/settings/components/settings-hub-panel-transition'
import { SettingsHubTabs } from '@/features/settings/components/settings-hub-tabs'
import {
  PROFIT_MARGIN_PANEL_ID,
  SETTINGS_HUB_PANEL_EXIT_MS,
  parseSettingsTab,
  type SettingsHubTab,
} from '@/features/settings/constants'

function shouldScrollToProfitMargin(
  hash: string,
  highlightProductId: number | undefined
) {
  return hash === `#${PROFIT_MARGIN_PANEL_ID}` || highlightProductId != null
}

function scrollToProfitMarginPanel() {
  const panel = document.getElementById(PROFIT_MARGIN_PANEL_ID)
  if (!panel) {
    return false
  }
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return true
}

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightProductId = Number(searchParams.get('productId') || 0) || undefined
  const [activeTab, setActiveTab] = useState<SettingsHubTab>(() =>
    parseSettingsTab(searchParams.get('tab'))
  )

  useEffect(() => {
    setActiveTab(parseSettingsTab(searchParams.get('tab')))
  }, [searchParams])

  function handleTabChange(tab: SettingsHubTab) {
    setActiveTab(tab)
    const next = new URLSearchParams(searchParams)
    next.set('tab', tab)
    if (tab !== 'compras') {
      next.delete('productId')
    }
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    if (activeTab !== 'compras') {
      return
    }
    if (!shouldScrollToProfitMargin(window.location.hash, highlightProductId)) {
      return
    }

    let cancelled = false
    let attempts = 0
    const maxAttempts = 12
    const timerIds: number[] = []

    const tryScroll = () => {
      if (cancelled) {
        return
      }
      attempts += 1
      if (scrollToProfitMarginPanel() || attempts >= maxAttempts) {
        return
      }
      timerIds.push(window.setTimeout(tryScroll, 50))
    }

    timerIds.push(window.setTimeout(tryScroll, SETTINGS_HUB_PANEL_EXIT_MS + 50))

    return () => {
      cancelled = true
      timerIds.forEach((id) => window.clearTimeout(id))
    }
  }, [activeTab, highlightProductId, searchParams])

  return (
    <div className="flex flex-col gap-6">
      <PanelHeader
        title="Configuración"
        description="Datos del negocio, formatos de ticket, impresión de ventas, tasa de cambio, margen y cuentas de compras."
      />

      <SettingsHubTabs activeTab={activeTab} onTabChange={handleTabChange} />

      <SettingsHubPanelTransition
        activeTab={activeTab}
        highlightProductId={highlightProductId}
      />
    </div>
  )
}
