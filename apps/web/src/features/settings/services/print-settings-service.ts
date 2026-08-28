import type { PrintConfig } from '@/features/printing/types'
import { api } from '@/lib/api'

export type PrintConfigSaveScope = 'devices' | 'formats' | 'full'

export type PrintConfigSavePayload = {
  scope?: PrintConfigSaveScope
  ticket?: PrintConfig['ticket']
  formats?: PrintConfig['formats']
  documents?: PrintConfig['documents']
  behavior?: PrintConfig['behavior']
  categoryRouting?: PrintConfig['categoryRouting']
}

type PrintConfigApiResponse = {
  data: {
    print_config: PrintConfig
    persisted: boolean
  }
}

export type FetchPrintConfigResult = {
  printConfig: PrintConfig
  persisted: boolean
}

export async function fetchPrintConfig(): Promise<FetchPrintConfigResult> {
  const { data } = await api.get<PrintConfigApiResponse>('/settings/printing')
  return {
    printConfig: data.data.print_config,
    persisted: data.data.persisted,
  }
}

export async function savePrintConfigToApi(
  payload: PrintConfigSavePayload
): Promise<FetchPrintConfigResult> {
  const { data } = await api.put<PrintConfigApiResponse>('/settings/printing', payload)
  return {
    printConfig: data.data.print_config,
    persisted: data.data.persisted,
  }
}
