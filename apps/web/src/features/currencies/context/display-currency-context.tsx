import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  useActiveCurrenciesQuery,
  useBaseCurrencyQuery,
} from '@/features/currencies/hooks/use-currencies'
import {
  buildRatesMap,
  currencySymbol,
  formatAmountNumber,
  formatMoneyLabel,
  fromBase,
  toBase,
} from '@/features/currencies/utils/convert-currency'

/** v2: default = moneda base (XAU); invalida preferencia vieja en USD. */
const STORAGE_KEY = 'nega-pos-display-currency-v2'

type DisplayCurrencyContextValue = {
  displayCurrency: string
  baseCurrencyCode: string
  setDisplayCurrency: (code: string) => void
  currencies: Array<{ code: string; name: string; ratePerUsd: string; isActive: boolean }>
  rates: Record<string, number>
  isLoading: boolean
  toUsdAmount: (amount: number, currencyCode: string) => number
  fromUsdAmount: (amountUsd: number, targetCurrency?: string) => number
  toBaseAmount: (amount: number, currencyCode: string) => number
  fromBaseAmount: (amountBase: number, targetCurrency?: string) => number
  formatInDisplay: (amount: number, sourceCurrency: string) => string
  formatFromUsd: (amountUsd: number) => string
  formatNative: (amount: string | number | null | undefined, currencyCode: string) => string
  symbol: (currencyCode?: string) => string
}

const DisplayCurrencyContext = createContext<DisplayCurrencyContextValue | null>(null)

function sortCurrenciesWithBaseFirst<T extends { code: string }>(
  currencies: T[],
  baseCurrencyCode: string
): T[] {
  const base = baseCurrencyCode.toUpperCase()
  return [...currencies].sort((a, b) => {
    const aIsBase = a.code.toUpperCase() === base
    const bIsBase = b.code.toUpperCase() === base
    if (aIsBase && !bIsBase) return -1
    if (!aIsBase && bIsBase) return 1
    return a.code.localeCompare(b.code)
  })
}

export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const { data: currencies = [], isLoading: loadingCurrencies } = useActiveCurrenciesQuery()
  const { data: baseCurrencyCode = 'XAU', isLoading: loadingBase } = useBaseCurrencyQuery()
  const isLoading = loadingCurrencies || loadingBase

  const sortedCurrencies = useMemo(
    () => sortCurrenciesWithBaseFirst(currencies, baseCurrencyCode),
    [currencies, baseCurrencyCode]
  )

  const rates = useMemo(
    () => buildRatesMap(currencies, baseCurrencyCode),
    [currencies, baseCurrencyCode]
  )

  const [displayCurrency, setDisplayCurrencyState] = useState(() => {
    if (typeof window === 'undefined') return 'XAU'
    return localStorage.getItem(STORAGE_KEY) ?? 'XAU'
  })

  useEffect(() => {
    if (isLoading) return

    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    const preferred = stored && rates[stored] ? stored : baseCurrencyCode

    setDisplayCurrencyState((current) => (current === preferred ? current : preferred))

    if (!stored || !rates[stored]) {
      localStorage.setItem(STORAGE_KEY, baseCurrencyCode)
    }
  }, [isLoading, baseCurrencyCode, rates])

  const setDisplayCurrency = useCallback((code: string) => {
    setDisplayCurrencyState(code)
    localStorage.setItem(STORAGE_KEY, code)
  }, [])

  const effectiveDisplay =
    displayCurrency && rates[displayCurrency] ? displayCurrency : baseCurrencyCode

  const toBaseAmount = useCallback(
    (amount: number, currencyCode: string) => toBase(amount, currencyCode, rates, baseCurrencyCode),
    [rates, baseCurrencyCode]
  )

  const fromBaseAmount = useCallback(
    (amountBase: number, targetCurrency?: string) =>
      fromBase(amountBase, targetCurrency ?? effectiveDisplay, rates, baseCurrencyCode),
    [rates, effectiveDisplay, baseCurrencyCode]
  )

  const formatInDisplay = useCallback(
    (amount: number, sourceCurrency: string) => {
      const base = toBase(amount, sourceCurrency, rates, baseCurrencyCode)
      const converted = fromBase(base, effectiveDisplay, rates, baseCurrencyCode)
      return formatMoneyLabel(converted, effectiveDisplay)
    },
    [rates, effectiveDisplay, baseCurrencyCode]
  )

  const formatFromUsd = useCallback(
    (amountBase: number) => {
      const converted = fromBase(amountBase, effectiveDisplay, rates, baseCurrencyCode)
      return formatMoneyLabel(converted, effectiveDisplay)
    },
    [rates, effectiveDisplay, baseCurrencyCode]
  )

  const formatNative = useCallback(
    (amount: string | number | null | undefined, currencyCode: string) =>
      formatMoneyLabel(amount, currencyCode),
    []
  )

  const value = useMemo(
    () => ({
      displayCurrency: effectiveDisplay,
      baseCurrencyCode,
      setDisplayCurrency,
      currencies: sortedCurrencies,
      rates,
      isLoading,
      toUsdAmount: toBaseAmount,
      fromUsdAmount: fromBaseAmount,
      toBaseAmount,
      fromBaseAmount,
      formatInDisplay,
      formatFromUsd,
      formatNative,
      symbol: (currencyCode?: string) => currencySymbol(currencyCode ?? effectiveDisplay),
    }),
    [
      effectiveDisplay,
      baseCurrencyCode,
      setDisplayCurrency,
      sortedCurrencies,
      rates,
      isLoading,
      toBaseAmount,
      fromBaseAmount,
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
