/** USD amount as written in price-change movement notes. */
export function formatUsdNote(value: string | number) {
  return Number(value).toFixed(4)
}
