import { CompoundInput, CompoundResult } from '@/types'
import { formatCurrency } from '@/lib/utils/formatters'

/**
 * Calculate Compound Interest
 *
 * Formula: A = P × (1 + r/n)^(n×t)
 * Where:
 *   P = Principal
 *   r = Annual interest rate (decimal)
 *   n = Compounding frequency per year
 *   t = Time in years
 */
export function calculateCompound(input: CompoundInput): CompoundResult {
  const { principal, rate, tenure, compoundingFrequency } = input

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
  const maturityAmount = principal * Math.pow(1 + rateDecimal / n, n * tenure)
  const interestEarned = maturityAmount - principal

  // Calculate equivalent simple interest rate
  const simpleInterestEquivalent = ((maturityAmount / principal - 1) / tenure) * 100

  // Chart data
  const chartData = [
    { label: 'Principal', value: principal, color: '#2563eb' },
    { label: 'Interest', value: interestEarned, color: '#10b981' },
  ]

  return {
    maturityAmount: Math.round(maturityAmount),
    interestEarned: Math.round(interestEarned),
    primary: {
      label: 'Total Amount',
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
        label: 'Effective Annual Rate',
        value: simpleInterestEquivalent,
        formatted: `${simpleInterestEquivalent.toFixed(2)}%`,
      },
    ],
    chartData,
  }
}

/**
 * Calculate simple interest (for comparison)
 */
export function calculateSimpleInterest(
  principal: number,
  rate: number,
  years: number
): { totalAmount: number; interestEarned: number } {
  const interestEarned = principal * (rate / 100) * years
  return {
    totalAmount: Math.round(principal + interestEarned),
    interestEarned: Math.round(interestEarned),
  }
}

/**
 * Compare compound vs simple interest
 */
export function compareInterest(
  principal: number,
  rate: number,
  years: number,
  compoundingFrequency: CompoundInput['compoundingFrequency']
): {
  compound: number
  simple: number
  difference: number
  differencePercent: number
} {
  const compound = calculateCompound({
    principal,
    rate,
    tenure: years,
    compoundingFrequency,
  }).maturityAmount

  const simple = calculateSimpleInterest(principal, rate, years).totalAmount

  const difference = compound - simple
  const differencePercent = ((compound - simple) / simple) * 100

  return {
    compound,
    simple,
    difference,
    differencePercent,
  }
}
