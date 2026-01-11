import { FDInput, FDResult } from '@/types'
import { formatCurrency } from '@/lib/utils/formatters'

/**
 * Calculate Fixed Deposit maturity
 *
 * Formula: A = P × (1 + r/n)^(n×t)
 * Where:
 *   P = Principal
 *   r = Annual interest rate (decimal)
 *   n = Compounding frequency per year
 *   t = Time in years
 */
export function calculateFD(input: FDInput): FDResult {
  const { principal, rate, tenure, tenureUnit, compoundingFrequency } = input

  // Convert tenure to years
  let tenureYears: number
  switch (tenureUnit) {
    case 'days':
      tenureYears = tenure / 365
      break
    case 'months':
      tenureYears = tenure / 12
      break
    case 'years':
    default:
      tenureYears = tenure
  }

  // Compounding frequency per year
  const frequencyMap: Record<typeof compoundingFrequency, number> = {
    monthly: 12,
    quarterly: 4,
    halfYearly: 2,
    yearly: 1,
  }
  const n = frequencyMap[compoundingFrequency]

  // Calculate maturity amount
  const rateDecimal = rate / 100
  const maturityAmount = principal * Math.pow(1 + rateDecimal / n, n * tenureYears)
  const interestEarned = maturityAmount - principal

  // Chart data
  const chartData = [
    { label: 'Principal', value: principal, color: '#2563eb' },
    { label: 'Interest', value: interestEarned, color: '#10b981' },
  ]

  return {
    maturityAmount: Math.round(maturityAmount),
    interestEarned: Math.round(interestEarned),
    primary: {
      label: 'Maturity Amount',
      value: Math.round(maturityAmount),
      formatted: formatCurrency(Math.round(maturityAmount)),
    },
    secondary: [
      {
        label: 'Interest Earned',
        value: Math.round(interestEarned),
        formatted: formatCurrency(Math.round(interestEarned)),
      },
      {
        label: 'Principal',
        value: principal,
        formatted: formatCurrency(principal),
      },
      {
        label: 'Effective Rate',
        value: ((maturityAmount / principal - 1) / tenureYears) * 100,
        formatted: `${(((maturityAmount / principal - 1) / tenureYears) * 100).toFixed(2)}% p.a.`,
      },
    ],
    chartData,
  }
}

/**
 * Calculate simple interest FD (for comparison)
 */
export function calculateSimpleInterestFD(
  principal: number,
  rate: number,
  tenureYears: number
): { maturityAmount: number; interestEarned: number } {
  const interestEarned = principal * (rate / 100) * tenureYears
  const maturityAmount = principal + interestEarned

  return {
    maturityAmount: Math.round(maturityAmount),
    interestEarned: Math.round(interestEarned),
  }
}
