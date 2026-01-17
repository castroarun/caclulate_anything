'use client'

import { useState, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useNumberFormat } from '@/contexts/NumberFormatContext'

// Cost Inflation Index (CII) Data - Base Year 2001-02 = 100
const CII_DATA: Record<string, number> = {
  '2001': 100, '2002': 105, '2003': 109, '2004': 113, '2005': 117,
  '2006': 122, '2007': 129, '2008': 137, '2009': 148, '2010': 167,
  '2011': 184, '2012': 200, '2013': 220, '2014': 240, '2015': 254,
  '2016': 264, '2017': 272, '2018': 280, '2019': 289, '2020': 301,
  '2021': 317, '2022': 331, '2023': 348, '2024': 363, '2025': 378,
  '2026': 394, // Estimated
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

// Calculate exemption strategies
function calculateExemptions(
  property: PropertyDetails,
  result: CapitalGainsResult,
  projectionState: Section54ProjectionState
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

    // Tax calculations on returns
    const taxSlab = projectionState.taxSlab / 100
    const cessRate = 0.04
    // Rental income is taxed at slab rate
    const taxOnRentalIncome = Math.round(totalRentalIncome * taxSlab * (1 + cessRate))
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
    // FD interest is taxed at slab rate
    const taxOnFDReturns = Math.round(returnAt8Percent * taxSlab * (1 + cessRate))
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
  // Interest is taxable at user's slab rate
  const userTaxSlab = projectionState.taxSlab / 100
  const taxOnInterest = Math.round(totalInterest * userTaxSlab * 1.04) // slab rate + 4% cess
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

  // Calculate results
  const result = useMemo(() => calculateCapitalGains(property), [property])
  const exemptions = useMemo(() => calculateExemptions(property, result, section54Projection), [property, result, section54Projection])

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

  return (
    <div className="space-y-4">
      {/* Income Tax Slab Selector */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-purple-700">Your Income Tax Slab</div>
            <div className="text-[10px] text-purple-500">Used for calculating tax on rental income & FD interest</div>
          </div>
          <div className="flex flex-wrap gap-1">
            {TAX_SLABS.map((slab) => (
              <button
                key={slab.value}
                onClick={() => setSection54Projection(prev => ({ ...prev, taxSlab: slab.value }))}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  section54Projection.taxSlab === slab.value
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

      {/* Exemption Strategies */}
      {activeTab === 'exemptions' && exemptions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Tax-Saving Strategies</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Reinvest your capital gains to save tax
            </p>
          </div>

          <div className="p-4 space-y-3">
            {exemptions.map((strategy) => (
              <div
                key={strategy.section}
                className="border border-slate-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                        Section {strategy.section}
                      </span>
                      <span className="text-sm font-semibold text-slate-700">{strategy.name}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{strategy.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase">Tax Saved</div>
                    <div className="text-lg font-bold text-green-600">
                      ₹{formatNumber(strategy.taxSaved)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-slate-50 rounded p-2 text-center">
                    <div className="text-[9px] text-slate-400 uppercase">Invest</div>
                    <div className="text-xs font-semibold">{formatCompact(strategy.investmentRequired)}</div>
                  </div>
                  <div className="bg-slate-50 rounded p-2 text-center">
                    <div className="text-[9px] text-slate-400 uppercase">Lock-in</div>
                    <div className="text-xs font-semibold">{strategy.lockInYears} years</div>
                  </div>
                  <div className="bg-amber-50 rounded p-2 text-center">
                    <div className="text-[9px] text-amber-600 uppercase">Deadline</div>
                    <div className="text-xs font-semibold text-amber-700">
                      {strategy.deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                {/* Bond Details for 54EC */}
                {strategy.bondDetails && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-3">
                    <div className="text-[10px] font-semibold text-blue-700 uppercase mb-2">
                      Bond Returns @ {strategy.bondDetails.interestRate}% p.a.
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white rounded p-2">
                        <div className="text-[9px] text-slate-400">Interest Earned (5 yrs)</div>
                        <div className="font-mono font-semibold text-blue-600">
                          +₹{formatNumber(strategy.bondDetails.totalInterest)}
                        </div>
                      </div>
                      <div className="bg-white rounded p-2">
                        <div className="text-[9px] text-slate-400">Maturity Value</div>
                        <div className="font-mono font-semibold text-slate-700">
                          ₹{formatNumber(strategy.bondDetails.maturityValue)}
                        </div>
                      </div>
                      <div className="bg-white rounded p-2">
                        <div className="text-[9px] text-slate-400">Tax on Interest (30%)</div>
                        <div className="font-mono font-semibold text-red-500">
                          -₹{formatNumber(strategy.bondDetails.taxOnInterest)}
                        </div>
                      </div>
                      <div className="bg-green-50 rounded p-2">
                        <div className="text-[9px] text-green-600">Net in Hand</div>
                        <div className="font-mono font-semibold text-green-700">
                          ₹{formatNumber(strategy.bondDetails.netMaturityValue)}
                        </div>
                      </div>
                    </div>
                    <div className="text-[9px] text-blue-600 mt-2">
                      * Interest is paid annually and taxed at your slab rate
                    </div>
                  </div>
                )}

                {/* Property Projection for Section 54/54F */}
                {strategy.propertyProjection && (strategy.section === '54' || strategy.section === '54F') && (
                  <div className="bg-purple-50 rounded-lg p-3 mb-3">
                    <div className="text-[10px] font-semibold text-purple-700 uppercase mb-3">
                      New Property Returns Projection ({strategy.lockInYears} Year Lock-in)
                    </div>

                    {/* Original Property Performance */}
                    <div className="bg-white rounded p-2 mb-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Your sold property achieved</span>
                        <span className={`font-mono font-semibold ${originalCAGR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {originalCAGR >= 0 ? '+' : ''}{originalCAGR.toFixed(1)}% CAGR
                        </span>
                      </div>
                    </div>

                    {/* Appreciation Rate Slider */}
                    <div className="mb-3">
                      <div className="flex justify-between items-baseline mb-1">
                        <label className="text-[10px] text-slate-600">Expected Appreciation Rate</label>
                        <span className={`font-mono text-sm font-semibold ${section54Projection.appreciationRate >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                          {section54Projection.appreciationRate}% p.a.
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-10}
                        max={25}
                        step={0.5}
                        value={section54Projection.appreciationRate}
                        onChange={(e) => setSection54Projection(prev => ({ ...prev, appreciationRate: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-purple-600"
                      />
                      <div className="flex justify-between mt-1 text-[9px] text-slate-400">
                        <span>-10%</span>
                        <span className="text-purple-500">Original: {originalCAGR.toFixed(1)}%</span>
                        <span>25%</span>
                      </div>
                    </div>

                    {/* Rental Income Toggle */}
                    <div className="mb-3">
                      <div className="flex items-center justify-end gap-2">
                        <label className="text-[10px] text-slate-600">Enable Rental Income</label>
                        <button
                          onClick={() => setSection54Projection(prev => ({ ...prev, enableRental: !prev.enableRental }))}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            section54Projection.enableRental ? 'bg-purple-600' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              section54Projection.enableRental ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Rental Details (if enabled) */}
                    {section54Projection.enableRental && (
                      <div className="space-y-3 mb-3 p-2 bg-white rounded">
                        {/* Monthly Rent */}
                        <div>
                          <div className="flex justify-between items-baseline mb-1">
                            <label className="text-[10px] text-slate-500">Monthly Rent</label>
                            <span className="font-mono text-xs font-semibold text-green-600">
                              ₹{formatNumber(section54Projection.monthlyRent)}/mo
                            </span>
                          </div>
                          <input
                            type="range"
                            min={5000}
                            max={200000}
                            step={1000}
                            value={section54Projection.monthlyRent}
                            onChange={(e) => setSection54Projection(prev => ({ ...prev, monthlyRent: Number(e.target.value) }))}
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
                              {section54Projection.rentStartMonth === 0 ? 'Immediately' : `${section54Projection.rentStartMonth} months`}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={24}
                            step={1}
                            value={section54Projection.rentStartMonth}
                            onChange={(e) => setSection54Projection(prev => ({ ...prev, rentStartMonth: Number(e.target.value) }))}
                            className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-slate-500"
                          />
                          <div className="flex justify-between mt-0.5 text-[8px] text-slate-400">
                            <span>Immediate</span>
                            <span>24 months</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Projected Returns */}
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div className="bg-white rounded p-2">
                        <div className="text-[9px] text-slate-400">Property Value ({strategy.lockInYears}y)</div>
                        <div className="font-mono font-semibold text-purple-600">
                          ₹{formatCompact(strategy.propertyProjection.projectedPropertyValue)}
                        </div>
                      </div>
                      <div className="bg-white rounded p-2">
                        <div className="text-[9px] text-slate-400">Capital Appreciation</div>
                        <div className={`font-mono font-semibold ${strategy.propertyProjection.capitalAppreciation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {strategy.propertyProjection.capitalAppreciation >= 0 ? '+' : ''}₹{formatCompact(strategy.propertyProjection.capitalAppreciation)}
                        </div>
                      </div>
                      {section54Projection.enableRental && (
                        <div className="bg-white rounded p-2 col-span-2">
                          <div className="text-[9px] text-slate-400">Rental Income ({strategy.lockInYears}y)</div>
                          <div className="font-mono font-semibold text-green-600">
                            +₹{formatCompact(strategy.propertyProjection.totalRentalIncome)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Returns Summary with Tax Breakdown */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <div className="text-[9px] text-green-600 font-medium uppercase">Total Returns</div>
                          <div className={`font-mono font-bold text-sm ${strategy.propertyProjection.totalReturns >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                            {strategy.propertyProjection.totalReturns >= 0 ? '+' : ''}₹{formatCompact(strategy.propertyProjection.totalReturns)}
                          </div>
                          <div className="text-[8px] text-slate-500">({strategy.propertyProjection.annualizedReturn.toFixed(1)}% CAGR)</div>
                        </div>
                        <div className="text-center border-l border-r border-green-200">
                          <div className="text-[9px] text-red-500 font-medium uppercase">
                            {section54Projection.enableRental
                              ? `Tax (${strategy.propertyProjection.taxSlab}% + LTCG)`
                              : 'LTCG Tax (12.5%)'
                            }
                          </div>
                          <div className="font-mono font-bold text-sm text-red-600">
                            -₹{formatCompact(strategy.propertyProjection.totalTaxOnReturns)}
                          </div>
                          <div className="text-[8px] text-slate-500">
                            {section54Projection.enableRental
                              ? `Rent @${strategy.propertyProjection.taxSlab}% + Appreciation @12.5%`
                              : 'On appreciation + 4% cess'
                            }
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] text-emerald-600 font-medium uppercase">Net Cash-in-Hand</div>
                          <div className="font-mono font-bold text-sm text-emerald-700">
                            ₹{formatCompact(strategy.propertyProjection.netCashInHand)}
                          </div>
                          <div className="text-[8px] text-slate-500">After all taxes</div>
                        </div>
                      </div>
                    </div>

                    {/* Comparison: What if paid tax instead */}
                    <div className="mt-3 p-2 bg-amber-50 rounded">
                      <div className="text-[9px] font-semibold text-amber-700 uppercase mb-2">
                        Alternative: Pay Tax & Invest in FD @8%
                      </div>
                      <div className="grid grid-cols-5 gap-1 text-[10px]">
                        <div className="text-center">
                          <div className="text-amber-600 text-[8px]">Tax Paid</div>
                          <div className="font-mono font-semibold text-red-600">-₹{formatCompact(strategy.propertyProjection.comparisonWithoutExemption.taxPaid)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-amber-600 text-[8px]">Invested</div>
                          <div className="font-mono font-semibold">₹{formatCompact(strategy.propertyProjection.comparisonWithoutExemption.investedAmount)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-amber-600 text-[8px]">FD Returns</div>
                          <div className="font-mono font-semibold text-green-600">+₹{formatCompact(strategy.propertyProjection.comparisonWithoutExemption.returnAt8Percent)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-red-500 text-[8px]">Tax ({section54Projection.taxSlab}%)</div>
                          <div className="font-mono font-semibold text-red-600">-₹{formatCompact(strategy.propertyProjection.comparisonWithoutExemption.taxOnFDReturns)}</div>
                        </div>
                        <div className="text-center bg-white rounded p-1">
                          <div className="text-amber-700 text-[8px] font-medium">Net</div>
                          <div className="font-mono font-semibold text-amber-700">₹{formatCompact(strategy.propertyProjection.comparisonWithoutExemption.investedAmount + strategy.propertyProjection.comparisonWithoutExemption.netFDReturns)}</div>
                        </div>
                      </div>
                      <div className="text-[9px] text-amber-700 mt-2 flex items-center gap-1">
                        {strategy.propertyProjection.netCashInHand > (strategy.propertyProjection.comparisonWithoutExemption.investedAmount + strategy.propertyProjection.comparisonWithoutExemption.netFDReturns)
                          ? <>
                              <span className="text-green-600">✓</span>
                              <span>Section {strategy.section} reinvestment is better by ₹{formatCompact(strategy.propertyProjection.netCashInHand - strategy.propertyProjection.comparisonWithoutExemption.investedAmount - strategy.propertyProjection.comparisonWithoutExemption.netFDReturns)}</span>
                            </>
                          : <>
                              <span className="text-amber-600">⚠</span>
                              <span>FD investment may be better if property appreciation is lower</span>
                            </>
                        }
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-slate-500 space-y-1">
                  {strategy.notes.slice(0, 3).map((note, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-purple-400">•</span>
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
