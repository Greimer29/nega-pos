import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useActiveCurrenciesQuery } from '@/features/currencies/hooks/use-currencies'
import {
  buildRatesMap,
  currencySymbol,
  formatAmountNumber,
  formatMoneyLabel,
  fromUsd,
  toUsd,
} from '@/features/currencies/utils/convert-currency'

const STORAGE_KEY = 'nega-pos-display-currency'

type DisplayCurrencyContextValue = {
  displayCurrency: string
  setDisplayCurrency: (code: string) => void
  currencies: Array<{ code: string; name: string; ratePerUsd: string; isActive: boolean }>
  rates: Record<string, number>
  isLoading: boolean
  toUsdAmount: (amount: number, currencyCode: string) => number
  fromUsdAmount: (amountUsd: number, targetCurrency?: string) => number
  formatInDisplay: (amount: number, sourceCurrency: string) => string
  formatFromUsd: (amountUsd: number) => string
  formatNative: (amount: string | number | null | undefined, currencyCode: string) => string
  symbol: (currencyCode?: string) => string
}

const DisplayCurrencyContext = createContext<DisplayCurrencyContextValue | null>(null)

export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const { data: currencies = [], isLoading } = useActiveCurrenciesQuery()
  const rates = useMemo(() => buildRatesMap(currencies), [currencies])

  const [displayCurrency, setDisplayCurrencyState] = useState(() => {
    if (typeof window === 'undefined') return 'USD'
    return localStorage.getItem(STORAGE_KEY) ?? 'USD'
  })

  const setDisplayCurrency = useCallback((code: string) => {
    setDisplayCurrencyState(code)
    localStorage.setItem(STORAGE_KEY, code)
  }, [])

  const effectiveDisplay =
    displayCurrency && rates[displayCurrency] ? displayCurrency : 'USD'

  const toUsdAmount = useCallback(
    (amount: number, currencyCode: string) => toUsd(amount, currencyCode, rates),
    [rates]
  )

  const fromUsdAmount = useCallback(
    (amountUsd: number, targetCurrency?: string) =>
      fromUsd(amountUsd, targetCurrency ?? effectiveDisplay, rates),
    [rates, effectiveDisplay]
  )

  const formatInDisplay = useCallback(
    (amount: number, sourceCurrency: string) => {
      const usd = toUsd(amount, sourceCurrency, rates)
      const converted = fromUsd(usd, effectiveDisplay, rates)
      return formatMoneyLabel(converted, effectiveDisplay)
    },
    [rates, effectiveDisplay]
  )

  const formatFromUsd = useCallback(
    (amountUsd: number) => {
      const converted = fromUsd(amountUsd, effectiveDisplay, rates)
      return formatMoneyLabel(converted, effectiveDisplay)
    },
    [rates, effectiveDisplay]
  )

  const formatNative = useCallback(
    (amount: string | number | null | undefined, currencyCode: string) =>
      formatMoneyLabel(amount, currencyCode),
    []
  )

  const value = useMemo(
    () => ({
      displayCurrency: effectiveDisplay,
      setDisplayCurrency,
      currencies,
      rates,
      isLoading,
      toUsdAmount,
      fromUsdAmount,
      formatInDisplay,
      formatFromUsd,
      formatNative,
      symbol: (currencyCode?: string) => currencySymbol(currencyCode ?? effectiveDisplay),
    }),
    [
      effectiveDisplay,
      setDisplayCurrency,
      currencies,
      rates,
      isLoading,
      toUsdAmount,
      fromUsdAmount,
      formatInDisplay,
      formatFromUsd,
      formatNative,
    ]
  )

  return (
    <DisplayCurrencyContext.Provider value={value}>{children}</DisplayCurrencyContext.Provider>
  )
}

export function useDisplayCurrency() {
  const context = useContext(DisplayCurrencyContext)
  if (!context) {
    throw new Error('useDisplayCurrency debe usarse dentro de DisplayCurrencyProvider')
  }
  return context
}

export function useFormatMoney() {
  const { formatInDisplay, formatFromUsd, formatNative, displayCurrency, symbol, rates } =
    useDisplayCurrency()

  return {
    displayCurrency,
    symbol,
    rates,
    formatInDisplay,
    formatFromUsd,
    formatNative,
    formatAmountNumber,
  }
}
