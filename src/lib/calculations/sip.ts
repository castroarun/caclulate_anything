import { SIPInput, SIPResult, YearlyBreakdown } from '@/types'
import { formatCurrency } from '@/lib/utils/formatters'

/**
 * Calculate SIP (Systematic Investment Plan) returns
 *
 * Formula: FV = P × ((1 + r)^n - 1) / r × (1 + r)
 * Where:
 *   P = Monthly investment
 *   r = Monthly return rate (annual rate / 12 / 100)
 *   n = Number of months
 */
export function calculateSIP(input: SIPInput): SIPResult {
  const { monthlyAmount, rate, tenure, stepUp = 0 } = input

  const tenureMonths = tenure * 12
  const monthlyRate = rate / 12 / 100

  let maturityValue: number
  let totalInvested: number
  let breakdown: YearlyBreakdown[]

  if (stepUp > 0) {
    // Calculate with step-up
    const result = calculateSIPWithStepUp(monthlyAmount, rate, tenure, stepUp)
    maturityValue = result.maturityValue
    totalInvested = result.totalInvested
    breakdown = result.breakdown
  } else {
    // Standard SIP calculation
    if (rate === 0) {
      maturityValue = monthlyAmount * tenureMonths
    } else {
      const compoundFactor = Math.pow(1 + monthlyRate, tenureMonths)
      maturityValue =
        monthlyAmount * ((compoundFactor - 1) / monthlyRate) * (1 + monthlyRate)
    }

    totalInvested = monthlyAmount * tenureMonths
    breakdown = generateYearlyBreakdown(monthlyAmount, rate, tenure)
  }

  const totalReturns = maturityValue - totalInvested

  // Chart data
  const chartData = [
    { label: 'Invested', value: totalInvested, color: '#2563eb' },
    { label: 'Returns', value: totalReturns, color: '#10b981' },
  ]

  return {
    maturityValue: Math.round(maturityValue),
    totalInvested: Math.round(totalInvested),
    totalReturns: Math.round(totalReturns),
    primary: {
      label: 'Maturity Value',
      value: Math.round(maturityValue),
      formatted: formatCurrency(Math.round(maturityValue)),
    },
    secondary: [
      {
        label: 'Total Invested',
        value: Math.round(totalInvested),
        formatted: formatCurrency(Math.round(totalInvested)),
      },
      {
        label: 'Total Returns',
        value: Math.round(totalReturns),
        formatted: formatCurrency(Math.round(totalReturns)),
      },
      {
        label: 'Wealth Gain',
        value: (totalReturns / totalInvested) * 100,
        formatted: `${((totalReturns / totalInvested) * 100).toFixed(1)}%`,
      },
    ],
    breakdown,
    chartData,
  }
}

/**
 * Calculate SIP with annual step-up
 */
function calculateSIPWithStepUp(
  initialAmount: number,
  annualRate: number,
  years: number,
  stepUpPercent: number
): { maturityValue: number; totalInvested: number; breakdown: YearlyBreakdown[] } {
  const monthlyRate = annualRate / 12 / 100
  let totalValue = 0
  let totalInvested = 0
  let currentMonthlyAmount = initialAmount
  const breakdown: YearlyBreakdown[] = []

  for (let year = 1; year <= years; year++) {
    // Calculate value for this year's contributions
    const monthsRemaining = (years - year + 1) * 12

    for (let month = 1; month <= 12; month++) {
      const monthsToMaturity = monthsRemaining - month + 1
      const futureValue =
        currentMonthlyAmount * Math.pow(1 + monthlyRate, monthsToMaturity)
      totalValue += futureValue
      totalInvested += currentMonthlyAmount
    }

    breakdown.push({
      year,
      invested: Math.round(totalInvested),
      returns: Math.round(totalValue - totalInvested),
      total: Math.round(totalValue),
    })

    // Increase SIP amount for next year
    currentMonthlyAmount *= 1 + stepUpPercent / 100
  }

  return {
    maturityValue: totalValue,
    totalInvested,
    breakdown,
  }
}

/**
 * Generate yearly breakdown for standard SIP
 */
function generateYearlyBreakdown(
  monthlyAmount: number,
  annualRate: number,
  years: number
): YearlyBreakdown[] {
  const monthlyRate = annualRate / 12 / 100
  const breakdown: YearlyBreakdown[] = []

  for (let year = 1; year <= years; year++) {
    const months = year * 12
    let total: number

    if (annualRate === 0) {
      total = monthlyAmount * months
    } else {
      const compoundFactor = Math.pow(1 + monthlyRate, months)
      total = monthlyAmount * ((compoundFactor - 1) / monthlyRate) * (1 + monthlyRate)
    }

    const invested = monthlyAmount * months
    const returns = total - invested

    breakdown.push({
      year,
      invested: Math.round(invested),
      returns: Math.round(returns),
      total: Math.round(total),
    })
  }

  return breakdown
}

/**
 * Calculate required SIP for target amount
 */
export function calculateRequiredSIP(
  targetAmount: number,
  annualRate: number,
  years: number
): number {
  const monthlyRate = annualRate / 12 / 100
  const months = years * 12

  if (annualRate === 0) {
    return Math.ceil(targetAmount / months)
  }

  const compoundFactor = Math.pow(1 + monthlyRate, months)
  const monthlySip = targetAmount / (((compoundFactor - 1) / monthlyRate) * (1 + monthlyRate))

  return Math.ceil(monthlySip)
}
