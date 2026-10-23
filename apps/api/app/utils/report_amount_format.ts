/** Native amount of a report movement: USD keeps 4 decimals, other currencies 2. */
export function formatReportNative(value: number, currencyCode: string): string {
  return currencyCode === 'USD' ? value.toFixed(4) : value.toFixed(2)
}

/** Amount shown in the report display currency. */
export function formatReportDisplay(value: number, _currencyCode: string): string {
  return value.toFixed(2)
}
