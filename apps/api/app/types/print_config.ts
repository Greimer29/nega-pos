export type PrintDocumentKind = 'invoice' | 'deliveryNote' | 'comanda'

export type PrintDocumentSettings = {
  enabled: boolean
  deviceName: string
  paperWidthMm: number
  formatId: string
}

export type PrintBusinessConfig = {
  name: string
  subtitle: string
  footer: string
  legalName?: string
  rif?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  hasLogo?: boolean
  logoUrl?: string
}

export type PrintFormatRecord = {
  id: string
  name: string
  documentKind: PrintDocumentKind
  paperWidthMm: number
  bodyHtml: string
  isBuiltin: boolean
}

export type CategoryComandaRule = {
  category: string
  deviceName: string
}

export type CategoryComandaRouting = {
  enabled: boolean
  rules: CategoryComandaRule[]
}

export type PrintTicketConfig = {
  station_label: string
}

export type PrintConfig = {
  business: PrintBusinessConfig
  ticket: PrintTicketConfig
  formats: PrintFormatRecord[]
  documents: {
    invoice: PrintDocumentSettings
    deliveryNote: PrintDocumentSettings
    comanda: PrintDocumentSettings
  }
  behavior: {
    printInvoiceOnConfirm: boolean
    printDeliveryNoteOnConfirm: boolean
    printComandaOnConfirm: boolean
    printComandaFormula?: boolean
  }
  categoryRouting: {
    comanda: CategoryComandaRouting
  }
}

/** Stored JSON in app_settings — business is never the source of truth. */
export type StoredPrintConfig = Omit<PrintConfig, 'business'>

export type PrintConfigSaveScope = 'devices' | 'formats' | 'full'

export type PrintConfigPatch = {
  scope?: PrintConfigSaveScope
  ticket?: PrintTicketConfig
  formats?: PrintFormatRecord[]
  documents?: PrintConfig['documents']
  behavior?: PrintConfig['behavior']
  categoryRouting?: PrintConfig['categoryRouting']
}
