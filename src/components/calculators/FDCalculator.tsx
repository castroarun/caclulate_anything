'use client'

import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useNumberFormat } from '@/contexts/NumberFormatContext'

// ============ Interfaces ============

interface FDResult {
  maturityAmount: number
  totalInterest: number
  investmentAmount: number
  effectiveRate: number
  principalPercent: number
  interestPercent: number
}

interface YearlyBreakdown {
  year: number
  principal: number
  interest: number
  balance: number
}

type InterestPayoutOption = 'maturity' | 'monthly' | 'quarterly' | 'yearly'
type CompoundingFrequency = 'monthly' | 'quarterly' | 'halfYearly' | 'yearly'

interface RateComparison {
  id: number
  rate: number
  maturityAmount: number
  totalInterest: number
}

// ============ Helper Functions ============

function formatIndianNumber(num: number): string {
  const str = Math.round(num).toString()
  let result = ''
  let count = 0

  for (let i = str.length - 1; i >= 0; i--) {
    if (count === 3 || (count > 3 && (count - 3) % 2 === 0)) {
      result = ',' + result
    }
    result = str[i] + result
    count++
  }

  return result
}

// Static format for exports (always Indian)
function formatCompactStatic(num: number): string {
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`
  return `₹${num}`
}

function getCompoundingPerYear(frequency: CompoundingFrequency): number {
  const map: Record<CompoundingFrequency, number> = {
    monthly: 12,
    quarterly: 4,
    halfYearly: 2,
    yearly: 1,
  }
  return map[frequency]
}

function getPayoutPerYear(payout: InterestPayoutOption): number {
  const map: Record<InterestPayoutOption, number> = {
    maturity: 0, // No periodic payouts
    monthly: 12,
    quarterly: 4,
    yearly: 1,
  }
  return map[payout]
}

// ============ FD Calculation Functions ============

/**
 * Calculate FD maturity amount using compound interest formula
 * A = P × (1 + r/n)^(n×t)
 */
function calculateFD(
  principal: number,
  rate: number,
  tenureMonths: number,
  compounding: CompoundingFrequency,
  payout: InterestPayoutOption
): FDResult {
  const tenureYears = tenureMonths / 12
  const n = getCompoundingPerYear(compounding)
  const r = rate / 100

  let maturityAmount: number
  let totalInterest: number

  if (payout === 'maturity') {
    // Compound interest - interest is reinvested
    maturityAmount = principal * Math.pow(1 + r / n, n * tenureYears)
    totalInterest = maturityAmount - principal
  } else {
    // Periodic payout - simple interest calculation for payouts
    // Interest is paid out periodically, so no compounding on that portion
    const payoutFreq = getPayoutPerYear(payout)
    const periodicInterest = (principal * r) / payoutFreq
    const totalPayouts = payoutFreq * tenureYears
    totalInterest = periodicInterest * totalPayouts
    maturityAmount = principal + totalInterest
  }

  // Calculate effective annual rate
  const effectiveRate = ((maturityAmount / principal - 1) / tenureYears) * 100
  const total = maturityAmount
  const principalPercent = Math.round((principal / total) * 100)
  const interestPercent = 100 - principalPercent

  return {
    maturityAmount: Math.round(maturityAmount),
    totalInterest: Math.round(totalInterest),
    investmentAmount: principal,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    principalPercent,
    interestPercent,
  }
}

function generateYearlyBreakdown(
  principal: number,
  rate: number,
  tenureMonths: number,
  compounding: CompoundingFrequency
): YearlyBreakdown[] {
  const tenureYears = Math.ceil(tenureMonths / 12)
  const n = getCompoundingPerYear(compounding)
  const r = rate / 100
  const breakdown: YearlyBreakdown[] = []

  let previousBalance = principal

  for (let year = 1; year <= tenureYears; year++) {
    const effectiveMonths = Math.min(year * 12, tenureMonths)
    const effectiveYears = effectiveMonths / 12
    const balance = principal * Math.pow(1 + r / n, n * effectiveYears)
    const yearInterest = balance - previousBalance

    breakdown.push({
      year,
      principal,
      interest: Math.round(yearInterest),
      balance: Math.round(balance),
    })

    previousBalance = balance
  }

  return breakdown
}

function calculateForRate(
  principal: number,
  rate: number,
  tenureMonths: number,
  compounding: CompoundingFrequency
): { maturityAmount: number; totalInterest: number } {
  const tenureYears = tenureMonths / 12
  const n = getCompoundingPerYear(compounding)
  const r = rate / 100
  const maturityAmount = principal * Math.pow(1 + r / n, n * tenureYears)
  const totalInterest = maturityAmount - principal

  return {
    maturityAmount: Math.round(maturityAmount),
    totalInterest: Math.round(totalInterest),
  }
}

// Reverse calculation: Find required principal for a target maturity
function calculateRequiredPrincipal(
  targetMaturity: number,
  rate: number,
  tenureMonths: number,
  compounding: CompoundingFrequency
): number {
  const tenureYears = tenureMonths / 12
  const n = getCompoundingPerYear(compounding)
  const r = rate / 100

  // P = A / (1 + r/n)^(n×t)
  const principal = targetMaturity / Math.pow(1 + r / n, n * tenureYears)
  return Math.round(principal)
}

// ============ Main Component ============

export interface FDCalculatorRef {
  exportToPDF: () => void
  exportToHTML: () => void
  exportToExcel: () => void
  handleClear: () => void
}

const FDCalculator = forwardRef<FDCalculatorRef>(function FDCalculator(props, ref) {
  const { formatCurrencyCompact } = useNumberFormat()
  // State
  const [mode, setMode] = useState<'calculate' | 'target'>('calculate')
  const [principal, setPrincipal] = useState(500000)
  const [targetMaturity, setTargetMaturity] = useState(1000000) // For target mode
  const [rate, setRate] = useState(7.0)
  const [tenureMonths, setTenureMonths] = useState(24)
  const [compounding, setCompounding] = useState<CompoundingFrequency>('quarterly')
  const [payout, setPayout] = useState<InterestPayoutOption>('maturity')
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [showRateComparison, setShowRateComparison] = useState(false)
  const [comparisonRates, setComparisonRates] = useState<RateComparison[]>([])
  const [nextRateId, setNextRateId] = useState(1)
  const [isLoaded, setIsLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const calculatorRef = useRef<HTMLDivElement>(null)

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calc_fd')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setMode(data.mode || 'calculate')
        setPrincipal(data.principal || 500000)
        setTargetMaturity(data.targetMaturity || 1000000)
        setRate(data.rate || 7.0)
        setTenureMonths(data.tenureMonths || 24)
        setCompounding(data.compounding || 'quarterly')
        setPayout(data.payout || 'maturity')
        setNotes(data.notes || '')
      } catch {
        // Invalid saved data, use defaults
      }
    }
    setIsLoaded(true)
  }, [])

  // Auto-save to localStorage (only after initial load)
  useEffect(() => {
    if (!isLoaded) return
    const data = { mode, principal, targetMaturity, rate, tenureMonths, compounding, payout, notes }
    localStorage.setItem('calc_fd', JSON.stringify(data))
    setLastSaved(new Date().toLocaleTimeString())
  }, [mode, principal, targetMaturity, rate, tenureMonths, compounding, payout, notes, isLoaded])

  // Calculate required principal for target mode
  const requiredPrincipal = useMemo(
    () => calculateRequiredPrincipal(targetMaturity, rate, tenureMonths, compounding),
    [targetMaturity, rate, tenureMonths, compounding]
  )

  // Use requiredPrincipal as principal in target mode for result calculation
  const effectivePrincipal = mode === 'target' ? requiredPrincipal : principal

  // Calculate results
  const result = useMemo(
    () => calculateFD(effectivePrincipal, rate, tenureMonths, compounding, payout),
    [effectivePrincipal, rate, tenureMonths, compounding, payout]
  )

  const yearlyBreakdown = useMemo(
    () => generateYearlyBreakdown(effectivePrincipal, rate, tenureMonths, compounding),
    [effectivePrincipal, rate, tenureMonths, compounding]
  )

  // Update comparison rates when inputs change
  useEffect(() => {
    if (comparisonRates.length > 0) {
      setComparisonRates((prev) =>
        prev.map((item) => {
          const { maturityAmount, totalInterest } = calculateForRate(
            principal,
            item.rate,
            tenureMonths,
            compounding
          )
          return { ...item, maturityAmount, totalInterest }
        })
      )
    }
  }, [principal, tenureMonths, compounding, comparisonRates.length])

  // Rate comparison helpers
  const addComparisonRate = () => {
    const newRate = rate + (comparisonRates.length + 1) * 0.5
    const { maturityAmount, totalInterest } = calculateForRate(
      principal,
      newRate,
      tenureMonths,
      compounding
    )
    setComparisonRates([
      ...comparisonRates,
      { id: nextRateId, rate: newRate, maturityAmount, totalInterest },
    ])
    setNextRateId(nextRateId + 1)
  }

  const removeComparisonRate = (id: number) => {
    setComparisonRates(comparisonRates.filter((r) => r.id !== id))
  }

  const updateComparisonRate = (id: number, newRate: number) => {
    const { maturityAmount, totalInterest } = calculateForRate(
      principal,
      newRate,
      tenureMonths,
      compounding
    )
    setComparisonRates(
      comparisonRates.map((r) =>
        r.id === id ? { ...r, rate: newRate, maturityAmount, totalInterest } : r
      )
    )
  }

  // Get all rates for comparison (current + comparison rates)
  const allRatesForComparison = useMemo(() => {
    const current = {
      id: 0,
      rate,
      maturityAmount: result.maturityAmount,
      totalInterest: result.totalInterest,
    }
    return [current, ...comparisonRates].sort((a, b) => b.maturityAmount - a.maturityAmount)
  }, [rate, result, comparisonRates])

  const bestRate = allRatesForComparison[0]

  // Handle clear
  const handleClear = () => {
    setMode('calculate')
    setPrincipal(500000)
    setTargetMaturity(1000000)
    setRate(7.0)
    setTenureMonths(24)
    setCompounding('quarterly')
    setPayout('maturity')
    setComparisonRates([])
    setNotes('')
    localStorage.removeItem('calc_fd')
  }

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    exportToPDF,
    exportToHTML,
    exportToExcel,
    handleClear,
  }))

  // Generate yearly breakdown chart HTML for exports
  const generateYearlyChartHTML = (breakdown: YearlyBreakdown[]) => {
    const maxBalance = Math.max(...breakdown.map((y) => y.balance))
    return breakdown
      .map((y) => {
        const barWidth = maxBalance > 0 ? (y.balance / maxBalance) * 100 : 0
        const principalWidth = y.balance > 0 ? (principal / y.balance) * 100 : 0
        const interestWidth = 100 - principalWidth
        return `
          <div class="year-row">
            <span class="year-label">Y${y.year}</span>
            <div class="bar-container" style="width: ${barWidth}%">
              <div class="bar-principal" style="width: ${principalWidth}%">
                ${principalWidth > 20 ? `<span>${formatCurrencyCompact(principal)}</span>` : ''}
              </div>
              <div class="bar-interest" style="width: ${interestWidth}%">
                ${interestWidth > 15 ? `<span>${formatCurrencyCompact(y.interest)}</span>` : ''}
              </div>
            </div>
            <span class="balance-label">${formatCurrencyCompact(y.balance)}</span>
          </div>
        `
      })
      .join('')
  }

  // Export to Excel (CSV)
  const exportToExcel = () => {
    const headers = ['Year', 'Principal (₹)', 'Interest Earned (₹)', 'Balance (₹)']
    const rows = yearlyBreakdown.map((row) => [row.year, row.principal, row.interest, row.balance])

    const csvContent = [
      `FD Calculator - Yearly Breakdown`,
      `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`,
      ``,
      `Principal Amount: ₹${formatIndianNumber(principal)}`,
      `Interest Rate: ${rate}% p.a.`,
      `Tenure: ${tenureMonths} months (${(tenureMonths / 12).toFixed(1)} years)`,
      `Compounding: ${compounding}`,
      `Interest Payout: ${payout === 'maturity' ? 'At Maturity' : payout}`,
      `Maturity Amount: ₹${formatIndianNumber(result.maturityAmount)}`,
      `Total Interest: ₹${formatIndianNumber(result.totalInterest)}`,
      `Effective Rate: ${result.effectiveRate}% p.a.`,
      ``,
      headers.join(','),
      ...rows.map((row) => row.join(',')),
      ``,
      comparisonRates.length > 0 ? 'Rate Comparison:' : '',
      comparisonRates.length > 0 ? 'Rate,Maturity Amount,Total Interest' : '',
      ...comparisonRates.map((r) => `${r.rate}%,₹${formatIndianNumber(r.maturityAmount)},₹${formatIndianNumber(r.totalInterest)}`),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `FD_Calculator_${principal}_${rate}pct_${tenureMonths}m.csv`
    link.click()
  }

  // Export to PDF
  const exportToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>FD Calculator Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #16a34a; font-size: 24px; margin-bottom: 5px; }
          h2 { font-size: 16px; margin-top: 25px; margin-bottom: 15px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
          .summary-item { text-align: center; }
          .summary-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .summary-value { font-size: 16px; font-weight: bold; color: #0f172a; margin-top: 4px; }
          .maturity-highlight { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .maturity-label { font-size: 11px; color: #16a34a; text-transform: uppercase; letter-spacing: 1px; }
          .maturity-value { font-size: 32px; font-weight: bold; color: #0f172a; }

          /* Pie Chart */
          .chart-section { display: flex; align-items: center; gap: 30px; margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 12px; }
          .pie-chart { width: 120px; height: 120px; border-radius: 50%; background: conic-gradient(#22c55e 0% ${result.principalPercent}%, #3b82f6 ${result.principalPercent}% 100%); flex-shrink: 0; }
          .chart-legend { flex: 1; }
          .legend-item { display: flex; align-items: center; gap: 10px; margin: 8px 0; font-size: 13px; }
          .legend-color { width: 16px; height: 16px; border-radius: 4px; }
          .legend-principal { background: #22c55e; }
          .legend-interest { background: #3b82f6; }

          /* Yearly Chart */
          .yearly-chart { margin: 15px 0; }
          .chart-header { display: flex; font-size: 10px; color: #94a3b8; text-transform: uppercase; margin-bottom: 10px; padding: 0 5px; }
          .chart-header span:first-child { width: 40px; }
          .chart-header span:nth-child(2) { flex: 1; }
          .chart-header span:last-child { width: 70px; text-align: right; }
          .year-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
          .year-label { width: 35px; font-size: 11px; color: #64748b; font-family: monospace; }
          .bar-container { height: 24px; background: #e2e8f0; border-radius: 4px; display: flex; overflow: hidden; flex: 1; }
          .bar-principal { background: #22c55e; display: flex; align-items: center; justify-content: flex-end; padding-right: 4px; }
          .bar-interest { background: #3b82f6; display: flex; align-items: center; justify-content: flex-start; padding-left: 4px; }
          .bar-principal span, .bar-interest span { font-size: 9px; color: white; font-weight: 500; }
          .balance-label { width: 65px; font-size: 10px; color: #64748b; text-align: right; font-family: monospace; }
          .chart-footer { display: flex; gap: 20px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 11px; }
          .chart-footer-item { display: flex; align-items: center; gap: 6px; }
          .chart-footer-color { width: 12px; height: 12px; border-radius: 3px; }

          /* Rate Comparison */
          .comparison-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .comparison-table th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 11px; color: #475569; }
          .comparison-table td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
          .best-rate { background: #f0fdf4; }
          .best-badge { background: #22c55e; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }

          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          .notes-section { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin: 20px 0; }
          .notes-title { font-size: 12px; font-weight: 600; color: #92400e; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
          .notes-content { font-size: 12px; color: #78350f; line-height: 1.6; white-space: pre-wrap; }
          @media print {
            body { padding: 10px; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <h1>FD Calculator Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Principal Amount</div>
              <div class="summary-value">₹${formatIndianNumber(principal)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Interest Rate</div>
              <div class="summary-value">${rate}% p.a.</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Tenure</div>
              <div class="summary-value">${tenureMonths} months</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Compounding</div>
              <div class="summary-value">${compounding === 'halfYearly' ? 'Half-Yearly' : compounding.charAt(0).toUpperCase() + compounding.slice(1)}</div>
            </div>
          </div>
        </div>

        <div class="maturity-highlight">
          <div class="maturity-label">Maturity Amount</div>
          <div class="maturity-value">₹${formatIndianNumber(result.maturityAmount)}</div>
        </div>

        <h2>Investment Breakdown</h2>
        <div class="chart-section">
          <div class="pie-chart"></div>
          <div class="chart-legend">
            <div class="legend-item">
              <div class="legend-color legend-principal"></div>
              <span>Principal: ₹${formatIndianNumber(principal)} (${result.principalPercent}%)</span>
            </div>
            <div class="legend-item">
              <div class="legend-color legend-interest"></div>
              <span>Interest: ₹${formatIndianNumber(result.totalInterest)} (${result.interestPercent}%)</span>
            </div>
            <div class="legend-item" style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
              <strong>Effective Rate: ${result.effectiveRate}% p.a.</strong>
            </div>
          </div>
        </div>

        <h2>Yearly Growth</h2>
        <div class="yearly-chart">
          <div class="chart-header">
            <span>Year</span>
            <span>Principal & Interest</span>
            <span>Balance</span>
          </div>
          ${generateYearlyChartHTML(yearlyBreakdown)}
          <div class="chart-footer">
            <div class="chart-footer-item">
              <div class="chart-footer-color" style="background: #22c55e;"></div>
              <span>Principal</span>
            </div>
            <div class="chart-footer-item">
              <div class="chart-footer-color" style="background: #3b82f6;"></div>
              <span>Interest</span>
            </div>
          </div>
        </div>

        ${
          comparisonRates.length > 0
            ? `
        <h2>Rate Comparison</h2>
        <table class="comparison-table">
          <tr>
            <th>Interest Rate</th>
            <th>Maturity Amount</th>
            <th>Total Interest</th>
            <th></th>
          </tr>
          ${allRatesForComparison
            .map(
              (r) => `
            <tr class="${r.id === bestRate.id ? 'best-rate' : ''}">
              <td>${r.rate}% p.a.${r.id === 0 ? ' (Current)' : ''}</td>
              <td>₹${formatIndianNumber(r.maturityAmount)}</td>
              <td>₹${formatIndianNumber(r.totalInterest)}</td>
              <td>${r.id === bestRate.id ? '<span class="best-badge">BEST</span>' : ''}</td>
            </tr>
          `
            )
            .join('')}
        </table>
        `
            : ''
        }

        ${notes && notes.trim() ? `
        <div class="notes-section">
          <div class="notes-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10,9 9,9 8,9"></polyline>
            </svg>
            Notes
          </div>
          <div class="notes-content">${notes.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>
        ` : ''}

        <div class="footer">
          Generated by AnyCalc - Calculate everything. Plan anything.
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

  // Export to HTML
  const exportToHTML = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>FD Calculator Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #16a34a; font-size: 24px; margin-bottom: 5px; }
          h2 { font-size: 16px; margin-top: 25px; margin-bottom: 15px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
          .summary-item { text-align: center; }
          .summary-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .summary-value { font-size: 16px; font-weight: bold; color: #0f172a; margin-top: 4px; }
          .maturity-highlight { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .maturity-label { font-size: 11px; color: #16a34a; text-transform: uppercase; letter-spacing: 1px; }
          .maturity-value { font-size: 32px; font-weight: bold; color: #0f172a; }

          /* Pie Chart */
          .chart-section { display: flex; align-items: center; gap: 30px; margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 12px; }
          .pie-chart { width: 120px; height: 120px; border-radius: 50%; background: conic-gradient(#22c55e 0% ${result.principalPercent}%, #3b82f6 ${result.principalPercent}% 100%); flex-shrink: 0; }
          .chart-legend { flex: 1; }
          .legend-item { display: flex; align-items: center; gap: 10px; margin: 8px 0; font-size: 13px; }
          .legend-color { width: 16px; height: 16px; border-radius: 4px; }
          .legend-principal { background: #22c55e; }
          .legend-interest { background: #3b82f6; }

          /* Yearly Chart */
          .yearly-chart { margin: 15px 0; }
          .chart-header { display: flex; font-size: 10px; color: #94a3b8; text-transform: uppercase; margin-bottom: 10px; padding: 0 5px; }
          .chart-header span:first-child { width: 40px; }
          .chart-header span:nth-child(2) { flex: 1; }
          .chart-header span:last-child { width: 70px; text-align: right; }
          .year-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
          .year-label { width: 35px; font-size: 11px; color: #64748b; font-family: monospace; }
          .bar-container { height: 24px; background: #e2e8f0; border-radius: 4px; display: flex; overflow: hidden; flex: 1; }
          .bar-principal { background: #22c55e; display: flex; align-items: center; justify-content: flex-end; padding-right: 4px; }
          .bar-interest { background: #3b82f6; display: flex; align-items: center; justify-content: flex-start; padding-left: 4px; }
          .bar-principal span, .bar-interest span { font-size: 9px; color: white; font-weight: 500; }
          .balance-label { width: 65px; font-size: 10px; color: #64748b; text-align: right; font-family: monospace; }
          .chart-footer { display: flex; gap: 20px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 11px; }
          .chart-footer-item { display: flex; align-items: center; gap: 6px; }
          .chart-footer-color { width: 12px; height: 12px; border-radius: 3px; }

          /* Rate Comparison */
          .comparison-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .comparison-table th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 11px; color: #475569; }
          .comparison-table td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
          .best-rate { background: #f0fdf4; }
          .best-badge { background: #22c55e; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }

          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          .notes-section { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin: 20px 0; }
          .notes-title { font-size: 12px; font-weight: 600; color: #92400e; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
          .notes-content { font-size: 12px; color: #78350f; line-height: 1.6; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h1>FD Calculator Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Principal Amount</div>
              <div class="summary-value">₹${formatIndianNumber(principal)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Interest Rate</div>
              <div class="summary-value">${rate}% p.a.</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Tenure</div>
              <div class="summary-value">${tenureMonths} months</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Compounding</div>
              <div class="summary-value">${compounding === 'halfYearly' ? 'Half-Yearly' : compounding.charAt(0).toUpperCase() + compounding.slice(1)}</div>
            </div>
          </div>
        </div>

        <div class="maturity-highlight">
          <div class="maturity-label">Maturity Amount</div>
          <div class="maturity-value">₹${formatIndianNumber(result.maturityAmount)}</div>
        </div>

        <h2>Investment Breakdown</h2>
        <div class="chart-section">
          <div class="pie-chart"></div>
          <div class="chart-legend">
            <div class="legend-item">
              <div class="legend-color legend-principal"></div>
              <span>Principal: ₹${formatIndianNumber(principal)} (${result.principalPercent}%)</span>
            </div>
            <div class="legend-item">
              <div class="legend-color legend-interest"></div>
              <span>Interest: ₹${formatIndianNumber(result.totalInterest)} (${result.interestPercent}%)</span>
            </div>
            <div class="legend-item" style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
              <strong>Effective Rate: ${result.effectiveRate}% p.a.</strong>
            </div>
          </div>
        </div>

        <h2>Yearly Growth</h2>
        <div class="yearly-chart">
          <div class="chart-header">
            <span>Year</span>
            <span>Principal & Interest</span>
            <span>Balance</span>
          </div>
          ${generateYearlyChartHTML(yearlyBreakdown)}
          <div class="chart-footer">
            <div class="chart-footer-item">
              <div class="chart-footer-color" style="background: #22c55e;"></div>
              <span>Principal</span>
            </div>
            <div class="chart-footer-item">
              <div class="chart-footer-color" style="background: #3b82f6;"></div>
              <span>Interest</span>
            </div>
          </div>
        </div>

        ${
          comparisonRates.length > 0
            ? `
        <h2>Rate Comparison</h2>
        <table class="comparison-table">
          <tr>
            <th>Interest Rate</th>
            <th>Maturity Amount</th>
            <th>Total Interest</th>
            <th></th>
          </tr>
          ${allRatesForComparison
            .map(
              (r) => `
            <tr class="${r.id === bestRate.id ? 'best-rate' : ''}">
              <td>${r.rate}% p.a.${r.id === 0 ? ' (Current)' : ''}</td>
              <td>₹${formatIndianNumber(r.maturityAmount)}</td>
              <td>₹${formatIndianNumber(r.totalInterest)}</td>
              <td>${r.id === bestRate.id ? '<span class="best-badge">BEST</span>' : ''}</td>
            </tr>
          `
            )
            .join('')}
        </table>
        `
            : ''
        }

        ${notes && notes.trim() ? `
        <div class="notes-section">
          <div class="notes-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10,9 9,9 8,9"></polyline>
            </svg>
            Notes
          </div>
          <div class="notes-content">${notes.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>
        ` : ''}

        <div class="footer">
          Generated by AnyCalc - Calculate everything. Plan anything.
        </div>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `FD_Report_${principal}_${rate}pct_${tenureMonths}m.html`
    link.click()
  }

  // Tenure options in months
  const tenureOptions = [
    { value: 6, label: '6 months' },
    { value: 12, label: '1 year' },
    { value: 24, label: '2 years' },
    { value: 36, label: '3 years' },
    { value: 60, label: '5 years' },
    { value: 84, label: '7 years' },
    { value: 120, label: '10 years' },
  ]

  return (
    <div className="space-y-4" ref={calculatorRef}>
      {/* Export Bar */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-slate-400 mr-2">Export:</span>
        <button
          onClick={exportToPDF}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          PDF
        </button>
        <button
          onClick={exportToHTML}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          HTML
        </button>
        <button
          onClick={exportToExcel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Excel
        </button>
      </div>

      {/* Main Calculator Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Mode Toggle */}
        <div className="p-3 border-b border-slate-100 bg-slate-50">
          <div className="flex rounded-lg bg-slate-200 p-0.5">
            <button
              onClick={() => setMode('calculate')}
              className={`flex-1 px-4 py-2 text-xs font-medium rounded-md transition-all ${
                mode === 'calculate'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Calculate Maturity
            </button>
            <button
              onClick={() => setMode('target')}
              className={`flex-1 px-4 py-2 text-xs font-medium rounded-md transition-all ${
                mode === 'target'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Plan for Target
            </button>
          </div>
          <p className="text-[10px] text-slate-500 text-center mt-2">
            {mode === 'calculate'
              ? 'Calculate maturity value for your deposit'
              : 'Find the deposit needed to reach your target'}
          </p>
        </div>

        <div className="grid md:grid-cols-2">
          {/* Inputs */}
          <div className="p-5 space-y-5 border-r border-slate-100">
            {mode === 'calculate' ? (
              /* Principal Amount - Calculate mode */
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <label className="text-sm font-medium text-slate-600">Principal Amount</label>
                  <span className="font-mono text-base font-semibold text-slate-900">
                    ₹{formatIndianNumber(principal)}
                  </span>
                </div>
                <input
                  type="range"
                  min={10000}
                  max={100000000}
                  step={10000}
                  value={principal}
                  onChange={(e) => setPrincipal(Number(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-green-600"
                />
                <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                  <span>₹10K</span>
                  <span>₹10Cr</span>
                </div>
              </div>
            ) : (
              /* Target Maturity - Target mode */
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <label className="text-sm font-medium text-slate-600">Target Maturity</label>
                  <span className="font-mono text-base font-semibold text-green-600">
                    ₹{formatIndianNumber(targetMaturity)}
                  </span>
                </div>
                <input
                  type="range"
                  min={100000}
                  max={100000000}
                  step={100000}
                  value={targetMaturity}
                  onChange={(e) => setTargetMaturity(Number(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-green-600"
                />
                <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                  <span>₹1L</span>
                  <span>₹10Cr</span>
                </div>
                {/* Quick target presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[500000, 1000000, 2500000, 5000000, 10000000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setTargetMaturity(amt)}
                      className={`px-2 py-1 text-[10px] rounded-full border transition-colors ${
                        targetMaturity === amt
                          ? 'bg-green-50 border-green-300 text-green-700'
                          : 'border-slate-200 text-slate-500 hover:border-green-300'
                      }`}
                    >
                      {formatCurrencyCompact(amt).replace('₹', '')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Interest Rate */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Interest Rate</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  {rate}% p.a.
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={10}
                step={0.1}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-green-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>3%</span>
                <span>10%</span>
              </div>
            </div>

            {/* Tenure */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Tenure</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  {tenureMonths} months ({(tenureMonths / 12).toFixed(1)} yrs)
                </span>
              </div>
              <input
                type="range"
                min={6}
                max={120}
                step={1}
                value={tenureMonths}
                onChange={(e) => setTenureMonths(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-green-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>6 months</span>
                <span>10 years</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tenureOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTenureMonths(opt.value)}
                    className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                      tenureMonths === opt.value
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Compounding Frequency */}
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-2">
                Compounding Frequency
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'quarterly', label: 'Quarterly' },
                    { value: 'halfYearly', label: 'Half-Yearly' },
                    { value: 'yearly', label: 'Yearly' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setCompounding(opt.value)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      compounding === opt.value
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interest Payout Option */}
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-2">
                Interest Payout
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: 'maturity', label: 'At Maturity' },
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'quarterly', label: 'Quarterly' },
                    { value: 'yearly', label: 'Yearly' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPayout(opt.value)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      payout === opt.value
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="p-5 bg-slate-50">
            {/* Primary Result - Mode dependent */}
            {mode === 'calculate' ? (
              <div className="bg-green-50 rounded-lg p-4 text-center mb-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-green-600 mb-1">
                  Maturity Amount
                </div>
                <div className="font-mono text-3xl font-bold text-slate-900">
                  ₹{formatIndianNumber(result.maturityAmount)}
                </div>
              </div>
            ) : (
              <div className="bg-green-50 rounded-lg p-4 text-center mb-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-green-600 mb-1">
                  Required Deposit
                </div>
                <div className="font-mono text-3xl font-bold text-slate-900">
                  ₹{formatIndianNumber(requiredPrincipal)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  to reach ₹{formatIndianNumber(targetMaturity)}
                </div>
              </div>
            )}

            {/* Secondary Results */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
                  {mode === 'calculate' ? 'Principal' : 'Target'}
                </div>
                <div className="font-mono text-sm font-semibold text-slate-900">
                  {mode === 'calculate' ? formatCurrencyCompact(principal) : formatCurrencyCompact(targetMaturity)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
                  Interest
                </div>
                <div className="font-mono text-sm font-semibold text-slate-900">
                  {formatCurrencyCompact(result.totalInterest)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
                  Eff. Rate
                </div>
                <div className="font-mono text-sm font-semibold text-slate-900">
                  {result.effectiveRate}%
                </div>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="bg-white rounded-lg p-3 flex items-center gap-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="3"
                    strokeDasharray={`${result.principalPercent} ${100 - result.principalPercent}`}
                  />
                </svg>
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 bg-green-500 rounded-sm" />
                  <span className="text-slate-600">Principal</span>
                  <span className="ml-auto font-mono font-medium">{result.principalPercent}%</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 bg-blue-500 rounded-sm" />
                  <span className="text-slate-600">Interest</span>
                  <span className="ml-auto font-mono font-medium">{result.interestPercent}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Auto-save indicator with subtle notes */}
        <div className="px-5 py-2 bg-slate-50 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              Auto-saved {lastSaved || 'just now'}
            </div>
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] transition-colors ${
                notes
                  ? 'text-green-600 bg-green-50 hover:bg-green-100'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title={notes ? 'View note' : 'Add note'}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {notes ? 'Note' : 'Add note'}
            </button>
          </div>
          {showNotes && (
            <div className="mt-2 pt-2 border-t border-slate-200">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a quick note..."
                className="w-full h-16 p-2 text-xs text-slate-600 bg-white border border-slate-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-green-400 focus:border-green-400"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* Yearly Breakdown Visual Bar Chart */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Yearly Growth</h3>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
            <span className="w-8">Year</span>
            <span className="flex-1">Principal & Interest</span>
            <span className="w-20 text-right">Balance</span>
          </div>
          <div className="space-y-2">
            {yearlyBreakdown.map((year) => {
              const maxBalance = Math.max(...yearlyBreakdown.map((y) => y.balance))
              const barWidth = maxBalance > 0 ? (year.balance / maxBalance) * 100 : 0
              const principalWidth = year.balance > 0 ? (principal / year.balance) * 100 : 0
              const interestWidth = 100 - principalWidth

              return (
                <div key={year.year} className="flex items-center gap-3">
                  <span className="text-xs w-8 font-mono text-slate-500">Y{year.year}</span>
                  <div
                    className="flex-1 h-7 bg-slate-100 rounded overflow-hidden relative"
                    style={{ width: `${barWidth}%` }}
                  >
                    <div
                      className="absolute left-0 top-0 h-full bg-green-500 flex items-center justify-end pr-1"
                      style={{ width: `${principalWidth}%` }}
                    >
                      {principalWidth > 25 && (
                        <span className="text-[9px] text-white font-medium">
                          {formatCurrencyCompact(principal)}
                        </span>
                      )}
                    </div>
                    <div
                      className="absolute top-0 h-full bg-blue-500 flex items-center justify-start pl-1"
                      style={{ left: `${principalWidth}%`, width: `${interestWidth}%` }}
                    >
                      {interestWidth > 15 && (
                        <span className="text-[9px] text-white font-medium">
                          {formatCurrencyCompact(year.interest)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-600 w-20 text-right font-mono">
                    {formatCurrencyCompact(year.balance)}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-100 text-[10px]">
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-sm" />
              Principal
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm" />
              Interest
            </div>
          </div>
        </div>
      </div>

      {/* Compare FD Rates (Collapsible) */}
      <details open={showRateComparison} className="bg-white border border-slate-200 rounded-xl">
        <summary
          className="px-4 py-3 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 flex items-center justify-between"
          onClick={(e) => {
            e.preventDefault()
            setShowRateComparison(!showRateComparison)
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <span>Compare FD Rates</span>
            <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              What-if analysis
            </span>
            {comparisonRates.length > 0 && (
              <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
                {comparisonRates.length} rate{comparisonRates.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${showRateComparison ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        {showRateComparison && (
          <div className="px-4 pb-4 pt-2">
            <p className="text-xs text-slate-500 mb-4">
              Compare different interest rates to see which bank offers the best returns.
            </p>

            {/* Current Rate Card */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-medium text-green-600 uppercase">
                    Current Rate
                  </span>
                  <div className="font-mono text-lg font-bold text-slate-900">{rate}% p.a.</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500">Maturity</div>
                  <div className="font-mono font-semibold text-green-700">
                    ₹{formatIndianNumber(result.maturityAmount)}
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison Rates List */}
            {comparisonRates.length > 0 && (
              <div className="space-y-2 mb-4">
                {comparisonRates.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      item.id === bestRate.id
                        ? 'bg-green-50 border-green-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="text-xs font-medium text-slate-400 w-4">
                      #{index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) =>
                            updateComparisonRate(item.id, Number(e.target.value))
                          }
                          className="w-20 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
                          min={3}
                          max={15}
                          step={0.1}
                        />
                        <span className="text-xs text-slate-500">% p.a.</span>
                        {item.id === bestRate.id && (
                          <span className="text-[9px] font-semibold text-white bg-green-500 px-2 py-0.5 rounded">
                            BEST
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold text-slate-900">
                        ₹{formatIndianNumber(item.maturityAmount)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        +₹{formatIndianNumber(item.totalInterest)} interest
                      </div>
                    </div>
                    <button
                      onClick={() => removeComparisonRate(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Remove rate"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Rate Button */}
            <button
              onClick={addComparisonRate}
              disabled={comparisonRates.length >= 5}
              className="w-full py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Another Rate for Comparison
            </button>

            {/* Comparison Summary */}
            {comparisonRates.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="text-xs font-semibold text-slate-700 mb-3">Comparison Summary</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">
                          Rate
                        </th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-500">
                          Maturity
                        </th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-500">
                          Interest
                        </th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-500">
                          vs Best
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allRatesForComparison.map((item) => (
                        <tr
                          key={item.id}
                          className={item.id === bestRate.id ? 'bg-green-50' : 'hover:bg-slate-50'}
                        >
                          <td className="px-3 py-2">
                            <span
                              className={`font-mono ${
                                item.id === bestRate.id
                                  ? 'text-green-700 font-semibold'
                                  : 'text-slate-600'
                              }`}
                            >
                              {item.rate}%{item.id === 0 ? ' (Current)' : ''}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-slate-900">
                            ₹{formatIndianNumber(item.maturityAmount)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-blue-600">
                            ₹{formatIndianNumber(item.totalInterest)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {item.id === bestRate.id ? (
                              <span className="text-green-600 font-semibold">Best</span>
                            ) : (
                              <span className="text-red-500">
                                -₹{formatIndianNumber(bestRate.maturityAmount - item.maturityAmount)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </details>

      {/* Pro Tips */}
      <div className="bg-gradient-to-r from-green-50 to-transparent border border-green-100 rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-green-600 mb-2">
          <span>💡</span> Pro Tips
        </div>
        <div className="grid sm:grid-cols-3 gap-3 text-xs text-slate-600">
          <div className="flex gap-2">
            <span className="text-green-500 font-bold">•</span>
            <span>Tax-saving FDs have 5-year lock-in but offer 80C deduction up to ₹1.5L</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-500 font-bold">•</span>
            <span>Senior citizens typically get 0.25-0.5% higher interest rates</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-500 font-bold">•</span>
            <span>Consider FD laddering to balance liquidity and returns</span>
          </div>
        </div>
      </div>

      {/* About Section */}
      <details className="bg-white border border-slate-200 rounded-xl">
        <summary className="px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
          About FD Calculator
        </summary>
        <div className="px-4 pb-4 text-sm text-slate-600 space-y-3">
          <p>
            <strong>Fixed Deposit (FD)</strong> is a financial instrument provided by banks that
            offers investors a higher rate of interest than a regular savings account, until the
            given maturity date.
          </p>
          <p>
            <strong>Formula (Compound Interest):</strong> A = P × (1 + r/n)^(n×t)
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li>P = Principal amount (initial deposit)</li>
            <li>r = Annual interest rate (as decimal)</li>
            <li>n = Compounding frequency per year</li>
            <li>t = Time period in years</li>
            <li>A = Maturity amount</li>
          </ul>
          <div className="mt-4 p-3 bg-amber-50 rounded-lg">
            <p className="text-amber-800 text-xs">
              <strong>Tax Note:</strong> Interest earned on FDs is taxable as per your income tax
              slab. TDS of 10% is deducted if interest exceeds ₹40,000/year (₹50,000 for senior
              citizens). Submit Form 15G/15H if your total income is below taxable limit.
            </p>
          </div>
        </div>
      </details>
    </div>
  )
})

export default FDCalculator
