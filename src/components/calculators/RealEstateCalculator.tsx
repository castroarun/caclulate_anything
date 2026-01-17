'use client'

import { useState, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useNumberFormat } from '@/contexts/NumberFormatContext'

// Cost Inflation Index (CII) Data - Base Year 2001-02 = 100
const CII_DATA: Record<string, number> = {
  '2001': 100, '2002': 105, '2003': 109, '2004': 113, '2005': 117,
  '2006': 122, '2007': 129, '2008': 137, '2009': 148, '2010': 167,
  '2011': 184, '2012': 200, '2013': 220, '2014': 240, '2015': 254,
  '2016': 264, '2017': 272, '2018': 280, '2019': 289, '2020': 301,
  '2021': 317, '2022': 331, '2023': 348, '2024': 363, '2025': 376,
  '2026': 390, // Estimated (~3.7% growth)
}

// Get financial year from date
function getFinancialYear(date: Date): string {
  const month = date.getMonth()
  const year = date.getFullYear()
  // FY starts April 1st
  return month >= 3 ? String(year) : String(year - 1)
}

// Get CII for a date
function getCII(date: Date): number {
  const fy = getFinancialYear(date)
  return CII_DATA[fy] || CII_DATA['2026']
}

// Calculate holding period in months
function getHoldingPeriod(purchaseDate: Date, saleDate: Date): { months: number; years: number; isLongTerm: boolean } {
  const diffTime = saleDate.getTime() - purchaseDate.getTime()
  const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44))
  const years = Math.floor(diffMonths / 12)
  const months = diffMonths % 12
  // Long-term if held >= 24 months for immovable property
  const isLongTerm = diffMonths >= 24
  return { months: diffMonths, years, isLongTerm }
}


// Interfaces
interface PropertyDetails {
  propertyType: 'residential' | 'commercial' | 'land'
  purchaseDate: string
  purchasePrice: number
  stampDuty: number
  improvementCost: number
  improvementDate: string
  saleDate: string
  salePrice: number
  brokerage: number
  legalFees: number
}

interface CapitalGainsResult {
  holdingPeriod: { months: number; years: number; isLongTerm: boolean }
  purchaseCII: number
  saleCII: number
  indexedPurchaseCost: number
  indexedImprovementCost: number
  totalIndexedCost: number
  transferExpenses: number
  netSaleConsideration: number
  capitalGain: number
  taxRate: number
  taxBeforeCess: number
  cess: number
  totalTax: number
  netProceeds: number
  useNewRegime: boolean
  // For pre-July 2024 properties - compare both regimes
  canChooseRegime: boolean
  oldRegime?: {
    capitalGain: number
    taxRate: number
    totalTax: number
    netProceeds: number
  }
  newRegime?: {
    capitalGain: number
    taxRate: number
    totalTax: number
    netProceeds: number
  }
  recommendedRegime?: 'old' | 'new'
}

interface ExemptionStrategy {
  section: string
  name: string
  description: string
  maxExemption: number
  investmentRequired: number
  taxSaved: number
  deadline: Date
  lockInYears: number
  isEligible: boolean
  notes: string[]
  // Bond-specific details for 54EC
  bondDetails?: {
    interestRate: number
    totalInterest: number
    maturityValue: number
    taxOnInterest: number // Interest taxed at slab rate (assuming 30%)
    netMaturityValue: number
  }
  // Section 54/54F property projections
  propertyProjection?: {
    originalPropertyCAGR: number // Annual appreciation rate of sold property
    appreciationRate: number // User-selected appreciation rate for new property
    projectedPropertyValue: number // Value after lock-in period
    capitalAppreciation: number // Property value increase
    rentalEnabled: boolean
    monthlyRent: number
    rentStartMonth: number // Which month rent collection starts
    totalRentalIncome: number // Total rent collected over lock-in
    totalReturns: number // Appreciation + Rental - Investment
    annualizedReturn: number // CAGR of total returns
    // Tax breakdown for net proceeds
    taxSlab: number // User's income tax slab (10/20/30%)
    taxOnRentalIncome: number // Tax on rental income at slab rate
    taxOnAppreciation: number // LTCG tax on property appreciation (12.5%)
    totalTaxOnReturns: number // Total tax on returns
    netCashInHand: number // Final amount after all taxes
    comparisonWithoutExemption: {
      taxPaid: number
      investedAmount: number // After-tax amount if invested elsewhere
      returnAt8Percent: number // Assuming 8% FD/debt returns
      taxOnFDReturns: number // Tax on FD interest at slab rate
      netFDReturns: number // Net FD returns after tax
    }
  }
}

// Indian income tax slabs
const TAX_SLABS = [
  { value: 0, label: '0%', description: 'Up to ₹3L (New) / ₹2.5L (Old)' },
  { value: 5, label: '5%', description: '₹3-7L (New) / ₹2.5-5L (Old)' },
  { value: 10, label: '10%', description: '₹7-10L (New)' },
  { value: 15, label: '15%', description: '₹10-12L (New)' },
  { value: 20, label: '20%', description: '₹5-10L (Old) / ₹12-15L (New)' },
  { value: 30, label: '30%', description: 'Above ₹10L (Old) / ₹15L (New)' },
]

// State for Section 54 projections
interface Section54ProjectionState {
  appreciationRate: number
  enableRental: boolean
  monthlyRent: number
  rentStartMonth: number // Months after purchase when rent starts (e.g., 0 = immediate, 12 = after 1 year)
  taxSlab: number // User's income tax slab percentage (0/5/10/15/20/30)
}

// Reinvestment allocation state - how to allocate sale proceeds after tax
interface ReinvestmentAllocation {
  // Personal use/obligations - money taken out for personal needs
  personalUse: {
    enabled: boolean
    amount: number
  }
  // Section 54EC bonds investment
  bonds: {
    enabled: boolean
    amount: number
  }
  // Real estate reinvestment with rental projections
  realEstate: {
    enabled: boolean
    amount: number
    appreciationRate: number
    enableRental: boolean
    monthlyRent: number
    rentStartMonth: number
  }
}

// Calculate capital gains
function calculateCapitalGains(property: PropertyDetails): CapitalGainsResult {
  const purchaseDate = new Date(property.purchaseDate)
  const saleDate = new Date(property.saleDate)
  const holdingPeriod = getHoldingPeriod(purchaseDate, saleDate)

  const purchaseCII = getCII(purchaseDate)
  const saleCII = getCII(saleDate)

  // Check if property acquired after July 23, 2024 (new regime mandatory)
  const newRegimeDate = new Date('2024-07-23')
  const mustUseNewRegime = purchaseDate >= newRegimeDate

  // For LTCG on pre-July 2024 properties, taxpayer can CHOOSE either regime
  const canChooseRegime = holdingPeriod.isLongTerm && !mustUseNewRegime

  // Total purchase cost (without indexation)
  const totalPurchaseCost = property.purchasePrice + property.stampDuty
  const transferExpenses = property.brokerage + property.legalFees
  const netSaleConsideration = property.salePrice - transferExpenses

  // Calculate OLD REGIME (20% with indexation)
  let indexedPurchaseCost = totalPurchaseCost
  let indexedImprovementCost = property.improvementCost

  if (holdingPeriod.isLongTerm) {
    indexedPurchaseCost = Math.round((totalPurchaseCost * saleCII) / purchaseCII)
    if (property.improvementCost > 0 && property.improvementDate) {
      const improvementCII = getCII(new Date(property.improvementDate))
      indexedImprovementCost = Math.round((property.improvementCost * saleCII) / improvementCII)
    }
  }
  const totalIndexedCost = indexedPurchaseCost + indexedImprovementCost
  const capitalGainOld = netSaleConsideration - totalIndexedCost
  const taxOld = Math.max(0, capitalGainOld) * 0.20 * 1.04 // 20% + 4% cess

  // Calculate NEW REGIME (12.5% without indexation)
  const capitalGainNew = netSaleConsideration - totalPurchaseCost - property.improvementCost
  const taxNew = Math.max(0, capitalGainNew) * 0.125 * 1.04 // 12.5% + 4% cess

  // Determine which regime is better (lower tax)
  const recommendedRegime = taxOld <= taxNew ? 'old' : 'new'

  // Use the recommended regime for display (or new regime if mandatory)
  const useNewRegime = mustUseNewRegime || (!canChooseRegime ? false : recommendedRegime === 'new')

  // Final values based on selected/recommended regime
  let capitalGain: number
  let taxRate: number
  let totalTax: number

  if (!holdingPeriod.isLongTerm) {
    // STCG - taxed at slab rate, assuming 30% for high income
    capitalGain = netSaleConsideration - totalPurchaseCost - property.improvementCost
    taxRate = 30
    totalTax = Math.max(0, capitalGain) * 0.30 * 1.04
  } else if (useNewRegime) {
    capitalGain = capitalGainNew
    taxRate = 12.5
    totalTax = taxNew
  } else {
    capitalGain = capitalGainOld
    taxRate = 20
    totalTax = taxOld
  }

  const taxBeforeCess = totalTax / 1.04
  const cess = totalTax - taxBeforeCess
  const netProceeds = property.salePrice - transferExpenses - totalTax

  return {
    holdingPeriod,
    purchaseCII,
    saleCII,
    indexedPurchaseCost,
    indexedImprovementCost,
    totalIndexedCost,
    transferExpenses,
    netSaleConsideration,
    capitalGain,
    taxRate,
    taxBeforeCess,
    cess,
    totalTax,
    netProceeds,
    useNewRegime,
    canChooseRegime,
    oldRegime: canChooseRegime ? {
      capitalGain: capitalGainOld,
      taxRate: 20,
      totalTax: taxOld,
      netProceeds: property.salePrice - transferExpenses - taxOld,
    } : undefined,
    newRegime: canChooseRegime ? {
      capitalGain: capitalGainNew,
      taxRate: 12.5,
      totalTax: taxNew,
      netProceeds: property.salePrice - transferExpenses - taxNew,
    } : undefined,
    recommendedRegime: canChooseRegime ? recommendedRegime : undefined,
  }
}

// Calculate CAGR (Compound Annual Growth Rate)
function calculateCAGR(beginValue: number, endValue: number, years: number): number {
  if (beginValue <= 0 || years <= 0) return 0
  return (Math.pow(endValue / beginValue, 1 / years) - 1) * 100
}

// Split-bracket tax calculation for additional income
// Takes into account current taxable income and calculates tax with proper bracket splitting
interface SplitBracketParams {
  additionalIncome: number
  currentTaxableIncome: number
  regime: 'new' | 'old'
  includeCess?: boolean
}

interface SplitBracketResult {
  tax: number
  breakdown: Array<{ rate: number; amount: number; tax: number }>
  effectiveRate: number
}

