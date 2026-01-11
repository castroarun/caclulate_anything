import { Currency, Locale } from '@/types'

/**
 * Format number with Indian numbering system (lakhs, crores)
 * e.g., 1234567 -> 12,34,567
 */
export function formatIndianNumber(num: number): string {
  const numStr = Math.round(num).toString()

  if (numStr.length <= 3) return numStr

  // Last 3 digits
  let result = numStr.slice(-3)
  // Remaining digits in pairs
  let remaining = numStr.slice(0, -3)

  while (remaining.length > 2) {
    result = remaining.slice(-2) + ',' + result
    remaining = remaining.slice(0, -2)
  }

  if (remaining.length > 0) {
    result = remaining + ',' + result
  }

  return result
}

/**
 * Parse Indian formatted number string back to number
 * e.g., "12,34,567" -> 1234567
 */
export function parseIndianNumber(str: string): number {
  const cleaned = str.replace(/,/g, '').replace(/[^0-9.-]/g, '')
  return parseFloat(cleaned) || 0
}

/**
 * Format currency based on locale
 */
export function formatCurrency(
  amount: number,
  currency: Currency = 'INR',
  locale: Locale = 'en-IN'
): string {
  const symbols: Record<Currency, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
  }

  const symbol = symbols[currency]

  if (currency === 'INR') {
    return `${symbol}${formatIndianNumber(amount)}`
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format currency with decimals
 */
export function formatCurrencyDecimal(
  amount: number,
  currency: Currency = 'INR',
  decimals: number = 2
): string {
  const symbols: Record<Currency, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
  }

  const symbol = symbols[currency]
  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return `${symbol}${formatted}`
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format large numbers with abbreviations
 * e.g., 1234567 -> 12.35L (for INR) or 1.23M (for USD)
 */
export function formatCompact(
  num: number,
  currency: Currency = 'INR'
): string {
  const symbols: Record<Currency, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
  }

  const symbol = symbols[currency]
  const absNum = Math.abs(num)
  const sign = num < 0 ? '-' : ''

  if (currency === 'INR') {
    // Indian system: Cr (crore = 10M), L (lakh = 100K)
    if (absNum >= 10000000) {
      return `${sign}${symbol}${(absNum / 10000000).toFixed(2)}Cr`
    }
    if (absNum >= 100000) {
      return `${sign}${symbol}${(absNum / 100000).toFixed(2)}L`
    }
    if (absNum >= 1000) {
      return `${sign}${symbol}${(absNum / 1000).toFixed(2)}K`
    }
    return `${sign}${symbol}${absNum.toFixed(0)}`
  }

  // Western system: B, M, K
  if (absNum >= 1000000000) {
    return `${sign}${symbol}${(absNum / 1000000000).toFixed(2)}B`
  }
  if (absNum >= 1000000) {
    return `${sign}${symbol}${(absNum / 1000000).toFixed(2)}M`
  }
  if (absNum >= 1000) {
    return `${sign}${symbol}${(absNum / 1000).toFixed(2)}K`
  }
  return `${sign}${symbol}${absNum.toFixed(0)}`
}

/**
 * Format tenure (months/years)
 */
export function formatTenure(months: number): string {
  if (months < 12) {
    return `${months} month${months !== 1 ? 's' : ''}`
  }

  const years = Math.floor(months / 12)
  const remainingMonths = months % 12

  if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`
  }

  return `${years}y ${remainingMonths}m`
}
