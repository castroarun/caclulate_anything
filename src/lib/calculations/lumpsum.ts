import { LumpsumInput, LumpsumResult, YearlyBreakdown } from '@/types'
import { formatCurrency } from '@/lib/utils/formatters'

/**
 * Calculate Lumpsum investment returns
 *
 * Formula: FV = P × (1 + r)^n
 * Where:
 *   P = Principal (one-time investment)
 *   r = Annual return rate (decimal)
 *   n = Number of years
 */
export function calculateLumpsum(input: LumpsumInput): LumpsumResult {
  const { principal, rate, tenure } = input

  const rateDecimal = rate / 100
  const maturityValue = principal * Math.pow(1 + rateDecimal, tenure)
  const totalReturns = maturityValue - principal

  // Generate yearly breakdown
  const breakdown = generateYearlyBreakdown(principal, rate, tenure)

  // Chart data
  const chartData = [
    { label: 'Principal', value: principal, color: '#2563eb' },
    { label: 'Returns', value: totalReturns, color: '#10b981' },
  ]

  return {
    maturityValue: Math.round(maturityValue),
    totalReturns: Math.round(totalReturns),
    primary: {
      label: 'Maturity Value',
      value: Math.round(maturityValue),
      formatted: formatCurrency(Math.round(maturityValue)),
    },
    secondary: [
      {
        label: 'Total Returns',
        value: Math.round(totalReturns),
        formatted: formatCurrency(Math.round(totalReturns)),
      },
      {
        label: 'Principal',
        value: principal,
        formatted: formatCurrency(principal),
      },
      {
        label: 'Absolute Return',
        value: (totalReturns / principal) * 100,
        formatted: `${((totalReturns / principal) * 100).toFixed(1)}%`,
      },
    ],
    breakdown,
    chartData,
  }
}

/**
 * Generate yearly breakdown
 */
function generateYearlyBreakdown(
  principal: number,
  annualRate: number,
  years: number
): YearlyBreakdown[] {
  const rateDecimal = annualRate / 100
  const breakdown: YearlyBreakdown[] = []

  for (let year = 1; year <= years; year++) {
    const total = principal * Math.pow(1 + rateDecimal, year)
    const returns = total - principal

    breakdown.push({
      year,
      invested: principal,
      returns: Math.round(returns),
      total: Math.round(total),
    })
  }

  return breakdown
}

/**
 * Calculate CAGR (Compound Annual Growth Rate)
 */
export function calculateCAGR(
  initialValue: number,
  finalValue: number,
  years: number
): number {
  if (initialValue <= 0 || years <= 0) return 0
  return (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100
}

/**
 * Calculate future value at given CAGR
 */
export function calculateFutureValue(
  principal: number,
  cagr: number,
  years: number
): number {
  return principal * Math.pow(1 + cagr / 100, years)
}
