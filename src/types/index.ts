// ============ Core Types ============

export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP'
export type Locale = 'en-IN' | 'en-US' | 'en-GB'

export interface UserPreferences {
  currency: Currency
  locale: Locale
  theme: 'light' | 'dark' | 'system'
  defaultCalculator: CalculatorId
}

// ============ Calculator Types ============

export type CalculatorCategory = 'financial' | 'time' | 'planning' | 'comparison'

export type CalculatorId =
  | 'emi'
  | 'sip'
  | 'fd'
  | 'lumpsum'
  | 'compound'
  | 'home-emi'
  | 'tax-planner'
  | 'net-worth'
  | 'world-clock'
  | 'timezone'
  | 'meeting-planner'
  | 'cost-of-living'
  | 'trip-planner'

export interface CalculatorConfig {
  id: CalculatorId
  name: string
  description: string
  category: CalculatorCategory
  icon: string
  path: string
  phase: 1 | 2 | 3 | 4 | 5
  features: string[]
}

// Generic calculator input/output
export interface CalculatorInput {
  [key: string]: number | string | boolean | Date | undefined
}

export interface CalculatorResult<T = Record<string, unknown>> {
  primary: {
    label: string
    value: number
    formatted: string
  }
  secondary?: {
    label: string
    value: number
    formatted: string
  }[]
  breakdown?: T[]
  chartData?: ChartDataPoint[]
}

export interface ChartDataPoint {
  label: string
  value: number
  color?: string
}

// ============ EMI Calculator Types ============

export interface EMIInput {
  principal: number
  rate: number
  tenure: number
  tenureUnit: 'months' | 'years'
}

export interface EMIResult {
  emi: number
  totalInterest: number
  totalPayment: number
  primary: {
    label: string
    value: number
    formatted: string
  }
  secondary: {
    label: string
    value: number
    formatted: string
  }[]
  breakdown: AmortizationRow[]
  chartData: ChartDataPoint[]
}

export interface AmortizationRow {
  month: number
  year: number
  emi: number
  principal: number
  interest: number
  balance: number
}

// ============ SIP Calculator Types ============

export interface SIPInput {
  monthlyAmount: number
  rate: number
  tenure: number
  stepUp?: number
}

export interface SIPResult {
  maturityValue: number
  totalInvested: number
  totalReturns: number
  primary: {
    label: string
    value: number
    formatted: string
  }
  secondary: {
    label: string
    value: number
    formatted: string
  }[]
  breakdown: YearlyBreakdown[]
  chartData: ChartDataPoint[]
}

export interface YearlyBreakdown {
  year: number
  invested: number
  returns: number
  total: number
}

// ============ FD Calculator Types ============

export interface FDInput {
  principal: number
  rate: number
  tenure: number
  tenureUnit: 'days' | 'months' | 'years'
  compoundingFrequency: 'monthly' | 'quarterly' | 'halfYearly' | 'yearly'
}

export interface FDResult {
  maturityAmount: number
  interestEarned: number
  primary: {
    label: string
    value: number
    formatted: string
  }
  secondary: {
    label: string
    value: number
    formatted: string
  }[]
  chartData: ChartDataPoint[]
}

// ============ Lumpsum Calculator Types ============

export interface LumpsumInput {
  principal: number
  rate: number
  tenure: number
}

export interface LumpsumResult {
  maturityValue: number
  totalReturns: number
  primary: {
    label: string
    value: number
    formatted: string
  }
  secondary: {
    label: string
    value: number
    formatted: string
  }[]
  breakdown: YearlyBreakdown[]
  chartData: ChartDataPoint[]
}

// ============ Compound Interest Types ============

export interface CompoundInput {
  principal: number
  rate: number
  tenure: number
  compoundingFrequency: 'monthly' | 'quarterly' | 'halfYearly' | 'yearly'
}

export interface CompoundResult {
  maturityAmount: number
  interestEarned: number
  primary: {
    label: string
    value: number
    formatted: string
  }
  secondary: {
    label: string
    value: number
    formatted: string
  }[]
  chartData: ChartDataPoint[]
}

// ============ History Types ============

export interface CalculationHistory {
  id: string
  calculatorId: CalculatorId
  input: CalculatorInput
  result: CalculatorResult
  createdAt: string
  userId?: string
  isSynced: boolean
}
