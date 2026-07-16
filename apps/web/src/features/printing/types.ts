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

/** @deprecated Use CategoryComandaRule */
export type CategoryDeliveryRule = CategoryComandaRule

/** @deprecated Use CategoryComandaRouting */
export type CategoryDeliveryRouting = CategoryComandaRouting

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

export type PrinterInfo = {
  name: string
  isDefault: boolean
  status?: number
}

import { BUILTIN_FORMAT_IDS, DEFAULT_TICKET_PAPER_WIDTH_MM } from '@/features/printing/utils/print-format-defaults'
import { createBuiltinFormats } from '@/features/printing/utils/print-formats'

export const DEFAULT_PRINT_CONFIG: PrintConfig = {
  business: {
    name: '',
    subtitle: '',
    footer: 'Gracias por su compra',
    legalName: '',
    rif: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    hasLogo: false,
  },
  ticket: {
    station_label: '',
  },
  formats: createBuiltinFormats(),
  documents: {
    invoice: {
      enabled: true,
      deviceName: '',
      paperWidthMm: DEFAULT_TICKET_PAPER_WIDTH_MM,
      formatId: BUILTIN_FORMAT_IDS.invoice,
    },
    deliveryNote: {
      enabled: false,
      deviceName: '',
      paperWidthMm: DEFAULT_TICKET_PAPER_WIDTH_MM,
      formatId: BUILTIN_FORMAT_IDS.deliveryNote,
    },
    comanda: {
      enabled: false,
      deviceName: '',
      paperWidthMm: DEFAULT_TICKET_PAPER_WIDTH_MM,
      formatId: BUILTIN_FORMAT_IDS.comanda,
    },
  },
  behavior: {
    printInvoiceOnConfirm: true,
    printDeliveryNoteOnConfirm: false,
    printComandaOnConfirm: false,
    printComandaFormula: false,
  },
  categoryRouting: {
    comanda: {
      enabled: false,
      rules: [],
    },
  },
}

export const PRINT_DOCUMENT_LABELS: Record<PrintDocumentKind, string> = {
  invoice: 'Factura / Recibo',
  deliveryNote: 'Nota de despacho',
  comanda: 'Comanda',
}
