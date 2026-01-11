import { EMIInput, EMIResult, AmortizationRow } from '@/types'
import { formatCurrency, formatPercent } from '@/lib/utils/formatters'

/**
 * Calculate EMI (Equated Monthly Installment)
 *
 * Formula: EMI = P × r × (1 + r)^n / ((1 + r)^n - 1)
 * Where:
 *   P = Principal loan amount
 *   r = Monthly interest rate (annual rate / 12 / 100)
 *   n = Number of months
 */
export function calculateEMI(input: EMIInput): EMIResult {
  const { principal, rate, tenure, tenureUnit } = input

  // Convert tenure to months if in years
  const tenureMonths = tenureUnit === 'years' ? tenure * 12 : tenure

  // Monthly interest rate
  const monthlyRate = rate / 12 / 100

  // Handle 0% interest rate edge case
  let emi: number
  if (rate === 0) {
    emi = principal / tenureMonths
  } else {
    const compoundFactor = Math.pow(1 + monthlyRate, tenureMonths)
    emi = (principal * monthlyRate * compoundFactor) / (compoundFactor - 1)
  }

  // Total payment and interest
  const totalPayment = emi * tenureMonths
  const totalInterest = totalPayment - principal

  // Generate amortization schedule
  const breakdown = generateAmortization(principal, monthlyRate, tenureMonths, emi)

  // Chart data (Principal vs Interest)
  const chartData = [
    { label: 'Principal', value: principal, color: '#2563eb' },
    { label: 'Interest', value: totalInterest, color: '#10b981' },
  ]

  return {
    emi: Math.round(emi),
    totalInterest: Math.round(totalInterest),
    totalPayment: Math.round(totalPayment),
    primary: {
      label: 'Monthly EMI',
      value: Math.round(emi),
      formatted: formatCurrency(Math.round(emi)),
    },
    secondary: [
      {
        label: 'Total Interest',
        value: Math.round(totalInterest),
        formatted: formatCurrency(Math.round(totalInterest)),
      },
      {
        label: 'Total Payment',
        value: Math.round(totalPayment),
        formatted: formatCurrency(Math.round(totalPayment)),
      },
      {
        label: 'Interest %',
        value: (totalInterest / principal) * 100,
        formatted: formatPercent((totalInterest / principal) * 100, 1),
      },
    ],
    breakdown,
    chartData,
  }
}

/**
 * Generate amortization schedule
 */
function generateAmortization(
  principal: number,
  monthlyRate: number,
  tenureMonths: number,
  emi: number
): AmortizationRow[] {
  const schedule: AmortizationRow[] = []
  let balance = principal

  for (let month = 1; month <= tenureMonths; month++) {
    const interest = balance * monthlyRate
    const principalPart = emi - interest
    balance = Math.max(0, balance - principalPart)

    schedule.push({
      month,
      year: Math.ceil(month / 12),
      emi: Math.round(emi),
      principal: Math.round(principalPart),
      interest: Math.round(interest),
      balance: Math.round(balance),
    })
  }

  return schedule
}

/**
 * Calculate affordable loan amount based on EMI
 */
export function calculateAffordableLoan(
  monthlyEmi: number,
  rate: number,
  tenureMonths: number
): number {
  const monthlyRate = rate / 12 / 100

  if (rate === 0) {
    return monthlyEmi * tenureMonths
  }

  const compoundFactor = Math.pow(1 + monthlyRate, tenureMonths)
  const principal = (monthlyEmi * (compoundFactor - 1)) / (monthlyRate * compoundFactor)

  return Math.round(principal)
}

/**
 * Calculate tenure for given EMI and loan amount
 */
export function calculateTenure(
  principal: number,
  monthlyEmi: number,
  rate: number
): number {
  const monthlyRate = rate / 12 / 100

  if (rate === 0) {
    return Math.ceil(principal / monthlyEmi)
  }

  // n = log(EMI / (EMI - P * r)) / log(1 + r)
  const numerator = Math.log(monthlyEmi / (monthlyEmi - principal * monthlyRate))
  const denominator = Math.log(1 + monthlyRate)

  return Math.ceil(numerator / denominator)
}