function calculateSplitBracketTax(params: SplitBracketParams): SplitBracketResult {
  const { additionalIncome, currentTaxableIncome, regime, includeCess = true } = params
  const cessRate = includeCess ? 0.04 : 0

  if (additionalIncome <= 0) {
    return { tax: 0, breakdown: [], effectiveRate: 0 }
  }

  // Tax brackets for New Regime (FY 2024-25 onwards)
  const newRegimeBrackets = [
    { limit: 300000, rate: 0 },
    { limit: 700000, rate: 5 },
    { limit: 1000000, rate: 10 },
    { limit: 1200000, rate: 15 },
    { limit: 1500000, rate: 20 },
    { limit: Infinity, rate: 30 },
  ]

  // Tax brackets for Old Regime
  const oldRegimeBrackets = [
    { limit: 250000, rate: 0 },
    { limit: 500000, rate: 5 },
    { limit: 1000000, rate: 20 },
    { limit: Infinity, rate: 30 },
  ]

  const brackets = regime === 'new' ? newRegimeBrackets : oldRegimeBrackets
  const breakdown: Array<{ rate: number; amount: number; tax: number }> = []

  let remainingIncome = additionalIncome
  let totalIncome = currentTaxableIncome
  let totalTax = 0

  // Find the current bracket and room left
  for (let i = 0; i < brackets.length && remainingIncome > 0; i++) {
    const bracket = brackets[i]
    const prevLimit = i === 0 ? 0 : brackets[i - 1].limit

    // If current income is already above this bracket, skip
    if (totalIncome >= bracket.limit) continue

    // Calculate room in this bracket
    const roomInBracket = bracket.limit - Math.max(totalIncome, prevLimit)
    const incomeInThisBracket = Math.min(remainingIncome, roomInBracket)

    if (incomeInThisBracket > 0) {
      const taxInBracket = Math.round(incomeInThisBracket * (bracket.rate / 100))
      totalTax += taxInBracket
      breakdown.push({
        rate: bracket.rate,
        amount: incomeInThisBracket,
        tax: taxInBracket,
      })
      remainingIncome -= incomeInThisBracket
      totalIncome += incomeInThisBracket
    }
  }

  // Add cess
  const cessAmount = Math.round(totalTax * cessRate)
  const finalTax = totalTax + cessAmount

  return {
    tax: finalTax,
    breakdown,
    effectiveRate: additionalIncome > 0 ? (finalTax / additionalIncome) * 100 : 0,
  }
}

// Salary data for split-bracket calculations
interface SalaryDataForCalc {
  usingSalaryRate: boolean
  taxableIncome: number
  regime: 'new' | 'old'
}

// Calculate exemption strategies
function calculateExemptions(
  property: PropertyDetails,
  result: CapitalGainsResult,
  projectionState: Section54ProjectionState,
  salaryDataForCalc?: SalaryDataForCalc
): ExemptionStrategy[] {
  const saleDate = new Date(property.saleDate)
  const purchaseDate = new Date(property.purchaseDate)
  const capitalGain = Math.max(0, result.capitalGain)
  const strategies: ExemptionStrategy[] = []

  // Calculate original property's CAGR for reference
  const holdingYears = result.holdingPeriod.months / 12
  const originalCAGR = calculateCAGR(
    property.purchasePrice + property.stampDuty,
    property.salePrice,
    holdingYears
  )

  // Only LTCG is eligible for exemptions
  if (!result.holdingPeriod.isLongTerm || capitalGain <= 0) {
    return strategies
  }

  // Section 54 - Residential Property Reinvestment
  if (property.propertyType === 'residential') {
    const deadline = new Date(saleDate)
    deadline.setFullYear(deadline.getFullYear() + 2)

    // Max exemption capped at ₹10Cr from AY 2024-25
    const maxExemption = Math.min(capitalGain, 100000000)
    const taxSaved = (maxExemption * result.taxRate / 100) * 1.04
    const lockInYears = 3

    // Calculate property projections
    const investmentAmount = maxExemption
    const appreciationRate = projectionState.appreciationRate
    const projectedPropertyValue = Math.round(
      investmentAmount * Math.pow(1 + appreciationRate / 100, lockInYears)
    )
    const capitalAppreciation = projectedPropertyValue - investmentAmount

    // Rental income calculation
    const rentMonths = Math.max(0, (lockInYears * 12) - projectionState.rentStartMonth)
    const totalRentalIncome = projectionState.enableRental
      ? projectionState.monthlyRent * rentMonths
      : 0

    const totalReturns = capitalAppreciation + totalRentalIncome
    const annualizedReturn = calculateCAGR(
      investmentAmount,
      investmentAmount + totalReturns,
      lockInYears
    )

    // Tax calculations on returns - use split-bracket if salary data available
    const cessRate = 0.04

    // Calculate tax on rental income with split-bracket if using salary data
    let taxOnRentalIncome: number
    if (salaryDataForCalc?.usingSalaryRate && totalRentalIncome > 0) {
      const rentalTaxResult = calculateSplitBracketTax({
        additionalIncome: totalRentalIncome,
        currentTaxableIncome: salaryDataForCalc.taxableIncome,
        regime: salaryDataForCalc.regime,
      })
      taxOnRentalIncome = rentalTaxResult.tax
    } else {
      const taxSlab = projectionState.taxSlab / 100
      taxOnRentalIncome = Math.round(totalRentalIncome * taxSlab * (1 + cessRate))
    }

    // Capital appreciation on property sale after lock-in is LTCG at 12.5%
    const taxOnAppreciation = capitalAppreciation > 0
      ? Math.round(capitalAppreciation * 0.125 * (1 + cessRate))
      : 0
    const totalTaxOnReturns = taxOnRentalIncome + taxOnAppreciation
    // Net cash in hand = Investment + Returns - Taxes on returns
    const netCashInHand = investmentAmount + totalReturns - totalTaxOnReturns

    // Comparison: What if you paid tax and invested the remaining in FD/debt fund
    const comparisonTaxPaid = result.totalTax
    const afterTaxAmount = result.netSaleConsideration - comparisonTaxPaid
    const returnAt8Percent = Math.round(
      afterTaxAmount * Math.pow(1.08, lockInYears) - afterTaxAmount
    )
    // FD interest is taxed at slab rate - use split-bracket if salary data available
    let taxOnFDReturns: number
    if (salaryDataForCalc?.usingSalaryRate && returnAt8Percent > 0) {
      const fdTaxResult = calculateSplitBracketTax({
        additionalIncome: returnAt8Percent,
        currentTaxableIncome: salaryDataForCalc.taxableIncome,
        regime: salaryDataForCalc.regime,
      })
      taxOnFDReturns = fdTaxResult.tax
    } else {
      const taxSlab = projectionState.taxSlab / 100
      taxOnFDReturns = Math.round(returnAt8Percent * taxSlab * (1 + cessRate))
    }
    const netFDReturns = returnAt8Percent - taxOnFDReturns

    strategies.push({
      section: '54',
      name: 'Buy New Residential Property',
      description: 'Reinvest capital gains in a new residential house',
      maxExemption,
      investmentRequired: maxExemption,
      taxSaved,
      deadline,
      lockInYears,
      isEligible: true,
      notes: [
        'Purchase within 1 year before or 2 years after sale',
        'Or construct within 3 years of sale',
        'Only ONE new residential property allowed',
        'Lock-in period: 3 years (cannot sell new property)',
        'Max exemption: ₹10 Crore (from AY 2024-25)',
      ],
      propertyProjection: {
        originalPropertyCAGR: originalCAGR,
        appreciationRate,
        projectedPropertyValue,
        capitalAppreciation,
        rentalEnabled: projectionState.enableRental,
        monthlyRent: projectionState.monthlyRent,
        rentStartMonth: projectionState.rentStartMonth,
        totalRentalIncome,
        totalReturns,
        annualizedReturn,
        taxSlab: projectionState.taxSlab,
        taxOnRentalIncome,
        taxOnAppreciation,
        totalTaxOnReturns,
        netCashInHand,
        comparisonWithoutExemption: {
          taxPaid: comparisonTaxPaid,
          investedAmount: afterTaxAmount,
          returnAt8Percent,
          taxOnFDReturns,
          netFDReturns,
        },
      },
    })
  }

  // Section 54EC - Capital Gains Bonds
  const bondDeadline = new Date(saleDate)
  bondDeadline.setMonth(bondDeadline.getMonth() + 6)

  // Max ₹50 lakh per FY
  const maxBondInvestment = Math.min(capitalGain, 5000000)
  const bondTaxSaved = (maxBondInvestment * result.taxRate / 100) * 1.04

  // Bond interest calculations
  const bondInterestRate = 5.25 // Current rate for 54EC bonds
  const bondLockInYears = 5
  // Simple interest for 54EC bonds (paid annually, not compounded)
  const totalInterest = Math.round(maxBondInvestment * (bondInterestRate / 100) * bondLockInYears)
  const maturityValue = maxBondInvestment + totalInterest
  // Interest is taxable at user's slab rate (with split-bracket if salary data available)
  let taxOnInterest: number
  if (salaryDataForCalc?.usingSalaryRate && totalInterest > 0) {
    // Use split-bracket: bond interest comes on top of salary income
    const interestTaxResult = calculateSplitBracketTax({
      additionalIncome: totalInterest,
      currentTaxableIncome: salaryDataForCalc.taxableIncome,
      regime: salaryDataForCalc.regime,
    })
    taxOnInterest = interestTaxResult.tax
  } else {
    const userTaxSlab = projectionState.taxSlab / 100
    taxOnInterest = Math.round(totalInterest * userTaxSlab * 1.04) // slab rate + 4% cess
  }
  const netMaturityValue = maturityValue - taxOnInterest

  strategies.push({
    section: '54EC',
    name: 'Capital Gains Bonds',
    description: 'Invest in NHAI/REC/PFC bonds',
    maxExemption: maxBondInvestment,
    investmentRequired: maxBondInvestment,
    taxSaved: bondTaxSaved,
    deadline: bondDeadline,
    lockInYears: bondLockInYears,
    isEligible: true,
    notes: [
      'Invest within 6 months of sale date',
      'Maximum investment: ₹50 lakhs per financial year',
      'Lock-in period: 5 years',
      `Interest taxed at ${projectionState.taxSlab}% (your slab rate)`,
      'Bonds: NHAI, REC, PFC, IRFC',
    ],
    bondDetails: {
      interestRate: bondInterestRate,
      totalInterest,
      maturityValue,
      taxOnInterest,
      netMaturityValue,
    },
  })

  // Section 54F - For non-residential property
  if (property.propertyType !== 'residential') {
    const deadline54f = new Date(saleDate)
    deadline54f.setFullYear(deadline54f.getFullYear() + 2)

    // Full exemption if entire NET consideration is reinvested
    const netConsideration = result.netSaleConsideration
    const exemptionRatio = Math.min(1, capitalGain / netConsideration)
    const maxExemption54f = Math.round(capitalGain * exemptionRatio)
    const taxSaved54f = (maxExemption54f * result.taxRate / 100) * 1.04
    const lockInYears54f = 3

    // Calculate property projections for 54F
    const investmentAmount54f = netConsideration
    const appreciationRate54f = projectionState.appreciationRate
    const projectedPropertyValue54f = Math.round(
      investmentAmount54f * Math.pow(1 + appreciationRate54f / 100, lockInYears54f)
    )
    const capitalAppreciation54f = projectedPropertyValue54f - investmentAmount54f

    // Rental income calculation for 54F
    const rentMonths54f = Math.max(0, (lockInYears54f * 12) - projectionState.rentStartMonth)
    const totalRentalIncome54f = projectionState.enableRental
      ? projectionState.monthlyRent * rentMonths54f
      : 0

    const totalReturns54f = capitalAppreciation54f + totalRentalIncome54f
    const annualizedReturn54f = calculateCAGR(
      investmentAmount54f,
      investmentAmount54f + totalReturns54f,
      lockInYears54f
    )

    // Tax calculations on returns for 54F
    const taxSlab54f = projectionState.taxSlab / 100
    const cessRate54f = 0.04
    const taxOnRentalIncome54f = Math.round(totalRentalIncome54f * taxSlab54f * (1 + cessRate54f))
    const taxOnAppreciation54f = capitalAppreciation54f > 0
      ? Math.round(capitalAppreciation54f * 0.125 * (1 + cessRate54f))
      : 0
    const totalTaxOnReturns54f = taxOnRentalIncome54f + taxOnAppreciation54f
    const netCashInHand54f = investmentAmount54f + totalReturns54f - totalTaxOnReturns54f

    // Comparison: What if you paid tax and invested the remaining in FD/debt fund
    const comparisonTaxPaid54f = result.totalTax
    const afterTaxAmount54f = result.netSaleConsideration - comparisonTaxPaid54f
    const returnAt8Percent54f = Math.round(
      afterTaxAmount54f * Math.pow(1.08, lockInYears54f) - afterTaxAmount54f
    )
    const taxOnFDReturns54f = Math.round(returnAt8Percent54f * taxSlab54f * (1 + cessRate54f))
    const netFDReturns54f = returnAt8Percent54f - taxOnFDReturns54f

    strategies.push({
      section: '54F',
      name: 'Buy Residential Property (54F)',
      description: 'For sale of non-residential assets',
      maxExemption: maxExemption54f,
      investmentRequired: netConsideration,
      taxSaved: taxSaved54f,
      deadline: deadline54f,
      lockInYears: lockInYears54f,
      isEligible: true,
      notes: [
        'Applicable for sale of any asset EXCEPT residential house',
        'Must not own more than one residential house on sale date',
        'Full exemption if entire net consideration is reinvested',
        'Proportionate exemption if partial reinvestment',
        'Lock-in period: 3 years',
      ],
      propertyProjection: {
        originalPropertyCAGR: originalCAGR,
        appreciationRate: appreciationRate54f,
        projectedPropertyValue: projectedPropertyValue54f,
        capitalAppreciation: capitalAppreciation54f,
        rentalEnabled: projectionState.enableRental,
        monthlyRent: projectionState.monthlyRent,
        rentStartMonth: projectionState.rentStartMonth,
        totalRentalIncome: totalRentalIncome54f,
        totalReturns: totalReturns54f,
        annualizedReturn: annualizedReturn54f,
        taxSlab: projectionState.taxSlab,
        taxOnRentalIncome: taxOnRentalIncome54f,
        taxOnAppreciation: taxOnAppreciation54f,
        totalTaxOnReturns: totalTaxOnReturns54f,
        netCashInHand: netCashInHand54f,
        comparisonWithoutExemption: {
          taxPaid: comparisonTaxPaid54f,
          investedAmount: afterTaxAmount54f,
          returnAt8Percent: returnAt8Percent54f,
          taxOnFDReturns: taxOnFDReturns54f,
          netFDReturns: netFDReturns54f,
        },
      },
    })
  }

  return strategies
}

