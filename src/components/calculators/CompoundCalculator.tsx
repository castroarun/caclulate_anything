'use client'

import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

// Interfaces
interface CompoundResult {
  principal: number
  totalInterest: number
  finalAmount: number
  effectiveRate: number
  interestOnInterest: number
  principalPercent: number
  interestPercent: number
}

interface YearlyBreakdown {
  year: number
  openingBalance: number
  interestEarned: number
  contributions: number
  closingBalance: number
}

type CompoundingFrequency = 'daily' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly'

interface FrequencyComparison {
  frequency: CompoundingFrequency
  label: string
  finalAmount: number
  totalInterest: number
  effectiveRate: number
  difference: number
}

// Helper functions
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

function formatCompact(num: number): string {
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`
  return `₹${Math.round(num)}`
}

function getFrequencyPerYear(frequency: CompoundingFrequency): number {
  switch (frequency) {
    case 'daily': return 365
    case 'monthly': return 12
    case 'quarterly': return 4
    case 'half-yearly': return 2
    case 'yearly': return 1
  }
}

function getFrequencyLabel(frequency: CompoundingFrequency): string {
  switch (frequency) {
    case 'daily': return 'Daily'
    case 'monthly': return 'Monthly'
    case 'quarterly': return 'Quarterly'
    case 'half-yearly': return 'Half-Yearly'
    case 'yearly': return 'Yearly'
  }
}

// Core calculation functions
function calculateCompoundInterest(
  principal: number,
  rate: number,
  years: number,
  frequency: CompoundingFrequency,
  monthlyContribution: number = 0
): CompoundResult {
  const n = getFrequencyPerYear(frequency)
  const r = rate / 100

  // A = P × (1 + r/n)^(n×t)
  const compoundFactor = Math.pow(1 + r / n, n * years)
  let finalAmount = principal * compoundFactor

  // With regular monthly additions (assuming contributions at end of each period)
  // A = PMT × (((1 + r/n)^(n×t) - 1) / (r/n))
  if (monthlyContribution > 0 && r > 0) {
    // Convert monthly contribution to per-period contribution
    const periodsPerMonth = n / 12
    const contributionPerPeriod = monthlyContribution / periodsPerMonth
    const futureValueContributions = contributionPerPeriod * ((compoundFactor - 1) / (r / n))
    finalAmount += futureValueContributions
  } else if (monthlyContribution > 0 && r === 0) {
    finalAmount += monthlyContribution * 12 * years
  }

  const totalContributions = principal + (monthlyContribution * 12 * years)
  const totalInterest = finalAmount - totalContributions

  // Effective Annual Rate = (1 + r/n)^n - 1
  const effectiveRate = (Math.pow(1 + r / n, n) - 1) * 100

  // Interest on interest (compound effect)
  const simpleInterest = principal * r * years + (monthlyContribution * 12 * years * r * years / 2)
  const interestOnInterest = totalInterest - simpleInterest

  return {
    principal: totalContributions,
    totalInterest: Math.round(totalInterest),
    finalAmount: Math.round(finalAmount),
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    interestOnInterest: Math.max(0, Math.round(interestOnInterest)),
    principalPercent: Math.round((totalContributions / finalAmount) * 100),
    interestPercent: Math.round((totalInterest / finalAmount) * 100),
  }
}

function generateYearlyBreakdown(
  principal: number,
  rate: number,
  years: number,
  frequency: CompoundingFrequency,
  monthlyContribution: number = 0
): YearlyBreakdown[] {
  const n = getFrequencyPerYear(frequency)
  const r = rate / 100
  const breakdown: YearlyBreakdown[] = []

  let balance = principal

  for (let year = 1; year <= years; year++) {
    const openingBalance = balance
    const yearlyContribution = monthlyContribution * 12

    // Calculate interest for this year with contributions
    const periodsInYear = n
    let yearEndBalance = openingBalance

    for (let period = 1; period <= periodsInYear; period++) {
      // Add contribution proportionally
      yearEndBalance += yearlyContribution / periodsInYear
      // Apply interest
      yearEndBalance *= (1 + r / n)
    }

    // Simplified calculation for yearly balance
    const compoundFactor = Math.pow(1 + r / n, n)
    yearEndBalance = openingBalance * compoundFactor

    if (monthlyContribution > 0 && r > 0) {
      const periodsPerMonth = n / 12
      const contributionPerPeriod = monthlyContribution / periodsPerMonth
      const futureValueContributions = contributionPerPeriod * ((compoundFactor - 1) / (r / n))
      yearEndBalance += futureValueContributions
    } else if (monthlyContribution > 0) {
      yearEndBalance += yearlyContribution
    }

    const interestEarned = yearEndBalance - openingBalance - yearlyContribution

    breakdown.push({
      year,
      openingBalance: Math.round(openingBalance),
      interestEarned: Math.round(interestEarned),
      contributions: Math.round(yearlyContribution),
      closingBalance: Math.round(yearEndBalance),
    })

    balance = yearEndBalance
  }

  return breakdown
}

// Reverse calculation: Find required principal for target amount
function calculateRequiredPrincipal(
  targetAmount: number,
  rate: number,
  years: number,
  frequency: CompoundingFrequency,
  monthlyContribution: number = 0
): number {
  const n = getFrequencyPerYear(frequency)
  const r = rate / 100
  const compoundFactor = Math.pow(1 + r / n, n * years)

  if (monthlyContribution > 0 && r > 0) {
    // With monthly contributions, subtract the FV of contributions from target
    const periodsPerMonth = n / 12
    const contributionPerPeriod = monthlyContribution / periodsPerMonth
    const futureValueContributions = contributionPerPeriod * ((compoundFactor - 1) / (r / n))
    const remainingTarget = targetAmount - futureValueContributions
    // Principal needed = remainingTarget / compoundFactor
    return Math.max(0, Math.round(remainingTarget / compoundFactor))
  } else if (monthlyContribution > 0 && r === 0) {
    // No interest case with contributions
    const totalContributions = monthlyContribution * 12 * years
    return Math.max(0, Math.round(targetAmount - totalContributions))
  }

  // Simple case: P = A / (1 + r/n)^(n×t)
  return Math.round(targetAmount / compoundFactor)
}

function compareFrequencies(
  principal: number,
  rate: number,
  years: number,
  monthlyContribution: number = 0
): FrequencyComparison[] {
  const frequencies: CompoundingFrequency[] = ['yearly', 'half-yearly', 'quarterly', 'monthly', 'daily']
  const yearlyResult = calculateCompoundInterest(principal, rate, years, 'yearly', monthlyContribution)

  return frequencies.map(freq => {
    const result = calculateCompoundInterest(principal, rate, years, freq, monthlyContribution)
    return {
      frequency: freq,
      label: getFrequencyLabel(freq),
      finalAmount: result.finalAmount,
      totalInterest: result.totalInterest,
      effectiveRate: result.effectiveRate,
      difference: result.finalAmount - yearlyResult.finalAmount,
    }
  })
}

export interface CompoundCalculatorRef {
  exportToPDF: () => void
  exportToHTML: () => void
  exportToExcel: () => void
  handleClear: () => void
}

const CompoundCalculator = forwardRef<CompoundCalculatorRef>(function CompoundCalculator(props, ref) {
  const [principal, setPrincipal] = useState(100000)
  const [rate, setRate] = useState(12)
  const [years, setYears] = useState(10)
  const [frequency, setFrequency] = useState<CompoundingFrequency>('yearly')
  const [monthlyContribution, setMonthlyContribution] = useState(0)
  const [showContribution, setShowContribution] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [mode, setMode] = useState<'calculate' | 'target'>('calculate')
  const [targetAmount, setTargetAmount] = useState(1000000)
  const calculatorRef = useRef<HTMLDivElement>(null)

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calc_compound')
    if (saved) {
      const data = JSON.parse(saved)
      setPrincipal(data.principal || 100000)
      setRate(data.rate || 12)
      setYears(data.years || 10)
      setFrequency(data.frequency || 'yearly')
      setMonthlyContribution(data.monthlyContribution || 0)
      setShowContribution(data.monthlyContribution > 0)
      setNotes(data.notes || '')
      setMode(data.mode || 'calculate')
      setTargetAmount(data.targetAmount || 1000000)
    }
    setIsLoaded(true)
  }, [])

  // Auto-save to localStorage (only after initial load)
  useEffect(() => {
    if (!isLoaded) return
    const data = { principal, rate, years, frequency, monthlyContribution, notes, mode, targetAmount }
    localStorage.setItem('calc_compound', JSON.stringify(data))
    setLastSaved(new Date().toLocaleTimeString())
  }, [principal, rate, years, frequency, monthlyContribution, notes, mode, targetAmount, isLoaded])

  const result = useMemo(
    () => calculateCompoundInterest(principal, rate, years, frequency, monthlyContribution),
    [principal, rate, years, frequency, monthlyContribution]
  )

  const yearlyBreakdown = useMemo(
    () => generateYearlyBreakdown(principal, rate, years, frequency, monthlyContribution),
    [principal, rate, years, frequency, monthlyContribution]
  )

  const frequencyComparison = useMemo(
    () => compareFrequencies(principal, rate, years, monthlyContribution),
    [principal, rate, years, monthlyContribution]
  )

  // Reverse calculation for target mode
  const requiredPrincipal = useMemo(
    () => calculateRequiredPrincipal(targetAmount, rate, years, frequency, monthlyContribution),
    [targetAmount, rate, years, frequency, monthlyContribution]
  )

  // Effective principal based on mode
  const effectivePrincipal = mode === 'target' ? requiredPrincipal : principal

  // Result based on effective principal (for target mode display)
  const effectiveResult = useMemo(
    () => calculateCompoundInterest(effectivePrincipal, rate, years, frequency, monthlyContribution),
    [effectivePrincipal, rate, years, frequency, monthlyContribution]
  )

  // Effective yearly breakdown based on mode
  const effectiveYearlyBreakdown = useMemo(
    () => generateYearlyBreakdown(effectivePrincipal, rate, years, frequency, monthlyContribution),
    [effectivePrincipal, rate, years, frequency, monthlyContribution]
  )

  const handleClear = () => {
    setPrincipal(100000)
    setRate(12)
    setYears(10)
    setFrequency('yearly')
    setMonthlyContribution(0)
    setShowContribution(false)
    setNotes('')
    setMode('calculate')
    setTargetAmount(1000000)
    localStorage.removeItem('calc_compound')
  }

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    exportToPDF,
    exportToHTML,
    exportToExcel,
    handleClear,
  }))

  // Generate yearly chart HTML for exports
  const generateYearlyChartHTML = () => {
    const maxBalance = Math.max(...yearlyBreakdown.map(y => y.closingBalance))
    return yearlyBreakdown.map(y => {
      const barWidth = maxBalance > 0 ? (y.closingBalance / maxBalance) * 100 : 0
      const principalWidth = y.closingBalance > 0 ? ((y.openingBalance + y.contributions) / y.closingBalance) * 100 : 0
      return `
        <div class="year-row">
          <span class="year-label">Y${y.year}</span>
          <div class="bar-container" style="width: ${barWidth}%">
            <div class="bar-principal" style="width: ${Math.min(principalWidth, 100)}%">
              ${principalWidth > 20 ? `<span>${formatCompact(y.openingBalance)}</span>` : ''}
            </div>
            <div class="bar-interest" style="width: ${Math.max(0, 100 - principalWidth)}%">
              ${(100 - principalWidth) > 15 ? `<span>${formatCompact(y.interestEarned)}</span>` : ''}
            </div>
          </div>
          <span class="balance-label">${formatCompact(y.closingBalance)}</span>
        </div>
      `
    }).join('')
  }

  // Generate comparison table HTML
  const generateComparisonTableHTML = () => {
    return frequencyComparison.map(comp => `
      <tr class="${comp.frequency === frequency ? 'selected' : ''}">
        <td>${comp.label}</td>
        <td class="right">₹${formatIndianNumber(comp.finalAmount)}</td>
        <td class="right">₹${formatIndianNumber(comp.totalInterest)}</td>
        <td class="right">${comp.effectiveRate.toFixed(2)}%</td>
        <td class="right ${comp.difference > 0 ? 'positive' : ''}">${comp.difference > 0 ? '+₹' + formatIndianNumber(comp.difference) : '—'}</td>
      </tr>
    `).join('')
  }

  // Export to Excel (CSV)
  const exportToExcel = () => {
    const headers = ['Year', 'Opening Balance (₹)', 'Contributions (₹)', 'Interest Earned (₹)', 'Closing Balance (₹)']
    const rows = yearlyBreakdown.map(row => [
      row.year,
      row.openingBalance,
      row.contributions,
      row.interestEarned,
      row.closingBalance,
    ])

    const csvContent = [
      `Compound Interest Calculator - Growth Report`,
      `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`,
      ``,
      `Principal Amount: ₹${formatIndianNumber(principal)}`,
      `Interest Rate: ${rate}% p.a.`,
      `Time Period: ${years} years`,
      `Compounding: ${getFrequencyLabel(frequency)}`,
      monthlyContribution > 0 ? `Monthly Contribution: ₹${formatIndianNumber(monthlyContribution)}` : '',
      ``,
      `Final Amount: ₹${formatIndianNumber(result.finalAmount)}`,
      `Total Interest: ₹${formatIndianNumber(result.totalInterest)}`,
      `Effective Annual Rate: ${result.effectiveRate}%`,
      ``,
      `--- Compounding Frequency Comparison ---`,
      `Frequency,Final Amount,Total Interest,Effective Rate,Difference vs Yearly`,
      ...frequencyComparison.map(c =>
        `${c.label},₹${formatIndianNumber(c.finalAmount)},₹${formatIndianNumber(c.totalInterest)},${c.effectiveRate}%,${c.difference > 0 ? '+₹' + formatIndianNumber(c.difference) : '-'}`
      ),
      ``,
      `--- Yearly Breakdown ---`,
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].filter(Boolean).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Compound_Interest_${principal}_${rate}pct_${years}yrs.csv`
    link.click()
  }

  // Export to PDF
  const exportToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Compound Interest Calculator Report</title>
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
          .result-highlight { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .result-label { font-size: 11px; color: #16a34a; text-transform: uppercase; letter-spacing: 1px; }
          .result-value { font-size: 32px; font-weight: bold; color: #0f172a; }

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
          .year-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
          .year-label { width: 35px; font-size: 11px; color: #64748b; font-family: monospace; }
          .bar-container { height: 24px; background: #e2e8f0; border-radius: 4px; display: flex; overflow: hidden; flex: 1; }
          .bar-principal { background: #22c55e; display: flex; align-items: center; justify-content: flex-end; padding-right: 4px; }
          .bar-interest { background: #3b82f6; display: flex; align-items: center; justify-content: flex-start; padding-left: 4px; }
          .bar-principal span, .bar-interest span { font-size: 9px; color: white; font-weight: 500; }
          .balance-label { width: 70px; font-size: 10px; color: #64748b; text-align: right; font-family: monospace; }

          /* Comparison Table */
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
          th { background: #f1f5f9; padding: 10px 8px; text-align: left; font-weight: 600; color: #475569; }
          td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
          .right { text-align: right; }
          .positive { color: #16a34a; font-weight: 600; }
          .selected { background: #f0fdf4; }
          .selected td:first-child { border-left: 3px solid #22c55e; font-weight: 600; }

          .compound-info { background: #eff6ff; padding: 15px; border-radius: 10px; margin: 20px 0; }
          .compound-info-title { font-size: 12px; color: #1d4ed8; font-weight: 600; margin-bottom: 8px; }
          .compound-info-value { font-size: 18px; font-weight: bold; color: #1e40af; }
          .compound-info-label { font-size: 10px; color: #3b82f6; }

          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          @media print {
            body { padding: 10px; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <h1>Compound Interest Calculator Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Principal</div>
              <div class="summary-value">₹${formatIndianNumber(principal)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Interest Rate</div>
              <div class="summary-value">${rate}% p.a.</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Time Period</div>
              <div class="summary-value">${years} years</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Compounding</div>
              <div class="summary-value">${getFrequencyLabel(frequency)}</div>
            </div>
          </div>
        </div>

        ${monthlyContribution > 0 ? `
        <div class="summary" style="background: #f0fdf4;">
          <div class="summary-grid" style="grid-template-columns: repeat(2, 1fr);">
            <div class="summary-item">
              <div class="summary-label" style="color: #16a34a;">Monthly Contribution</div>
              <div class="summary-value">₹${formatIndianNumber(monthlyContribution)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label" style="color: #16a34a;">Total Invested</div>
              <div class="summary-value">₹${formatIndianNumber(result.principal)}</div>
            </div>
          </div>
        </div>
        ` : ''}

        <div class="result-highlight">
          <div class="result-label">Final Amount</div>
          <div class="result-value">₹${formatIndianNumber(result.finalAmount)}</div>
        </div>

        <h2>Investment Breakdown</h2>
        <div class="chart-section">
          <div class="pie-chart"></div>
          <div class="chart-legend">
            <div class="legend-item">
              <div class="legend-color legend-principal"></div>
              <span>Principal: ₹${formatIndianNumber(result.principal)} (${result.principalPercent}%)</span>
            </div>
            <div class="legend-item">
              <div class="legend-color legend-interest"></div>
              <span>Interest: ₹${formatIndianNumber(result.totalInterest)} (${result.interestPercent}%)</span>
            </div>
          </div>
        </div>

        <div class="compound-info">
          <div class="compound-info-title">The Power of Compounding</div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
            <div>
              <div class="compound-info-value">₹${formatIndianNumber(result.interestOnInterest)}</div>
              <div class="compound-info-label">Interest earned on interest</div>
            </div>
            <div>
              <div class="compound-info-value">${result.effectiveRate}%</div>
              <div class="compound-info-label">Effective Annual Rate</div>
            </div>
          </div>
        </div>

        <h2>Growth Over Time</h2>
        <div class="yearly-chart">
          ${generateYearlyChartHTML()}
        </div>
        <div style="display: flex; gap: 20px; margin-top: 12px; font-size: 11px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 12px; height: 12px; background: #22c55e; border-radius: 3px;"></div>
            <span>Principal + Contributions</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 12px; height: 12px; background: #3b82f6; border-radius: 3px;"></div>
            <span>Interest Earned</span>
          </div>
        </div>

        <div class="page-break"></div>
        <h2>Compounding Frequency Comparison</h2>
        <p style="font-size: 12px; color: #64748b; margin-bottom: 15px;">
          See how different compounding frequencies affect your returns
        </p>
        <table>
          <tr>
            <th>Frequency</th>
            <th class="right">Final Amount</th>
            <th class="right">Total Interest</th>
            <th class="right">Effective Rate</th>
            <th class="right">Extra vs Yearly</th>
          </tr>
          ${generateComparisonTableHTML()}
        </table>

        <h2>Year-by-Year Breakdown</h2>
        <table>
          <tr>
            <th>Year</th>
            <th class="right">Opening</th>
            <th class="right">Contributions</th>
            <th class="right">Interest</th>
            <th class="right">Closing</th>
          </tr>
          ${yearlyBreakdown.map(y => `
            <tr>
              <td>Year ${y.year}</td>
              <td class="right">₹${formatIndianNumber(y.openingBalance)}</td>
              <td class="right">₹${formatIndianNumber(y.contributions)}</td>
              <td class="right" style="color: #16a34a;">₹${formatIndianNumber(y.interestEarned)}</td>
              <td class="right" style="font-weight: 600;">₹${formatIndianNumber(y.closingBalance)}</td>
            </tr>
          `).join('')}
        </table>

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

  // Export to HTML
  const exportToHTML = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Compound Interest Calculator Report</title>
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
          .result-highlight { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .result-label { font-size: 11px; color: #16a34a; text-transform: uppercase; letter-spacing: 1px; }
          .result-value { font-size: 32px; font-weight: bold; color: #0f172a; }

          .chart-section { display: flex; align-items: center; gap: 30px; margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 12px; }
          .pie-chart { width: 120px; height: 120px; border-radius: 50%; background: conic-gradient(#22c55e 0% ${result.principalPercent}%, #3b82f6 ${result.principalPercent}% 100%); flex-shrink: 0; }
          .chart-legend { flex: 1; }
          .legend-item { display: flex; align-items: center; gap: 10px; margin: 8px 0; font-size: 13px; }
          .legend-color { width: 16px; height: 16px; border-radius: 4px; }
          .legend-principal { background: #22c55e; }
          .legend-interest { background: #3b82f6; }

          .yearly-chart { margin: 15px 0; }
          .year-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
          .year-label { width: 35px; font-size: 11px; color: #64748b; font-family: monospace; }
          .bar-container { height: 24px; background: #e2e8f0; border-radius: 4px; display: flex; overflow: hidden; flex: 1; }
          .bar-principal { background: #22c55e; display: flex; align-items: center; justify-content: flex-end; padding-right: 4px; }
          .bar-interest { background: #3b82f6; display: flex; align-items: center; justify-content: flex-start; padding-left: 4px; }
          .bar-principal span, .bar-interest span { font-size: 9px; color: white; font-weight: 500; }
          .balance-label { width: 70px; font-size: 10px; color: #64748b; text-align: right; font-family: monospace; }

          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
          th { background: #f1f5f9; padding: 10px 8px; text-align: left; font-weight: 600; color: #475569; }
          td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
          .right { text-align: right; }
          .positive { color: #16a34a; font-weight: 600; }
          .selected { background: #f0fdf4; }
          .selected td:first-child { border-left: 3px solid #22c55e; font-weight: 600; }

          .compound-info { background: #eff6ff; padding: 15px; border-radius: 10px; margin: 20px 0; }
          .compound-info-title { font-size: 12px; color: #1d4ed8; font-weight: 600; margin-bottom: 8px; }
          .compound-info-value { font-size: 18px; font-weight: bold; color: #1e40af; }
          .compound-info-label { font-size: 10px; color: #3b82f6; }

          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        </style>
      </head>
      <body>
        <h1>Compound Interest Calculator Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Principal</div>
              <div class="summary-value">₹${formatIndianNumber(principal)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Interest Rate</div>
              <div class="summary-value">${rate}% p.a.</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Time Period</div>
              <div class="summary-value">${years} years</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Compounding</div>
              <div class="summary-value">${getFrequencyLabel(frequency)}</div>
            </div>
          </div>
        </div>

        ${monthlyContribution > 0 ? `
        <div class="summary" style="background: #f0fdf4;">
          <div class="summary-grid" style="grid-template-columns: repeat(2, 1fr);">
            <div class="summary-item">
              <div class="summary-label" style="color: #16a34a;">Monthly Contribution</div>
              <div class="summary-value">₹${formatIndianNumber(monthlyContribution)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label" style="color: #16a34a;">Total Invested</div>
              <div class="summary-value">₹${formatIndianNumber(result.principal)}</div>
            </div>
          </div>
        </div>
        ` : ''}

        <div class="result-highlight">
          <div class="result-label">Final Amount</div>
          <div class="result-value">₹${formatIndianNumber(result.finalAmount)}</div>
        </div>

        <h2>Investment Breakdown</h2>
        <div class="chart-section">
          <div class="pie-chart"></div>
          <div class="chart-legend">
            <div class="legend-item">
              <div class="legend-color legend-principal"></div>
              <span>Principal: ₹${formatIndianNumber(result.principal)} (${result.principalPercent}%)</span>
            </div>
            <div class="legend-item">
              <div class="legend-color legend-interest"></div>
              <span>Interest: ₹${formatIndianNumber(result.totalInterest)} (${result.interestPercent}%)</span>
            </div>
          </div>
        </div>

        <div class="compound-info">
          <div class="compound-info-title">The Power of Compounding</div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
            <div>
              <div class="compound-info-value">₹${formatIndianNumber(result.interestOnInterest)}</div>
              <div class="compound-info-label">Interest earned on interest</div>
            </div>
            <div>
              <div class="compound-info-value">${result.effectiveRate}%</div>
              <div class="compound-info-label">Effective Annual Rate</div>
            </div>
          </div>
        </div>

        <h2>Growth Over Time</h2>
        <div class="yearly-chart">
          ${generateYearlyChartHTML()}
        </div>
        <div style="display: flex; gap: 20px; margin-top: 12px; font-size: 11px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 12px; height: 12px; background: #22c55e; border-radius: 3px;"></div>
            <span>Principal + Contributions</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 12px; height: 12px; background: #3b82f6; border-radius: 3px;"></div>
            <span>Interest Earned</span>
          </div>
        </div>

        <h2>Compounding Frequency Comparison</h2>
        <p style="font-size: 12px; color: #64748b; margin-bottom: 15px;">
          See how different compounding frequencies affect your returns
        </p>
        <table>
          <tr>
            <th>Frequency</th>
            <th class="right">Final Amount</th>
            <th class="right">Total Interest</th>
            <th class="right">Effective Rate</th>
            <th class="right">Extra vs Yearly</th>
          </tr>
          ${generateComparisonTableHTML()}
        </table>

        <h2>Year-by-Year Breakdown</h2>
        <table>
          <tr>
            <th>Year</th>
            <th class="right">Opening</th>
            <th class="right">Contributions</th>
            <th class="right">Interest</th>
            <th class="right">Closing</th>
          </tr>
          ${yearlyBreakdown.map(y => `
            <tr>
              <td>Year ${y.year}</td>
              <td class="right">₹${formatIndianNumber(y.openingBalance)}</td>
              <td class="right">₹${formatIndianNumber(y.contributions)}</td>
              <td class="right" style="color: #16a34a;">₹${formatIndianNumber(y.interestEarned)}</td>
              <td class="right" style="font-weight: 600;">₹${formatIndianNumber(y.closingBalance)}</td>
            </tr>
          `).join('')}
        </table>

        <div class="footer">
          Generated by AnyCalc — Calculate everything. Plan anything.
        </div>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Compound_Interest_Report_${principal}_${rate}pct_${years}yrs.html`
    link.click()
  }

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
        <div className="grid md:grid-cols-2">
          {/* Inputs */}
          <div className="p-5 space-y-5 border-r border-slate-100">
            {/* Mode Toggle */}
            <div className="flex rounded-lg bg-slate-100 p-1">
              <button
                onClick={() => setMode('calculate')}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${
                  mode === 'calculate'
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Calculate Maturity
              </button>
              <button
                onClick={() => setMode('target')}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${
                  mode === 'target'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Plan for Target
              </button>
            </div>

            {/* Principal Amount or Target Amount based on mode */}
            {mode === 'calculate' ? (
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <label className="text-sm font-medium text-slate-600">Principal Amount</label>
                  <span className="font-mono text-base font-semibold text-slate-900">
                    ₹{formatIndianNumber(principal)}
                  </span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={100000000}
                  step={1000}
                  value={principal}
                  onChange={(e) => setPrincipal(Number(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-green-600"
                />
                <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                  <span>₹1K</span>
                  <span>₹10Cr</span>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <label className="text-sm font-medium text-slate-600">Target Amount</label>
                  <span className="font-mono text-base font-semibold text-blue-600">
                    ₹{formatIndianNumber(targetAmount)}
                  </span>
                </div>
                <input
                  type="range"
                  min={100000}
                  max={100000000}
                  step={100000}
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(Number(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                  <span>₹1L</span>
                  <span>₹10Cr</span>
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
                min={1}
                max={30}
                step={0.5}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-green-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>1%</span>
                <span>30%</span>
              </div>
            </div>

            {/* Time Period */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Time Period</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  {years} years
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-green-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>1 yr</span>
                <span>30 yrs</span>
              </div>
            </div>

            {/* Compounding Frequency */}
            <div>
              <label className="text-sm font-medium text-slate-600 mb-2 block">
                Compounding Frequency
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {(['daily', 'monthly', 'quarterly', 'half-yearly', 'yearly'] as CompoundingFrequency[]).map((freq) => (
                  <button
                    key={freq}
                    onClick={() => setFrequency(freq)}
                    className={`px-2 py-2 text-[10px] font-medium rounded-lg transition-colors ${
                      frequency === freq
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {freq === 'half-yearly' ? 'H-Yearly' : freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Monthly Contribution Toggle */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowContribution(!showContribution)
                  if (showContribution) setMonthlyContribution(0)
                }}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
              >
                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  showContribution ? 'bg-green-600 border-green-600' : 'border-slate-300'
                }`}>
                  {showContribution && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                Add monthly contributions (SIP)
              </button>

              {showContribution && (
                <div className="mt-3">
                  <div className="flex justify-between items-baseline mb-2">
                    <label className="text-sm font-medium text-slate-600">Monthly Contribution</label>
                    <span className="font-mono text-base font-semibold text-slate-900">
                      ₹{formatIndianNumber(monthlyContribution)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100000}
                    step={1000}
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-green-600"
                  />
                  <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                    <span>₹0</span>
                    <span>₹1L</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="p-5 bg-slate-50">
            {/* Primary Result - Mode dependent */}
            {mode === 'calculate' ? (
              <div className="bg-green-50 rounded-lg p-4 text-center mb-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-green-600 mb-1">
                  Final Amount
                </div>
                <div className="font-mono text-3xl font-bold text-slate-900">
                  ₹{formatIndianNumber(result.finalAmount)}
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 rounded-lg p-4 text-center mb-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 mb-1">
                  Required Principal
                </div>
                <div className="font-mono text-3xl font-bold text-slate-900">
                  ₹{formatIndianNumber(requiredPrincipal)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  to reach ₹{formatIndianNumber(targetAmount)}
                </div>
              </div>
            )}

            {/* Secondary Results */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
                  {mode === 'calculate' ? 'Principal' : 'Target Amount'}
                </div>
                <div className="font-mono text-sm font-semibold text-slate-900">
                  {mode === 'calculate' ? formatCompact(result.principal) : formatCompact(targetAmount)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
                  Total Interest
                </div>
                <div className="font-mono text-sm font-semibold text-slate-900">
                  {mode === 'calculate' ? formatCompact(result.totalInterest) : formatCompact(effectiveResult.totalInterest)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
                  Effective Rate
                </div>
                <div className="font-mono text-sm font-semibold text-slate-900">
                  {mode === 'calculate' ? result.effectiveRate : effectiveResult.effectiveRate}%
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
                  Interest on Interest
                </div>
                <div className="font-mono text-sm font-semibold text-blue-600">
                  {mode === 'calculate' ? formatCompact(result.interestOnInterest) : formatCompact(effectiveResult.interestOnInterest)}
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
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeDasharray={`${mode === 'calculate' ? result.principalPercent : effectiveResult.principalPercent} ${100 - (mode === 'calculate' ? result.principalPercent : effectiveResult.principalPercent)}`}
                  />
                </svg>
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 bg-green-500 rounded-sm" />
                  <span className="text-slate-600">Principal</span>
                  <span className="ml-auto font-mono font-medium">{mode === 'calculate' ? result.principalPercent : effectiveResult.principalPercent}%</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 bg-blue-500 rounded-sm" />
                  <span className="text-slate-600">Interest</span>
                  <span className="ml-auto font-mono font-medium">{mode === 'calculate' ? result.interestPercent : effectiveResult.interestPercent}%</span>
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
                  ? 'text-purple-600 bg-purple-50 hover:bg-purple-100'
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
                className="w-full h-16 p-2 text-xs text-slate-600 bg-white border border-slate-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* Growth Visualization */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Growth Over Time</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Watch your investment grow year by year
          </p>
        </div>
        <div className="p-4">
          {/* Year labels */}
          <div className="flex items-center gap-3 mb-2 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
            <span className="w-8">Year</span>
            <span className="flex-1">Principal & Interest Growth</span>
            <span className="w-20 text-right">Balance</span>
          </div>

          {/* Yearly bars */}
          <div className="space-y-2">
            {(mode === 'calculate' ? yearlyBreakdown : effectiveYearlyBreakdown).map((year) => {
              const chartData = mode === 'calculate' ? yearlyBreakdown : effectiveYearlyBreakdown
              const maxBalance = Math.max(...chartData.map(y => y.closingBalance))
              const barWidth = maxBalance > 0 ? (year.closingBalance / maxBalance) * 100 : 0
              const principalRatio = year.closingBalance > 0
                ? ((year.openingBalance + year.contributions) / year.closingBalance) * 100
                : 0

              return (
                <div key={year.year} className="flex items-center gap-3">
                  <span className="text-xs w-8 font-mono text-slate-500">Y{year.year}</span>
                  <div
                    className="flex-1 h-7 bg-slate-100 rounded overflow-hidden relative"
                    style={{ width: `${barWidth}%` }}
                  >
                    <div
                      className="absolute left-0 top-0 h-full bg-green-500 flex items-center justify-end pr-1"
                      style={{ width: `${Math.min(principalRatio, 100)}%` }}
                    >
                      {principalRatio > 25 && (
                        <span className="text-[9px] text-white font-medium">
                          {formatCompact(year.openingBalance)}
                        </span>
                      )}
                    </div>
                    <div
                      className="absolute top-0 h-full bg-blue-500 flex items-center justify-start pl-1"
                      style={{ left: `${Math.min(principalRatio, 100)}%`, width: `${Math.max(0, 100 - principalRatio)}%` }}
                    >
                      {(100 - principalRatio) > 15 && (
                        <span className="text-[9px] text-white font-medium">
                          {formatCompact(year.interestEarned)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-600 w-20 text-right font-mono">
                    {formatCompact(year.closingBalance)}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-100 text-[10px]">
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-sm" />
              Principal + Contributions
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm" />
              Interest Earned
            </div>
          </div>
        </div>
      </div>

      {/* Compounding Comparison */}
      <details open={showComparison} className="bg-white border border-slate-200 rounded-xl">
        <summary
          className="px-4 py-3 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 flex items-center justify-between"
          onClick={(e) => {
            e.preventDefault()
            setShowComparison(!showComparison)
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <span>Compounding Frequency Comparison</span>
            <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              See the difference
            </span>
          </div>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${showComparison ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        {showComparison && (
          <div className="px-4 pb-4 pt-2">
            <p className="text-xs text-slate-500 mb-4">
              Compare how different compounding frequencies affect your final returns
            </p>

            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Frequency</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-500">Final Amount</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-500">Interest</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-500">Effective Rate</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-500">Extra vs Yearly</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {frequencyComparison.map((comp) => (
                    <tr
                      key={comp.frequency}
                      className={`hover:bg-slate-50 ${
                        comp.frequency === frequency ? 'bg-green-50 border-l-2 border-l-green-500' : ''
                      }`}
                    >
                      <td className={`px-3 py-2 ${comp.frequency === frequency ? 'font-semibold text-green-700' : 'text-slate-600'}`}>
                        {comp.label}
                        {comp.frequency === frequency && (
                          <span className="ml-1.5 text-[9px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded">
                            Selected
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-900">
                        ₹{formatIndianNumber(comp.finalAmount)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-900">
                        ₹{formatIndianNumber(comp.totalInterest)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-900">
                        {comp.effectiveRate}%
                      </td>
                      <td className={`px-3 py-2 text-right font-mono ${comp.difference > 0 ? 'text-green-600 font-semibold' : 'text-slate-400'}`}>
                        {comp.difference > 0 ? `+₹${formatIndianNumber(comp.difference)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Insight Box */}
            <div className="mt-4 bg-blue-50 rounded-lg p-3 border border-blue-100">
              <div className="flex items-start gap-2">
                <span className="text-blue-500 text-lg">💡</span>
                <div className="text-xs text-blue-800">
                  <strong>Daily vs Yearly:</strong> With {rate}% interest over {years} years,
                  daily compounding earns you{' '}
                  <span className="font-semibold text-green-600">
                    ₹{formatIndianNumber(
                      frequencyComparison.find(c => c.frequency === 'daily')?.difference || 0
                    )}
                  </span>{' '}
                  more than yearly compounding!
                </div>
              </div>
            </div>
          </div>
        )}
      </details>

      {/* Yearly Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Year-by-Year Breakdown</h3>
          <button
            onClick={exportToExcel}
            className="text-[10px] text-slate-500 hover:text-green-600 font-medium flex items-center gap-1"
            title="Download as Excel/CSV"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-500">Year</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-500">Opening</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-500">Contributions</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-500">Interest</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-500">Closing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(mode === 'calculate' ? yearlyBreakdown : effectiveYearlyBreakdown).map((row) => (
                <tr key={row.year} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-slate-600">Year {row.year}</td>
                  <td className="px-3 py-2 text-right text-slate-900 font-mono">
                    ₹{formatIndianNumber(row.openingBalance)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-900 font-mono">
                    ₹{formatIndianNumber(row.contributions)}
                  </td>
                  <td className="px-3 py-2 text-right text-green-600 font-mono">
                    ₹{formatIndianNumber(row.interestEarned)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-900 font-mono font-semibold">
                    ₹{formatIndianNumber(row.closingBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pro Tips */}
      <div className="bg-gradient-to-r from-green-50 to-transparent border border-green-100 rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-green-600 mb-2">
          <span>💡</span> Pro Tips
        </div>
        <div className="grid sm:grid-cols-3 gap-3 text-xs text-slate-600">
          <div className="flex gap-2">
            <span className="text-green-500 font-bold">•</span>
            <span>Higher compounding frequency = More returns (daily {'>'} yearly)</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-500 font-bold">•</span>
            <span>Start early - time is your biggest advantage in compounding</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-500 font-bold">•</span>
            <span>Regular SIP contributions accelerate wealth creation</span>
          </div>
        </div>
      </div>

      {/* About Section */}
      <details className="bg-white border border-slate-200 rounded-xl">
        <summary className="px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
          About Compound Interest Calculator
        </summary>
        <div className="px-4 pb-4 text-sm text-slate-600 space-y-3">
          <p>
            <strong>Compound Interest</strong> is the interest on a deposit calculated based on both
            the initial principal and the accumulated interest from previous periods. It is
            &quot;interest on interest&quot; and makes your money grow faster than simple interest.
          </p>
          <p>
            <strong>Formula:</strong> A = P × (1 + r/n)^(n×t)
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li>A = Final amount</li>
            <li>P = Principal (initial investment)</li>
            <li>r = Annual interest rate (decimal)</li>
            <li>n = Number of times interest is compounded per year</li>
            <li>t = Time in years</li>
          </ul>
          <p>
            <strong>Effective Annual Rate (EAR):</strong> = (1 + r/n)^n - 1
          </p>
          <p className="text-slate-500">
            The effective rate shows your true annual return accounting for compounding frequency.
            A 12% rate compounded monthly has an EAR of ~12.68%.
          </p>
        </div>
      </details>
    </div>
  )
})

export default CompoundCalculator