export interface RealEstateCalculatorRef {
  exportToPDF: () => void
  exportToHTML: () => void
  exportToExcel: () => void
  handleClear: () => void
}

const RealEstateCalculator = forwardRef<RealEstateCalculatorRef>(function RealEstateCalculator(props, ref) {
  const { formatNumber, formatCompact } = useNumberFormat()

  // Default dates
  const today = new Date()
  const defaultPurchaseDate = new Date(today.getFullYear() - 5, today.getMonth(), today.getDate())

  const [property, setProperty] = useState<PropertyDetails>({
    propertyType: 'residential',
    purchaseDate: defaultPurchaseDate.toISOString().split('T')[0],
    purchasePrice: 5000000,
    stampDuty: 300000,
    improvementCost: 0,
    improvementDate: '',
    saleDate: today.toISOString().split('T')[0],
    salePrice: 8000000,
    brokerage: 80000,
    legalFees: 20000,
  })

  const [activeTab, setActiveTab] = useState<'calculate' | 'exemptions' | 'compare'>('calculate')
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // User-selected regime (when they have a choice for pre-July 2024 properties)
  const [selectedRegime, setSelectedRegime] = useState<'old' | 'new' | null>(null)

  // Section 54 projection state
  const [section54Projection, setSection54Projection] = useState<Section54ProjectionState>({
    appreciationRate: 8, // Default 8%, will be updated to match original property CAGR
    enableRental: false,
    monthlyRent: 20000,
    rentStartMonth: 0, // Immediate
    taxSlab: 30, // Default to highest slab
  })

  // Salary calculator integration for tax slab
  const [salaryData, setSalaryData] = useState<{
    available: boolean
    ctc: number
    taxableIncome: number
    marginalRate: number
    nextBracketRate: number
    roomInBracket: number // How much more income before hitting next bracket
    regime: 'new' | 'old'
    usingSalaryRate: boolean
  }>({
    available: false,
    ctc: 0,
    taxableIncome: 0,
    marginalRate: 30,
    nextBracketRate: 30,
    roomInBracket: 0,
    regime: 'new',
    usingSalaryRate: false,
  })

  // Reinvestment allocation state - initialized with defaults, will update based on net proceeds
  const [reinvestmentAllocation, setReinvestmentAllocation] = useState<ReinvestmentAllocation>({
    personalUse: {
      enabled: true, // Default enabled
      amount: 0,
    },
    bonds: {
      enabled: false, // Default disabled
      amount: 0,
    },
    realEstate: {
      enabled: false, // Default disabled
      amount: 0,
      appreciationRate: 8,
      enableRental: false,
      monthlyRent: 20000,
      rentStartMonth: 0,
    },
  })

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calc_realestate')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setProperty(data.property || property)
        setActiveTab(data.activeTab || 'calculate')
      } catch (e) {
        console.error('Failed to load saved data:', e)
      }
    }
    setIsLoaded(true)
  }, [])

  // Auto-save to localStorage
  useEffect(() => {
    if (!isLoaded) return
    const data = { property, activeTab }
    localStorage.setItem('calc_realestate', JSON.stringify(data))
    setLastSaved(new Date().toLocaleTimeString())
  }, [property, activeTab, isLoaded])

  // Load salary calculator data and compute marginal tax rate with bracket info
  useEffect(() => {
    const loadSalaryData = () => {
      try {
        const saved = localStorage.getItem('calc_salary')
        if (saved) {
          const data = JSON.parse(saved)
          const ctc = data.ctc || 0
          const regime = (data.taxRegime || 'new') as 'new' | 'old'

          // Only consider salary data "available" if:
          // 1. CTC is different from default (1200000) - means user modified it
          // 2. OR userModified flag is set (for future-proofing)
          const DEFAULT_CTC = 1200000
          const isUserModified = data.userModified === true || ctc !== DEFAULT_CTC

          if (ctc > 0 && isUserModified) {
            // Calculate taxable income (rough estimate)
            const pf = (ctc / 12) * 0.4 * 0.12 * 12 // 12% of 40% basic
            const standardDeduction = regime === 'new' ? 75000 : 50000
            const taxableIncome = Math.max(0, ctc - pf - standardDeduction)

            // Tax bracket thresholds (New Regime FY 2024-25)
            // 0-3L: 0%, 3-7L: 5%, 7-10L: 10%, 10-12L: 15%, 12-15L: 20%, 15L+: 30%
            // Old Regime: 0-2.5L: 0%, 2.5-5L: 5%, 5-10L: 20%, 10L+: 30%

            let marginalRate = 0
            let nextBracketRate = 0
            let roomInBracket = 0

            if (regime === 'new') {
              if (taxableIncome > 1500000) {
                marginalRate = 30; nextBracketRate = 30; roomInBracket = Infinity
              } else if (taxableIncome > 1200000) {
                marginalRate = 20; nextBracketRate = 30; roomInBracket = 1500000 - taxableIncome
              } else if (taxableIncome > 1000000) {
                marginalRate = 15; nextBracketRate = 20; roomInBracket = 1200000 - taxableIncome
              } else if (taxableIncome > 700000) {
                marginalRate = 10; nextBracketRate = 15; roomInBracket = 1000000 - taxableIncome
              } else if (taxableIncome > 300000) {
                marginalRate = 5; nextBracketRate = 10; roomInBracket = 700000 - taxableIncome
              } else {
                marginalRate = 0; nextBracketRate = 5; roomInBracket = 300000 - taxableIncome
              }
            } else {
              if (taxableIncome > 1000000) {
                marginalRate = 30; nextBracketRate = 30; roomInBracket = Infinity
              } else if (taxableIncome > 500000) {
                marginalRate = 20; nextBracketRate = 30; roomInBracket = 1000000 - taxableIncome
              } else if (taxableIncome > 250000) {
                marginalRate = 5; nextBracketRate = 20; roomInBracket = 500000 - taxableIncome
              } else {
                marginalRate = 0; nextBracketRate = 5; roomInBracket = 250000 - taxableIncome
              }
            }

            setSalaryData({
              available: true,
              ctc,
              taxableIncome,
              marginalRate,
              nextBracketRate,
              roomInBracket,
              regime,
              usingSalaryRate: false,
            })
          } else {
            // Reset to unavailable if data exists but is default/unmodified
            setSalaryData({
              available: false,
              ctc: 0,
              taxableIncome: 0,
              marginalRate: 30,
              nextBracketRate: 30,
              roomInBracket: 0,
              regime: 'new',
              usingSalaryRate: false,
            })
          }
        }
      } catch (e) {
        console.error('Failed to load salary data:', e)
      }
    }

    loadSalaryData()
    // Re-check when window gains focus (in case user filled salary calc in another tab)
    window.addEventListener('focus', loadSalaryData)
    return () => window.removeEventListener('focus', loadSalaryData)
  }, [])

  // Calculate results
  const result = useMemo(() => calculateCapitalGains(property), [property])

  // Prepare salary data for split-bracket calculations
  const salaryDataForCalc: SalaryDataForCalc | undefined = useMemo(() => {
    if (!salaryData.usingSalaryRate) return undefined
    return {
      usingSalaryRate: true,
      taxableIncome: salaryData.taxableIncome,
      regime: salaryData.regime,
    }
  }, [salaryData.usingSalaryRate, salaryData.taxableIncome, salaryData.regime])

  const exemptions = useMemo(
    () => calculateExemptions(property, result, section54Projection, salaryDataForCalc),
    [property, result, section54Projection, salaryDataForCalc]
  )

  // Calculate original property CAGR for reference
  const originalCAGR = useMemo(() => {
    const holdingYears = result.holdingPeriod.months / 12
    if (holdingYears <= 0) return 0
    return calculateCAGR(
      property.purchasePrice + property.stampDuty,
      property.salePrice,
      holdingYears
    )
  }, [property, result.holdingPeriod.months])

  // Set default appreciation rate to original property's CAGR on first load
  useEffect(() => {
    if (isLoaded && originalCAGR > 0 && section54Projection.appreciationRate === 8) {
      setSection54Projection(prev => ({
        ...prev,
        appreciationRate: Math.round(originalCAGR * 10) / 10, // Round to 1 decimal
      }))
    }
  }, [isLoaded, originalCAGR])

  // Determine which regime is actually being used for display
  const activeRegime = useMemo(() => {
    if (!result.canChooseRegime) {
      return result.useNewRegime ? 'new' : 'old'
    }
    // User can choose - use their selection or recommendation
    return selectedRegime || result.recommendedRegime || 'new'
  }, [result.canChooseRegime, result.useNewRegime, result.recommendedRegime, selectedRegime])

  // Get the active regime's values
  const activeRegimeValues = useMemo(() => {
    if (!result.canChooseRegime) {
      return {
        capitalGain: result.capitalGain,
        taxRate: result.taxRate,
        totalTax: result.totalTax,
        netProceeds: result.netProceeds,
      }
    }
    return activeRegime === 'old' ? result.oldRegime! : result.newRegime!
  }, [result, activeRegime])

  // Calculate reinvestment allocation amounts and projections
  const allocationCalculations = useMemo(() => {
    const netProceeds = activeRegimeValues.netProceeds
    const maxBondAmount = Math.min(5000000, netProceeds) // Max 50L for 54EC bonds
    const lockInYears = 3 // Standard lock-in for real estate

    // Calculate amounts based on allocation
    const personalUseAmount = reinvestmentAllocation.personalUse.enabled
      ? reinvestmentAllocation.personalUse.amount
      : 0
    const bondsAmount = reinvestmentAllocation.bonds.enabled
      ? Math.min(reinvestmentAllocation.bonds.amount, maxBondAmount)
      : 0

    // Remaining goes to real estate (if enabled)
    const remainingAfterPersonalAndBonds = Math.max(0, netProceeds - personalUseAmount - bondsAmount)
    const realEstateAmount = reinvestmentAllocation.realEstate.enabled
      ? remainingAfterPersonalAndBonds
      : 0

    // Total unallocated
    const unallocated = netProceeds - personalUseAmount - bondsAmount - realEstateAmount

    // Bond projections (5.25% simple interest, 5 years)
    const bondInterestRate = 5.25
    const bondLockIn = 5
    const bondInterest = Math.round(bondsAmount * (bondInterestRate / 100) * bondLockIn)
    const bondMaturityValue = bondsAmount + bondInterest

    // Bond interest tax (with split-bracket if salary data available)
    let bondTaxOnInterest: number
    if (salaryDataForCalc?.usingSalaryRate && bondInterest > 0) {
      const bondTaxResult = calculateSplitBracketTax({
        additionalIncome: bondInterest,
        currentTaxableIncome: salaryDataForCalc.taxableIncome,
        regime: salaryDataForCalc.regime,
      })
      bondTaxOnInterest = bondTaxResult.tax
    } else {
      bondTaxOnInterest = Math.round(bondInterest * (section54Projection.taxSlab / 100) * 1.04)
    }
    const bondNetValue = bondMaturityValue - bondTaxOnInterest

    // Real estate projections
    const reAppreciationRate = reinvestmentAllocation.realEstate.appreciationRate
    const reProjectedValue = Math.round(realEstateAmount * Math.pow(1 + reAppreciationRate / 100, lockInYears))
    const reCapitalAppreciation = reProjectedValue - realEstateAmount
    const reRentMonths = Math.max(0, (lockInYears * 12) - reinvestmentAllocation.realEstate.rentStartMonth)
    const reTotalRental = reinvestmentAllocation.realEstate.enableRental
      ? reinvestmentAllocation.realEstate.monthlyRent * reRentMonths
      : 0
    const reTotalReturns = reCapitalAppreciation + reTotalRental

    // Rental income tax (with split-bracket if salary data available)
    let reTaxOnRent: number
    if (salaryDataForCalc?.usingSalaryRate && reTotalRental > 0) {
      const rentalTaxResult = calculateSplitBracketTax({
        additionalIncome: reTotalRental,
        currentTaxableIncome: salaryDataForCalc.taxableIncome,
        regime: salaryDataForCalc.regime,
      })
      reTaxOnRent = rentalTaxResult.tax
    } else {
      reTaxOnRent = Math.round(reTotalRental * (section54Projection.taxSlab / 100) * 1.04)
    }
    const reTaxOnAppreciation = reCapitalAppreciation > 0
      ? Math.round(reCapitalAppreciation * 0.125 * 1.04)
      : 0
    const reTotalTax = reTaxOnRent + reTaxOnAppreciation
    const reNetValue = realEstateAmount + reTotalReturns - reTotalTax

    // Total projected value after lock-in
    const totalProjectedValue = personalUseAmount + bondNetValue + reNetValue + unallocated

    return {
      netProceeds,
      maxBondAmount,
      personalUseAmount,
      bondsAmount,
      realEstateAmount,
      unallocated,
      remainingAfterPersonalAndBonds,
      bonds: {
        interestRate: bondInterestRate,
        lockInYears: bondLockIn,
        totalInterest: bondInterest,
        maturityValue: bondMaturityValue,
        taxOnInterest: bondTaxOnInterest,
        netValue: bondNetValue,
      },
      realEstate: {
        lockInYears,
        appreciationRate: reAppreciationRate,
        projectedValue: reProjectedValue,
        capitalAppreciation: reCapitalAppreciation,
        rentMonths: reRentMonths,
        totalRental: reTotalRental,
        totalReturns: reTotalReturns,
        taxOnRent: reTaxOnRent,
        taxOnAppreciation: reTaxOnAppreciation,
        totalTax: reTotalTax,
        netValue: reNetValue,
      },
      totalProjectedValue,
    }
  }, [activeRegimeValues.netProceeds, reinvestmentAllocation, section54Projection.taxSlab, salaryDataForCalc])

  // Update allocation amounts when net proceeds change
  useEffect(() => {
    const netProceeds = activeRegimeValues.netProceeds
    // If personal use is enabled but amount is 0, don't auto-update (user can set it)
    // If real estate is enabled, auto-update its amount to remaining
    if (reinvestmentAllocation.realEstate.enabled) {
      const remaining = netProceeds
        - (reinvestmentAllocation.personalUse.enabled ? reinvestmentAllocation.personalUse.amount : 0)
        - (reinvestmentAllocation.bonds.enabled ? reinvestmentAllocation.bonds.amount : 0)
      if (remaining !== reinvestmentAllocation.realEstate.amount) {
        setReinvestmentAllocation(prev => ({
          ...prev,
          realEstate: { ...prev.realEstate, amount: Math.max(0, remaining) },
        }))
      }
    }
  }, [activeRegimeValues.netProceeds, reinvestmentAllocation.personalUse, reinvestmentAllocation.bonds])

  const handleClear = () => {
    const today = new Date()
    const defaultPurchaseDate = new Date(today.getFullYear() - 5, today.getMonth(), today.getDate())
    setProperty({
      propertyType: 'residential',
      purchaseDate: defaultPurchaseDate.toISOString().split('T')[0],
      purchasePrice: 5000000,
      stampDuty: 300000,
      improvementCost: 0,
      improvementDate: '',
      saleDate: today.toISOString().split('T')[0],
      salePrice: 8000000,
      brokerage: 80000,
      legalFees: 20000,
    })
    setActiveTab('calculate')
    setSelectedRegime(null)
    setSection54Projection({
      appreciationRate: 8,
      enableRental: false,
      monthlyRent: 20000,
      rentStartMonth: 0,
      taxSlab: 30,
    })
    setReinvestmentAllocation({
      personalUse: { enabled: true, amount: 0 },
      bonds: { enabled: false, amount: 0 },
      realEstate: {
        enabled: false,
        amount: 0,
        appreciationRate: 8,
        enableRental: false,
        monthlyRent: 20000,
        rentStartMonth: 0,
      },
    })
    localStorage.removeItem('calc_realestate')
  }

  const updateProperty = (field: keyof PropertyDetails, value: string | number) => {
    setProperty(prev => ({ ...prev, [field]: value }))
  }

  // Export functions
  const exportToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Real Estate Capital Gains Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 800px; margin: 0 auto; }
          h1 { color: #7c3aed; font-size: 24px; }
          h2 { font-size: 16px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 24px; }
          .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
          .item { text-align: center; padding: 10px; background: white; border-radius: 6px; }
          .label { font-size: 10px; color: #64748b; text-transform: uppercase; }
          .value { font-size: 16px; font-weight: bold; margin-top: 4px; }
          .highlight { background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .highlight-label { font-size: 11px; color: #7c3aed; text-transform: uppercase; }
          .highlight-value { font-size: 28px; font-weight: bold; }
          .tax { color: #dc2626; }
          .savings { color: #16a34a; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th { background: #f1f5f9; padding: 10px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <h1>Real Estate Capital Gains Report</h1>
        <p style="color: #64748b; font-size: 13px;">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <h2>Property Details</h2>
        <div class="summary">
          <div class="grid">
            <div class="item">
              <div class="label">Property Type</div>
              <div class="value">${property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)}</div>
            </div>
            <div class="item">
              <div class="label">Holding Period</div>
              <div class="value">${result.holdingPeriod.years}y ${result.holdingPeriod.months % 12}m (${result.holdingPeriod.isLongTerm ? 'Long-Term' : 'Short-Term'})</div>
            </div>
            <div class="item">
              <div class="label">Purchase Price</div>
              <div class="value">₹${formatNumber(property.purchasePrice)}</div>
            </div>
            <div class="item">
              <div class="label">Sale Price</div>
              <div class="value">₹${formatNumber(property.salePrice)}</div>
            </div>
          </div>
        </div>

        <h2>Capital Gains Calculation</h2>
        <table>
          <tr><td>Purchase Cost (including stamp duty)</td><td style="text-align: right;">₹${formatNumber(property.purchasePrice + property.stampDuty)}</td></tr>
          ${result.holdingPeriod.isLongTerm && !result.useNewRegime ? `
          <tr><td>Indexed Purchase Cost (CII: ${result.purchaseCII} → ${result.saleCII})</td><td style="text-align: right;">₹${formatNumber(result.indexedPurchaseCost)}</td></tr>
          ` : ''}
          <tr><td>Transfer Expenses (Brokerage + Legal)</td><td style="text-align: right;">₹${formatNumber(result.transferExpenses)}</td></tr>
          <tr><td>Net Sale Consideration</td><td style="text-align: right;">₹${formatNumber(result.netSaleConsideration)}</td></tr>
          <tr style="font-weight: bold; background: #fef3c7;"><td>Capital Gain</td><td style="text-align: right;">₹${formatNumber(result.capitalGain)}</td></tr>
        </table>

        <div class="highlight">
          <div class="highlight-label">Tax Liability (${result.taxRate}% + 4% Cess)</div>
          <div class="highlight-value tax">₹${formatNumber(result.totalTax)}</div>
        </div>

        ${exemptions.length > 0 ? `
        <h2>Tax Exemption Options</h2>
        <table>
          <tr>
            <th>Section</th>
            <th>Strategy</th>
            <th style="text-align: right;">Investment</th>
            <th style="text-align: right;">Tax Saved</th>
            <th>Deadline</th>
          </tr>
          ${exemptions.map(e => `
          <tr>
            <td>${e.section}</td>
            <td>${e.name}</td>
            <td style="text-align: right;">₹${formatNumber(e.investmentRequired)}</td>
            <td style="text-align: right; color: #16a34a; font-weight: bold;">₹${formatNumber(e.taxSaved)}</td>
            <td>${e.deadline.toLocaleDateString('en-IN')}</td>
          </tr>
          `).join('')}
        </table>
        ` : ''}

        <div class="footer">
          Generated by AnyCalc — Calculate everything. Plan anything.
        </div>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const exportToHTML = () => {
    // Similar to PDF but download as file
    const blob = new Blob([`Real Estate Capital Gains Report - Generated by AnyCalc`], { type: 'text/html' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `RealEstate_CG_Report_${property.salePrice}.html`
    link.click()
  }

  const exportToExcel = () => {
    const csvContent = [
      'Real Estate Capital Gains Calculator Report',
      `Generated: ${new Date().toLocaleString('en-IN')}`,
      '',
      'PROPERTY DETAILS',
      `Property Type,${property.propertyType}`,
      `Purchase Date,${property.purchaseDate}`,
      `Purchase Price,${property.purchasePrice}`,
      `Stamp Duty,${property.stampDuty}`,
      `Sale Date,${property.saleDate}`,
      `Sale Price,${property.salePrice}`,
      `Brokerage,${property.brokerage}`,
      `Legal Fees,${property.legalFees}`,
      '',
      'CAPITAL GAINS CALCULATION',
      `Holding Period,${result.holdingPeriod.years} years ${result.holdingPeriod.months % 12} months`,
      `Type,${result.holdingPeriod.isLongTerm ? 'Long-Term' : 'Short-Term'}`,
      `Indexed Cost,${result.totalIndexedCost}`,
      `Capital Gain,${result.capitalGain}`,
      `Tax Rate,${result.taxRate}%`,
      `Total Tax,${result.totalTax}`,
      `Net Proceeds,${result.netProceeds}`,
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `RealEstate_CG_${property.salePrice}.csv`
    link.click()
  }

  useImperativeHandle(ref, () => ({
    exportToPDF,
    exportToHTML,
    exportToExcel,
    handleClear,
  }))

  // Handle using salary rate
  const handleUseSalaryRate = () => {
    if (salaryData.available) {
      setSection54Projection(prev => ({ ...prev, taxSlab: salaryData.marginalRate }))
      setSalaryData(prev => ({ ...prev, usingSalaryRate: true }))
    }
  }

  // Handle manual slab selection
  const handleSlabSelect = (value: number) => {
    setSection54Projection(prev => ({ ...prev, taxSlab: value }))
    setSalaryData(prev => ({ ...prev, usingSalaryRate: false }))
  }

  return (
    <div className="space-y-4">
      {/* Income Tax Slab Selector */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-3">
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-xs font-semibold text-purple-700">Your Income Tax Slab</div>
            <div className="text-[10px] text-purple-500">For calculating tax on rental income & FD interest from reinvestments</div>
          </div>

          {/* Option 1: From Salary Breakdown Calculator (Recommended) */}
          <div className="bg-white rounded-lg border border-purple-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">💼</span>
                <span className="text-xs font-semibold text-slate-700">From Salary Breakdown</span>
                <span className="text-[9px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-medium">Recommended</span>
              </div>
              <a
                href="/workspace?calc=salary"
                className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline font-medium"
              >
                {salaryData.available ? 'Verify/Edit →' : 'Fill Details →'}
              </a>
            </div>

            {salaryData.available ? (
              <div className="space-y-2">
                <button
                  onClick={handleUseSalaryRate}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                    salaryData.usingSalaryRate
                      ? 'bg-green-600 text-white shadow-sm ring-2 ring-green-300'
                      : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-300'
                  }`}
                >
                  <span>Use slab from Salary Breakdown</span>
                  <span className="font-bold">{salaryData.marginalRate}% → {salaryData.nextBracketRate > salaryData.marginalRate ? `${salaryData.nextBracketRate}%` : 'Max'}</span>
                </button>

                {/* Bracket details always visible when salary data available */}
                <div className="bg-slate-50 rounded-lg p-2 text-[10px] space-y-1.5">
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>
                      <span className="text-slate-400">Taxable Income:</span>{' '}
                      <span className="font-semibold">₹{formatNumber(salaryData.taxableIncome)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Regime:</span>{' '}
                      <span className="font-semibold">{salaryData.regime === 'new' ? 'New' : 'Old'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Current Bracket:</span>{' '}
                      <span className="font-semibold text-green-600">{salaryData.marginalRate}%</span>
                    </div>
                    {salaryData.roomInBracket < Infinity && salaryData.roomInBracket > 0 ? (
                      <div>
                        <span className="text-slate-400">Room left:</span>{' '}
                        <span className="font-semibold text-blue-600">₹{formatNumber(salaryData.roomInBracket)}</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-slate-400">Status:</span>{' '}
                        <span className="font-semibold text-orange-600">At max bracket</span>
                      </div>
                    )}
                  </div>

                  {salaryData.roomInBracket < Infinity && salaryData.roomInBracket > 0 && salaryData.nextBracketRate > salaryData.marginalRate && (
                    <div className="pt-1.5 border-t border-slate-200 text-amber-700 flex items-start gap-1">
                      <span>⚠️</span>
                      <span>
                        <strong>Split-bracket applies:</strong> First ₹{formatNumber(salaryData.roomInBracket)} of additional income taxed at {salaryData.marginalRate}%,
                        remainder at {salaryData.nextBracketRate}%. Calculations below use this split logic.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-3 text-slate-400 text-xs">
                <p>No salary data found.</p>
                <a href="/workspace?calc=salary" className="text-blue-600 hover:underline font-medium">
                  Go to Salary Breakdown Calculator →
                </a>
                <p className="text-[10px] mt-1">Enter your CTC to auto-detect your tax bracket</p>
              </div>
            )}
          </div>

          {/* Option 2: Manual slab selection */}
          <div>
            <div className="text-[10px] text-slate-500 mb-1.5">Or select manually (single rate, no split):</div>
            <div className="flex flex-wrap gap-1">
              {TAX_SLABS.map((slab) => (
                <button
                  key={slab.value}
                  onClick={() => handleSlabSelect(slab.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    section54Projection.taxSlab === slab.value && !salaryData.usingSalaryRate
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-purple-100 border border-slate-200'
                  }`}
                  title={slab.description}
                >
                  {slab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => setActiveTab('calculate')}
          className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${
            activeTab === 'calculate'
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Calculate Tax
        </button>
        <button
          onClick={() => setActiveTab('exemptions')}
          className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${
            activeTab === 'exemptions'
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Plan Exemptions
        </button>
        <button
          onClick={() => setActiveTab('compare')}
          className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${
            activeTab === 'compare'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Compare Strategies
        </button>
      </div>

      {/* Main Calculator Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid md:grid-cols-2">
          {/* Inputs */}
          <div className="p-5 space-y-4 border-r border-slate-100">
            {/* Property Type */}
            <div>
              <label className="text-sm font-medium text-slate-600 mb-2 block">Property Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['residential', 'commercial', 'land'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => updateProperty('propertyType', type)}
                    className={`py-2 px-3 text-xs font-medium rounded-lg transition-colors ${
                      property.propertyType === type
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Purchase Details */}
            <div className="pt-3 border-t border-slate-100">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Purchase Details
              </h3>

              <div className="space-y-4">
                {/* Purchase Date */}
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Purchase Date</label>
                  <input
                    type="date"
                    value={property.purchaseDate}
                    onChange={(e) => updateProperty('purchaseDate', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Purchase Price - Slider */}
                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <label className="text-xs text-slate-500">Purchase Price</label>
                    <span className="font-mono text-sm font-semibold text-purple-600">
                      ₹{formatNumber(property.purchasePrice)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={100000}
                    max={property.propertyType === 'commercial' ? 100000000 : 40000000}
                    step={100000}
                    value={property.purchasePrice}
                    onChange={(e) => updateProperty('purchasePrice', Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-purple-600"
                  />
                  <div className="flex justify-between mt-1 text-[9px] text-slate-400">
                    <span>₹1L</span>
                    <span>{property.propertyType === 'commercial' ? '₹10Cr' : '₹4Cr'}</span>
                  </div>
                </div>

                {/* Stamp Duty - Slider */}
                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <label className="text-xs text-slate-500">Stamp Duty & Registration</label>
                    <span className="font-mono text-sm font-semibold text-slate-700">
                      ₹{formatNumber(property.stampDuty)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={property.propertyType === 'commercial' ? 10000000 : 4000000}
                    step={10000}
                    value={property.stampDuty}
                    onChange={(e) => updateProperty('stampDuty', Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-purple-600"
                  />
                  <div className="flex justify-between mt-1 text-[9px] text-slate-400">
                    <span>₹0</span>
                    <span>{property.propertyType === 'commercial' ? '₹1Cr' : '₹40L'}</span>
                  </div>
                </div>

                {/* Improvement Cost - Slider */}
                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <label className="text-xs text-slate-500">Improvement Cost</label>
                    <span className="font-mono text-sm font-semibold text-slate-700">
                      ₹{formatNumber(property.improvementCost)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50000000}
                    step={10000}
                    value={property.improvementCost}
                    onChange={(e) => updateProperty('improvementCost', Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-purple-600"
                  />
                  <div className="flex justify-between mt-1 text-[9px] text-slate-400">
                    <span>₹0</span>
                    <span>₹5Cr</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sale Details */}
            <div className="pt-3 border-t border-slate-100">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Sale Details
              </h3>

              <div className="space-y-4">
                {/* Sale Date */}
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Sale Date</label>
                  <input
                    type="date"
                    value={property.saleDate}
                    onChange={(e) => updateProperty('saleDate', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Sale Price - Slider */}
                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <label className="text-xs text-slate-500">Sale Price</label>
                    <span className="font-mono text-sm font-semibold text-green-600">
                      ₹{formatNumber(property.salePrice)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={100000}
                    max={property.propertyType === 'commercial' ? 100000000 : 40000000}
                    step={100000}
                    value={property.salePrice}
                    onChange={(e) => updateProperty('salePrice', Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-green-600"
                  />
                  <div className="flex justify-between mt-1 text-[9px] text-slate-400">
                    <span>₹1L</span>
                    <span>{property.propertyType === 'commercial' ? '₹10Cr' : '₹4Cr'}</span>
                  </div>
                </div>

                {/* Brokerage - Slider */}
                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <label className="text-xs text-slate-500">Brokerage (~1%)</label>
                    <span className="font-mono text-sm font-semibold text-slate-700">
                      ₹{formatNumber(property.brokerage)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10000000}
                    step={5000}
                    value={property.brokerage}
                    onChange={(e) => updateProperty('brokerage', Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-slate-500"
                  />
                  <div className="flex justify-between mt-1 text-[9px] text-slate-400">
                    <span>₹0</span>
                    <span>₹1Cr</span>
                  </div>
                </div>

                {/* Legal Fees - Slider */}
                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <label className="text-xs text-slate-500">Legal Fees</label>
                    <span className="font-mono text-sm font-semibold text-slate-700">
                      ₹{formatNumber(property.legalFees)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={5000000}
                    step={5000}
                    value={property.legalFees}
                    onChange={(e) => updateProperty('legalFees', Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-slate-500"
                  />
                  <div className="flex justify-between mt-1 text-[9px] text-slate-400">
                    <span>₹0</span>
                    <span>₹50L</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="p-5 bg-slate-50">
            {/* Holding Period Badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4 ${
              result.holdingPeriod.isLongTerm
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              <span>{result.holdingPeriod.years}y {result.holdingPeriod.months % 12}m</span>
              <span className="w-1 h-1 rounded-full bg-current" />
              <span>{result.holdingPeriod.isLongTerm ? 'Long-Term Capital Gain' : 'Short-Term Capital Gain'}</span>
            </div>

            {/* Primary Result - Capital Gain */}
            <div className={`rounded-lg p-4 text-center mb-4 ${
              result.capitalGain >= 0 ? 'bg-amber-50' : 'bg-red-50'
            }`}>
              <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                result.capitalGain >= 0 ? 'text-amber-600' : 'text-red-600'
              }`}>
                Capital {result.capitalGain >= 0 ? 'Gain' : 'Loss'}
              </div>
              <div className="font-mono text-3xl font-bold text-slate-900">
                ₹{formatNumber(Math.abs(result.capitalGain))}
              </div>
            </div>

            {/* Tax Liability */}
            {result.capitalGain > 0 && (
              <div className="bg-red-50 rounded-lg p-4 text-center mb-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-red-600 mb-1">
                  Tax Liability ({activeRegimeValues.taxRate}% + Cess)
                </div>
                <div className="font-mono text-2xl font-bold text-red-600">
                  ₹{formatNumber(activeRegimeValues.totalTax)}
                </div>
                {result.holdingPeriod.isLongTerm && (
                  <div className="text-[10px] text-slate-500 mt-1">
                    {activeRegime === 'new' ? 'New Regime (12.5% without indexation)' : 'Old Regime (20% with indexation)'}
                    {result.canChooseRegime && activeRegime === result.recommendedRegime && (
                      <span className="text-green-600 ml-1">✓ Best Option</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Regime Comparison - Only for pre-July 2024 LTCG */}
            {result.canChooseRegime && result.oldRegime && result.newRegime && (
              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 mb-2">
                  Budget 2024: Choose Your Regime
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => setSelectedRegime('old')}
                    className={`p-2 rounded text-left transition-all ${
                      activeRegime === 'old'
                        ? 'bg-green-100 ring-2 ring-green-400'
                        : 'bg-white hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <div className="font-medium text-slate-600">Old Regime</div>
                    <div className="text-[9px] text-slate-400 mb-1">20% with indexation</div>
                    <div className="font-mono font-semibold text-red-600">₹{formatNumber(result.oldRegime.totalTax)}</div>
                    {result.recommendedRegime === 'old' && (
                      <div className="text-[9px] text-green-600 mt-1">✓ Recommended</div>
                    )}
                    {activeRegime === 'old' && result.recommendedRegime !== 'old' && (
                      <div className="text-[9px] text-blue-600 mt-1">✓ Selected</div>
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedRegime('new')}
                    className={`p-2 rounded text-left transition-all ${
                      activeRegime === 'new'
                        ? 'bg-green-100 ring-2 ring-green-400'
                        : 'bg-white hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <div className="font-medium text-slate-600">New Regime</div>
                    <div className="text-[9px] text-slate-400 mb-1">12.5% no indexation</div>
                    <div className="font-mono font-semibold text-red-600">₹{formatNumber(result.newRegime.totalTax)}</div>
                    {result.recommendedRegime === 'new' && (
                      <div className="text-[9px] text-green-600 mt-1">✓ Recommended</div>
                    )}
                    {activeRegime === 'new' && result.recommendedRegime !== 'new' && (
                      <div className="text-[9px] text-blue-600 mt-1">✓ Selected</div>
                    )}
                  </button>
                </div>
                <div className="text-[9px] text-blue-600 mt-2 flex items-center gap-1">
                  <span>💡</span>
                  <span>
                    {activeRegime === result.recommendedRegime
                      ? `You save ₹${formatNumber(Math.abs((result.oldRegime?.totalTax || 0) - (result.newRegime?.totalTax || 0)))} with ${activeRegime === 'old' ? 'Old' : 'New'} Regime`
                      : `Click to select a regime. ${result.recommendedRegime === 'old' ? 'Old' : 'New'} Regime saves ₹${formatNumber(Math.abs((result.oldRegime?.totalTax || 0) - (result.newRegime?.totalTax || 0)))}`
                    }
                  </span>
                </div>
              </div>
            )}

            {/* Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500">Sale Price</span>
                <span className="font-mono font-medium">₹{formatNumber(property.salePrice)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500">(-) Transfer Expenses</span>
                <span className="font-mono font-medium text-red-500">-₹{formatNumber(result.transferExpenses)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500">Net Consideration</span>
                <span className="font-mono font-medium">₹{formatNumber(result.netSaleConsideration)}</span>
              </div>
              {result.holdingPeriod.isLongTerm && activeRegime === 'old' && (
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-500">(-) Indexed Cost (CII {result.purchaseCII}→{result.saleCII})</span>
                  <span className="font-mono font-medium text-red-500">-₹{formatNumber(result.totalIndexedCost)}</span>
                </div>
              )}
              {(!result.holdingPeriod.isLongTerm || activeRegime === 'new') && (
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-500">(-) Purchase Cost</span>
                  <span className="font-mono font-medium text-red-500">-₹{formatNumber(property.purchasePrice + property.stampDuty)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 bg-green-50 rounded px-2 mt-2">
                <span className="font-medium text-green-700">Net Proceeds (after tax)</span>
                <span className="font-mono font-bold text-green-700">₹{formatNumber(activeRegimeValues.netProceeds)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Auto-save indicator */}
        <div className="px-5 py-2 bg-slate-50 border-t border-slate-100">
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            Auto-saved {lastSaved || 'just now'}
          </div>
        </div>
      </div>

      {/* Reinvestment Allocation */}
      {activeTab === 'exemptions' && (
        <div className="space-y-4">
          {/* Net Proceeds Summary */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-green-700 uppercase">Net Sale Proceeds After Tax</div>
                <div className="text-[10px] text-green-600">Amount available for allocation</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-2xl font-bold text-green-700">
                  ₹{formatCompact(allocationCalculations.netProceeds)}
                </div>
                <div className="text-[10px] text-green-600">
                  Sale ₹{formatCompact(property.salePrice)} − Tax ₹{formatCompact(activeRegimeValues.totalTax)}
                </div>
              </div>
            </div>
          </div>

          {/* Allocation Options */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Allocate Your Proceeds</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Choose how to allocate your sale proceeds across different investment options
              </p>
            </div>

            <div className="p-4 space-y-4">
              {/* 1. Personal Use / Obligations */}
              <div className={`border rounded-lg p-4 transition-all ${
                reinvestmentAllocation.personalUse.enabled
                  ? 'border-amber-300 bg-amber-50/50'
                  : 'border-slate-200 bg-slate-50/50'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-lg">
                      💰
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-700">Personal Use / Obligations</div>
                      <div className="text-[10px] text-slate-500">Withdraw for personal needs, EMIs, expenses</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setReinvestmentAllocation(prev => ({
                      ...prev,
                      personalUse: { ...prev.personalUse, enabled: !prev.personalUse.enabled, amount: prev.personalUse.enabled ? 0 : prev.personalUse.amount },
                    }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      reinvestmentAllocation.personalUse.enabled ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      reinvestmentAllocation.personalUse.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {reinvestmentAllocation.personalUse.enabled && (
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <label className="text-[10px] text-slate-600">Amount to withdraw</label>
                        <span className="font-mono text-sm font-semibold text-amber-600">
                          ₹{formatCompact(reinvestmentAllocation.personalUse.amount)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={allocationCalculations.netProceeds}
                        step={10000}
                        value={reinvestmentAllocation.personalUse.amount}
                        onChange={(e) => setReinvestmentAllocation(prev => ({
                          ...prev,
                          personalUse: { ...prev.personalUse, amount: Number(e.target.value) },
                        }))}
                        className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-amber-500"
                      />
                      <div className="flex justify-between mt-1 text-[9px] text-slate-400">
                        <span>₹0</span>
                        <span>₹{formatCompact(allocationCalculations.netProceeds)}</span>
                      </div>
                    </div>
                    <div className="text-[9px] text-amber-600 bg-amber-100 rounded px-2 py-1">
                      💡 This amount is immediately available - no lock-in period
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Section 54EC Bonds */}
              <div className={`border rounded-lg p-4 transition-all ${
                reinvestmentAllocation.bonds.enabled
                  ? 'border-blue-300 bg-blue-50/50'
                  : 'border-slate-200 bg-slate-50/50'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-lg">
                      📜
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-700">Section 54EC Bonds</div>
                      <div className="text-[10px] text-slate-500">NHAI/REC/PFC bonds • 5.25% p.a. • 5 year lock-in</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const willEnable = !reinvestmentAllocation.bonds.enabled
                      setReinvestmentAllocation(prev => ({
                        ...prev,
                        bonds: {
                          ...prev.bonds,
                          enabled: willEnable,
                          amount: willEnable ? Math.min(allocationCalculations.maxBondAmount, allocationCalculations.remainingAfterPersonalAndBonds) : 0,
                        },
                      }))
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      reinvestmentAllocation.bonds.enabled ? 'bg-blue-500' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      reinvestmentAllocation.bonds.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {reinvestmentAllocation.bonds.enabled && (
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <label className="text-[10px] text-slate-600">Investment amount (max ₹50L)</label>
                        <span className="font-mono text-sm font-semibold text-blue-600">
                          ₹{formatCompact(reinvestmentAllocation.bonds.amount)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={allocationCalculations.maxBondAmount}
                        step={10000}
                        value={reinvestmentAllocation.bonds.amount}
                        onChange={(e) => setReinvestmentAllocation(prev => ({
                          ...prev,
                          bonds: { ...prev.bonds, amount: Number(e.target.value) },
                        }))}
                        className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-500"
                      />
                      <div className="flex justify-between mt-1 text-[9px] text-slate-400">
                        <span>₹0</span>
                        <span>₹{formatCompact(allocationCalculations.maxBondAmount)} (Max)</span>
                      </div>
                    </div>

                    {/* Bond Projections */}
                    <div className="bg-blue-100 rounded-lg p-3">
                      <div className="text-[10px] font-semibold text-blue-700 uppercase mb-2">
                        Projected Returns @ {allocationCalculations.bonds.interestRate}% p.a. (5 years)
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="text-center">
                          <div className="text-[9px] text-blue-600">Invested</div>
                          <div className="font-mono font-semibold">₹{formatCompact(allocationCalculations.bondsAmount)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] text-blue-600">Interest</div>
                          <div className="font-mono font-semibold text-green-600">+₹{formatCompact(allocationCalculations.bonds.totalInterest)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] text-red-500">Tax ({section54Projection.taxSlab}%)</div>
                          <div className="font-mono font-semibold text-red-500">-₹{formatCompact(allocationCalculations.bonds.taxOnInterest)}</div>
                        </div>
                        <div className="text-center bg-white rounded p-1">
                          <div className="text-[9px] text-blue-700 font-medium">Net Value</div>
                          <div className="font-mono font-bold text-blue-700">₹{formatCompact(allocationCalculations.bonds.netValue)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Real Estate Reinvestment */}
              <div className={`border rounded-lg p-4 transition-all ${
                reinvestmentAllocation.realEstate.enabled
                  ? 'border-purple-300 bg-purple-50/50'
                  : 'border-slate-200 bg-slate-50/50'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-lg">
                      🏠
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-700">Real Estate Reinvestment</div>
                      <div className="text-[10px] text-slate-500">Section 54/54F • New property • 3 year lock-in</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const willEnable = !reinvestmentAllocation.realEstate.enabled
                      setReinvestmentAllocation(prev => ({
                        ...prev,
                        realEstate: {
                          ...prev.realEstate,
                          enabled: willEnable,
                          amount: willEnable ? allocationCalculations.remainingAfterPersonalAndBonds : 0,
                          appreciationRate: originalCAGR > 0 ? Math.round(originalCAGR * 10) / 10 : 8,
                        },
                      }))
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      reinvestmentAllocation.realEstate.enabled ? 'bg-purple-500' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      reinvestmentAllocation.realEstate.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {reinvestmentAllocation.realEstate.enabled && (
                  <div className="space-y-3">
                    {/* Investment Amount (auto-calculated) */}
                    <div className="bg-purple-100 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-[10px] text-purple-700 font-medium">Remaining Amount for Investment</div>
                          <div className="text-[9px] text-purple-600">Auto-calculated from remaining proceeds</div>
                        </div>
                        <div className="font-mono text-lg font-bold text-purple-700">
                          ₹{formatCompact(allocationCalculations.realEstateAmount)}
                        </div>
                      </div>
                    </div>

                    {/* Original Property Performance */}
                    <div className="bg-white rounded p-2 border border-purple-200">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Your sold property achieved</span>
                        <span className={`font-mono font-semibold ${originalCAGR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {originalCAGR >= 0 ? '+' : ''}{originalCAGR.toFixed(1)}% CAGR
                        </span>
                      </div>
                    </div>

                    {/* Appreciation Rate Slider */}
                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <label className="text-[10px] text-slate-600">Expected Appreciation Rate</label>
                        <span className={`font-mono text-sm font-semibold ${reinvestmentAllocation.realEstate.appreciationRate >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                          {reinvestmentAllocation.realEstate.appreciationRate}% p.a.
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-10}
                        max={25}
                        step={0.5}
                        value={reinvestmentAllocation.realEstate.appreciationRate}
                        onChange={(e) => setReinvestmentAllocation(prev => ({
                          ...prev,
                          realEstate: { ...prev.realEstate, appreciationRate: Number(e.target.value) },
                        }))}
                        className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-purple-600"
                      />
                      <div className="flex justify-between mt-1 text-[9px] text-slate-400">
                        <span>-10%</span>
                        <span className="text-purple-500">Original: {originalCAGR.toFixed(1)}%</span>
                        <span>25%</span>
                      </div>
                    </div>

                    {/* Rental Income Toggle */}
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-purple-200">
                      <div>
                        <div className="text-xs font-medium text-slate-700">Enable Rental Income</div>
                        <div className="text-[9px] text-slate-500">Generate rental income from new property</div>
                      </div>
                      <button
                        onClick={() => setReinvestmentAllocation(prev => ({
                          ...prev,
                          realEstate: { ...prev.realEstate, enableRental: !prev.realEstate.enableRental },
                        }))}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          reinvestmentAllocation.realEstate.enableRental ? 'bg-purple-600' : 'bg-slate-300'
                        }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          reinvestmentAllocation.realEstate.enableRental ? 'translate-x-4' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    {/* Rental Details (if enabled) */}
                    {reinvestmentAllocation.realEstate.enableRental && (
                      <div className="space-y-3 p-3 bg-white rounded border border-purple-200">
                        {/* Monthly Rent */}
                        <div>
                          <div className="flex justify-between items-baseline mb-1">
                            <label className="text-[10px] text-slate-500">Monthly Rent</label>
                            <span className="font-mono text-xs font-semibold text-green-600">
                              ₹{formatNumber(reinvestmentAllocation.realEstate.monthlyRent)}/mo
                            </span>
                          </div>
                          <input
                            type="range"
                            min={5000}
                            max={200000}
                            step={1000}
                            value={reinvestmentAllocation.realEstate.monthlyRent}
                            onChange={(e) => setReinvestmentAllocation(prev => ({
                              ...prev,
                              realEstate: { ...prev.realEstate, monthlyRent: Number(e.target.value) },
                            }))}
                            className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-green-600"
                          />
                          <div className="flex justify-between mt-0.5 text-[8px] text-slate-400">
                            <span>₹5K</span>
                            <span>₹2L</span>
                          </div>
                        </div>

                        {/* Rent Start Month */}
                        <div>
                          <div className="flex justify-between items-baseline mb-1">
                            <label className="text-[10px] text-slate-500">Rent Starts After</label>
                            <span className="font-mono text-xs font-semibold text-slate-600">
                              {reinvestmentAllocation.realEstate.rentStartMonth === 0 ? 'Immediately' : `${reinvestmentAllocation.realEstate.rentStartMonth} months`}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={24}
                            step={1}
                            value={reinvestmentAllocation.realEstate.rentStartMonth}
                            onChange={(e) => setReinvestmentAllocation(prev => ({
                              ...prev,
                              realEstate: { ...prev.realEstate, rentStartMonth: Number(e.target.value) },
                            }))}
                            className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-slate-500"
                          />
                          <div className="flex justify-between mt-0.5 text-[8px] text-slate-400">
                            <span>Immediate</span>
                            <span>24 months</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Real Estate Projections */}
                    <div className="bg-purple-100 rounded-lg p-3">
                      <div className="text-[10px] font-semibold text-purple-700 uppercase mb-2">
                        Projected Returns ({allocationCalculations.realEstate.lockInYears} Year Lock-in)
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div className="bg-white rounded p-2">
                          <div className="text-[9px] text-slate-400">Property Value ({allocationCalculations.realEstate.lockInYears}y)</div>
                          <div className="font-mono font-semibold text-purple-600">
                            ₹{formatCompact(allocationCalculations.realEstate.projectedValue)}
                          </div>
                        </div>
                        <div className="bg-white rounded p-2">
                          <div className="text-[9px] text-slate-400">Capital Appreciation</div>
                          <div className={`font-mono font-semibold ${allocationCalculations.realEstate.capitalAppreciation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {allocationCalculations.realEstate.capitalAppreciation >= 0 ? '+' : ''}₹{formatCompact(allocationCalculations.realEstate.capitalAppreciation)}
                          </div>
                        </div>
                        {reinvestmentAllocation.realEstate.enableRental && (
                          <div className="bg-white rounded p-2 col-span-2">
                            <div className="text-[9px] text-slate-400">Rental Income ({allocationCalculations.realEstate.rentMonths} months)</div>
                            <div className="font-mono font-semibold text-green-600">
                              +₹{formatCompact(allocationCalculations.realEstate.totalRental)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Tax & Net Summary */}
                      <div className="grid grid-cols-3 gap-2 text-xs bg-gradient-to-r from-purple-50 to-green-50 rounded p-2">
                        <div className="text-center">
                          <div className="text-[9px] text-green-600">Total Returns</div>
                          <div className={`font-mono font-bold ${allocationCalculations.realEstate.totalReturns >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                            {allocationCalculations.realEstate.totalReturns >= 0 ? '+' : ''}₹{formatCompact(allocationCalculations.realEstate.totalReturns)}
                          </div>
                        </div>
                        <div className="text-center border-l border-r border-purple-200">
                          <div className="text-[9px] text-red-500">
                            {reinvestmentAllocation.realEstate.enableRental ? `Tax (${section54Projection.taxSlab}%+LTCG)` : 'LTCG Tax (12.5%)'}
                          </div>
                          <div className="font-mono font-bold text-red-500">
                            -₹{formatCompact(allocationCalculations.realEstate.totalTax)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] text-purple-700 font-medium">Net Value</div>
                          <div className="font-mono font-bold text-purple-700">
                            ₹{formatCompact(allocationCalculations.realEstate.netValue)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Allocation Summary */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-4 text-white">
            <div className="text-xs font-semibold uppercase text-slate-400 mb-3">Net Cash-in-Hand Summary</div>

            {/* Allocation Breakdown */}
            <div className="space-y-2 mb-4">
              {reinvestmentAllocation.personalUse.enabled && allocationCalculations.personalUseAmount > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-amber-400">💰 Personal Use</span>
                  <span className="font-mono">₹{formatCompact(allocationCalculations.personalUseAmount)}</span>
                </div>
              )}
              {reinvestmentAllocation.bonds.enabled && allocationCalculations.bondsAmount > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-400">📜 54EC Bonds (5y maturity)</span>
                  <span className="font-mono">₹{formatCompact(allocationCalculations.bonds.netValue)}</span>
                </div>
              )}
              {reinvestmentAllocation.realEstate.enabled && allocationCalculations.realEstateAmount > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-purple-400">🏠 Real Estate (3y lock-in)</span>
                  <span className="font-mono">₹{formatCompact(allocationCalculations.realEstate.netValue)}</span>
                </div>
              )}
              {allocationCalculations.unallocated > 0 && (
                <div className="flex justify-between items-center text-sm text-slate-400">
                  <span>⚪ Unallocated</span>
                  <span className="font-mono">₹{formatCompact(allocationCalculations.unallocated)}</span>
                </div>
              )}
            </div>

            {/* Total Projected Value */}
            <div className="pt-3 border-t border-slate-700">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-lg font-bold">Total Projected Value</div>
                  <div className="text-[10px] text-slate-400">After lock-in periods complete</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-bold text-green-400">
                    ₹{formatCompact(allocationCalculations.totalProjectedValue)}
                  </div>
                  {allocationCalculations.totalProjectedValue > allocationCalculations.netProceeds && (
                    <div className="text-[10px] text-green-400">
                      +₹{formatCompact(allocationCalculations.totalProjectedValue - allocationCalculations.netProceeds)} growth
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tax Exemption Info */}
          {exemptions.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-green-600 text-lg">✅</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-green-800 mb-1">Tax Exemption Available</div>
                  <div className="text-xs text-green-700">
                    {exemptions.map((e) => (
                      <div key={e.section} className="flex justify-between py-1 border-b border-green-200 last:border-0">
                        <span>Section {e.section}: {e.name}</span>
                        <span className="font-semibold">Save ₹{formatCompact(e.taxSaved)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}


      {/* Strategy Comparison */}
      {activeTab === 'compare' && exemptions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Strategy Comparison</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Compare all strategies including projected returns after {exemptions[0]?.lockInYears || 3}-year lock-in
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold text-slate-500">Strategy</th>
                  <th className="px-3 py-3 text-right font-semibold text-slate-500">Investment</th>
                  <th className="px-3 py-3 text-right font-semibold text-slate-500">Tax Saved</th>
                  <th className="px-3 py-3 text-right font-semibold text-slate-500">Net Cash-in-Hand</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-500">CAGR</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-500">Lock-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* No Action Row */}
                <tr className="bg-red-50">
                  <td className="px-3 py-3 font-medium text-slate-700">No Action (Pay Tax)</td>
                  <td className="px-3 py-3 text-right font-mono">₹0</td>
                  <td className="px-3 py-3 text-right font-mono text-red-600">-₹{formatNumber(result.totalTax)}</td>
                  <td className="px-3 py-3 text-right font-mono text-slate-600">
                    ₹{formatNumber(result.netSaleConsideration - result.totalTax)}
                  </td>
                  <td className="px-3 py-3 text-center text-slate-400">-</td>
                  <td className="px-3 py-3 text-center">-</td>
                </tr>
                {exemptions.map((strategy) => {
                  // Calculate net cash-in-hand for each strategy
                  let netCashInHand = 0
                  let cagr = '-'

                  if (strategy.propertyProjection) {
                    netCashInHand = strategy.propertyProjection.netCashInHand
                    cagr = `${strategy.propertyProjection.annualizedReturn.toFixed(1)}%`
                  } else if (strategy.bondDetails) {
                    netCashInHand = strategy.bondDetails.netMaturityValue
                    // Calculate bond CAGR
                    const bondCagr = calculateCAGR(strategy.investmentRequired, strategy.bondDetails.netMaturityValue, strategy.lockInYears)
                    cagr = `${bondCagr.toFixed(1)}%`
                  }

                  return (
                    <tr key={strategy.section} className="hover:bg-slate-50">
                      <td className="px-3 py-3">
                        <span className="font-medium text-slate-700">Sec {strategy.section}</span>
                        <span className="text-slate-400 ml-1 hidden sm:inline">- {strategy.name}</span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono">₹{formatCompact(strategy.investmentRequired)}</td>
                      <td className="px-3 py-3 text-right font-mono font-semibold text-green-600">
                        +₹{formatCompact(strategy.taxSaved)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-semibold text-emerald-600">
                        ₹{formatCompact(netCashInHand)}
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-purple-600 font-medium">{cagr}</td>
                      <td className="px-3 py-3 text-center">{strategy.lockInYears}y</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Best Strategy Recommendation */}
          {exemptions.length > 0 && (
            <div className="px-4 py-3 bg-green-50 border-t border-green-100">
              <div className="flex items-center gap-2">
                <span className="text-green-600 text-lg">💡</span>
                <div className="text-xs">
                  <span className="font-semibold text-green-700">Recommended: </span>
                  <span className="text-green-600">
                    Section {exemptions[0].section} saves you ₹{formatNumber(exemptions[0].taxSaved)} in taxes
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Visual Bar Comparison */}
          <div className="px-4 py-4 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-600 mb-3">Net Cash-in-Hand Comparison</h4>
            <div className="space-y-3">
              {/* Calculate max for scale */}
              {(() => {
                const noActionAmount = result.netSaleConsideration - result.totalTax
                const allAmounts = [
                  noActionAmount,
                  ...exemptions.map(s =>
                    s.propertyProjection?.netCashInHand ||
                    s.bondDetails?.netMaturityValue ||
                    0
                  )
                ]
                const maxAmount = Math.max(...allAmounts)

                return (
                  <>
                    {/* No Action Bar */}
                    <div className="flex items-center gap-3">
                      <div className="w-24 text-[10px] text-slate-600 flex-shrink-0">No Action</div>
                      <div className="flex-1 relative">
                        <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full flex items-center justify-end pr-2"
                            style={{ width: `${(noActionAmount / maxAmount) * 100}%` }}
                          >
                            <span className="text-[9px] font-mono font-semibold text-white">
                              ₹{formatCompact(noActionAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Strategy Bars */}
                    {exemptions.map((strategy) => {
                      const amount = strategy.propertyProjection?.netCashInHand ||
                                     strategy.bondDetails?.netMaturityValue ||
                                     0
                      const isBest = amount === maxAmount

                      return (
                        <div key={strategy.section} className="flex items-center gap-3">
                          <div className="w-24 text-[10px] text-slate-600 flex-shrink-0">
                            Section {strategy.section}
                            {isBest && <span className="text-green-600 ml-1">★</span>}
                          </div>
                          <div className="flex-1 relative">
                            <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full flex items-center justify-end pr-2 ${
                                  isBest
                                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                    : strategy.section === '54EC'
                                      ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                                      : 'bg-gradient-to-r from-purple-400 to-purple-500'
                                }`}
                                style={{ width: `${(amount / maxAmount) * 100}%` }}
                              >
                                <span className="text-[9px] font-mono font-semibold text-white">
                                  ₹{formatCompact(amount)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )
              })()}
            </div>
            <div className="text-[9px] text-slate-400 mt-3 flex items-center gap-1">
              <span className="text-green-600">★</span>
              <span>Best option based on projected net cash-in-hand after {exemptions[0]?.lockInYears || 3} years</span>
            </div>
          </div>
        </div>
      )}

      {/* No Exemptions Available */}
      {(activeTab === 'exemptions' || activeTab === 'compare') && exemptions.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <div className="text-3xl mb-2">⚠️</div>
          <h3 className="text-sm font-semibold text-amber-800 mb-1">No Exemptions Available</h3>
          <p className="text-xs text-amber-600">
            {!result.holdingPeriod.isLongTerm
              ? 'Short-term capital gains are not eligible for Section 54/54EC/54F exemptions.'
              : result.capitalGain <= 0
              ? 'No capital gain to claim exemption on.'
              : 'No applicable exemptions found.'}
          </p>
        </div>
      )}

      {/* CII Reference */}
      <details className="bg-white border border-slate-200 rounded-xl">
        <summary className="px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
          Cost Inflation Index (CII) Reference
        </summary>
        <div className="px-4 pb-4">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mt-2">
            {Object.entries(CII_DATA).slice(-15).map(([year, cii]) => (
              <div
                key={year}
                className={`text-center p-2 rounded text-xs ${
                  year === getFinancialYear(new Date(property.purchaseDate)) ||
                  year === getFinancialYear(new Date(property.saleDate))
                    ? 'bg-purple-100 text-purple-700 font-semibold'
                    : 'bg-slate-50 text-slate-600'
                }`}
              >
                <div className="text-[10px] text-slate-400">FY{year.slice(-2)}</div>
                <div>{cii}</div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-3">
            Base Year: 2001-02 = 100. CII is used to adjust purchase cost for inflation (LTCG only, old regime).
          </p>
        </div>
      </details>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <span className="text-amber-500">⚠️</span>
          <div className="text-xs text-amber-800">
            <strong>Disclaimer:</strong> This calculator provides estimates for educational purposes only.
            Tax rules are complex and may change. Always consult a qualified CA/Tax Advisor for actual tax planning.
            Budget 2024 introduced changes to LTCG rates - properties acquired after July 23, 2024 are taxed at 12.5% without indexation.
          </div>
        </div>
      </div>
    </div>
  )
})

export default RealEstateCalculator
