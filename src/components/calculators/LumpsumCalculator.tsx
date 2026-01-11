'use client'

import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

interface LumpsumResult {
  investedAmount: number
  estimatedReturns: number
  totalValue: number
  absoluteReturns: number
  cagr: number
}

interface YearlyBreakdown {
  year: number
  openingBalance: number
  returns: number
  closingBalance: number
}

interface GoalPlanResult {
  type: 'investment' | 'time' | 'rate'
  value: number
  formatted: string
}

function calculateLumpsum(principal: number, rate: number, years: number): LumpsumResult {
  const rateDecimal = rate / 100
  const totalValue = principal * Math.pow(1 + rateDecimal, years)
  const estimatedReturns = totalValue - principal
  const absoluteReturns = (estimatedReturns / principal) * 100

  return {
    investedAmount: principal,
    estimatedReturns: Math.round(estimatedReturns),
    totalValue: Math.round(totalValue),
    absoluteReturns: Math.round(absoluteReturns * 100) / 100,
    cagr: rate,
  }
}

function generateYearlyBreakdown(principal: number, rate: number, years: number): YearlyBreakdown[] {
  const rateDecimal = rate / 100
  const breakdown: YearlyBreakdown[] = []
  let currentBalance = principal

  for (let year = 1; year <= years; year++) {
    const openingBalance = currentBalance
    const closingBalance = openingBalance * (1 + rateDecimal)
    const returns = closingBalance - openingBalance

    breakdown.push({
      year,
      openingBalance: Math.round(openingBalance),
      returns: Math.round(returns),
      closingBalance: Math.round(closingBalance),
    })

    currentBalance = closingBalance
  }

  return breakdown
}

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
  return `₹${num}`
}

// Goal planning calculations
function calculateRequiredInvestment(targetAmount: number, rate: number, years: number): number {
  const rateDecimal = rate / 100
  return targetAmount / Math.pow(1 + rateDecimal, years)
}

function calculateRequiredTime(principal: number, targetAmount: number, rate: number): number {
  const rateDecimal = rate / 100
  return Math.log(targetAmount / principal) / Math.log(1 + rateDecimal)
}

function calculateRequiredRate(principal: number, targetAmount: number, years: number): number {
  return (Math.pow(targetAmount / principal, 1 / years) - 1) * 100
}

export interface LumpsumCalculatorRef {
  exportToPDF: () => void
  exportToHTML: () => void
  exportToExcel: () => void
  handleClear: () => void
}

const LumpsumCalculator = forwardRef<LumpsumCalculatorRef>(function LumpsumCalculator(props, ref) {
  const [investment, setInvestment] = useState(500000)
  const [rate, setRate] = useState(12)
  const [years, setYears] = useState(10)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [showGoalPlanning, setShowGoalPlanning] = useState(false)
  const [targetAmount, setTargetAmount] = useState(2000000)
  const [goalMode, setGoalMode] = useState<'investment' | 'time' | 'rate'>('investment')
  const [isLoaded, setIsLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const calculatorRef = useRef<HTMLDivElement>(null)

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calc_lumpsum')
    if (saved) {
      const data = JSON.parse(saved)
      setInvestment(data.investment || 500000)
      setRate(data.rate || 12)
      setYears(data.years || 10)
      setTargetAmount(data.targetAmount || 2000000)
      setNotes(data.notes || '')
    }
    setIsLoaded(true)
  }, [])

  // Auto-save to localStorage (only after initial load)
  useEffect(() => {
    if (!isLoaded) return
    const data = { investment, rate, years, targetAmount, notes }
    localStorage.setItem('calc_lumpsum', JSON.stringify(data))
    setLastSaved(new Date().toLocaleTimeString())
  }, [investment, rate, years, targetAmount, notes, isLoaded])

  const result = useMemo(() => calculateLumpsum(investment, rate, years), [investment, rate, years])

  const yearlyBreakdown = useMemo(
    () => generateYearlyBreakdown(investment, rate, years),
    [investment, rate, years]
  )

  // Calculate investment vs returns percentages for pie chart
  const investedPercent = useMemo(
    () => Math.round((result.investedAmount / result.totalValue) * 100),
    [result.investedAmount, result.totalValue]
  )
  const returnsPercent = 100 - investedPercent

  // Goal planning result
  const goalPlanResult = useMemo((): GoalPlanResult | null => {
    if (!showGoalPlanning || targetAmount <= 0) return null

    switch (goalMode) {
      case 'investment': {
        const required = calculateRequiredInvestment(targetAmount, rate, years)
        return {
          type: 'investment',
          value: Math.round(required),
          formatted: `₹${formatIndianNumber(Math.round(required))}`,
        }
      }
      case 'time': {
        const required = calculateRequiredTime(investment, targetAmount, rate)
        return {
          type: 'time',
          value: Math.round(required * 10) / 10,
          formatted: `${Math.round(required * 10) / 10} years`,
        }
      }
      case 'rate': {
        const required = calculateRequiredRate(investment, targetAmount, years)
        return {
          type: 'rate',
          value: Math.round(required * 100) / 100,
          formatted: `${(Math.round(required * 100) / 100).toFixed(2)}% p.a.`,
        }
      }
      default:
        return null
    }
  }, [showGoalPlanning, targetAmount, goalMode, investment, rate, years])

  const handleClear = () => {
    setInvestment(500000)
    setRate(12)
    setYears(10)
    setTargetAmount(2000000)
    setNotes('')
    localStorage.removeItem('calc_lumpsum')
  }

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    exportToPDF,
    exportToHTML,
    exportToExcel,
    handleClear,
  }))

  // Generate yearly growth chart HTML for exports
  const generateYearlyGrowthChartHTML = (breakdown: YearlyBreakdown[]) => {
    const maxValue = Math.max(...breakdown.map((y) => y.closingBalance))
    return breakdown
      .map((y) => {
        const barWidth = maxValue > 0 ? (y.closingBalance / maxValue) * 100 : 0
        const openingWidth = maxValue > 0 ? (y.openingBalance / maxValue) * 100 : 0
        const returnsWidth = barWidth - openingWidth
        const gradientColor = `hsl(${120 + (y.year / breakdown.length) * 30}, 70%, 45%)`
        return `
          <div class="year-row">
            <span class="year-label">Y${y.year}</span>
            <div class="bar-container" style="width: 100%">
              <div class="bar-opening" style="width: ${openingWidth}%; background: #22c55e;">
                ${openingWidth > 15 ? `<span>${formatCompact(y.openingBalance)}</span>` : ''}
              </div>
              <div class="bar-returns" style="width: ${returnsWidth}%; background: ${gradientColor};">
                ${returnsWidth > 15 ? `<span>${formatCompact(y.returns)}</span>` : ''}
              </div>
            </div>
            <span class="closing-label">${formatCompact(y.closingBalance)}</span>
          </div>
        `
      })
      .join('')
  }

  // Export to CSV (Excel compatible)
  const exportToExcel = () => {
    const headers = ['Year', 'Opening Balance (₹)', 'Returns (₹)', 'Closing Balance (₹)']
    const rows = yearlyBreakdown.map((row) => [
      row.year,
      row.openingBalance,
      row.returns,
      row.closingBalance,
    ])

    let csvContent = [
      `Lumpsum Investment Calculator - Growth Schedule`,
      `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`,
      ``,
      `Investment Amount: ₹${formatIndianNumber(investment)}`,
      `Expected Return Rate: ${rate}% p.a.`,
      `Investment Period: ${years} years`,
      ``,
      `Total Value: ₹${formatIndianNumber(result.totalValue)}`,
      `Estimated Returns: ₹${formatIndianNumber(result.estimatedReturns)}`,
      `Absolute Returns: ${result.absoluteReturns}%`,
      ``,
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ]

    // Add goal planning results if configured
    if (showGoalPlanning && goalPlanResult) {
      csvContent.push('')
      csvContent.push('Goal Planning Results')
      csvContent.push(`Target Amount: ₹${formatIndianNumber(targetAmount)}`)
      csvContent.push(`Required ${goalPlanResult.type}: ${goalPlanResult.formatted}`)
    }

    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Lumpsum_Investment_${formatIndianNumber(investment)}_${rate}pct_${years}yrs.csv`
    link.click()
  }

  // Export to PDF (uses browser print)
  const exportToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lumpsum Investment Calculator Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #16a34a; font-size: 24px; margin-bottom: 5px; }
          h2 { font-size: 16px; margin-top: 25px; margin-bottom: 15px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
          .summary-item { text-align: center; }
          .summary-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .summary-value { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 4px; }
          .total-highlight { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .total-label { font-size: 11px; color: #16a34a; text-transform: uppercase; letter-spacing: 1px; }
          .total-value { font-size: 32px; font-weight: bold; color: #0f172a; }

          /* Pie Chart */
          .chart-section { display: flex; align-items: center; gap: 30px; margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 12px; }
          .pie-chart { width: 120px; height: 120px; border-radius: 50%; background: conic-gradient(#22c55e 0% ${investedPercent}%, #3b82f6 ${investedPercent}% 100%); flex-shrink: 0; }
          .chart-legend { flex: 1; }
          .legend-item { display: flex; align-items: center; gap: 10px; margin: 8px 0; font-size: 13px; }
          .legend-color { width: 16px; height: 16px; border-radius: 4px; }
          .legend-invested { background: #22c55e; }
          .legend-returns { background: #3b82f6; }

          /* Yearly Chart */
          .yearly-chart { margin: 15px 0; }
          .chart-header { display: flex; font-size: 10px; color: #94a3b8; text-transform: uppercase; margin-bottom: 10px; padding: 0 5px; }
          .chart-header span:first-child { width: 40px; }
          .chart-header span:nth-child(2) { flex: 1; }
          .chart-header span:last-child { width: 80px; text-align: right; }
          .year-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
          .year-label { width: 35px; font-size: 11px; color: #64748b; font-family: monospace; }
          .bar-container { height: 24px; background: #e2e8f0; border-radius: 4px; display: flex; overflow: hidden; flex: 1; }
          .bar-opening { display: flex; align-items: center; justify-content: flex-end; padding-right: 4px; }
          .bar-returns { display: flex; align-items: center; justify-content: flex-start; padding-left: 4px; }
          .bar-opening span, .bar-returns span { font-size: 9px; color: white; font-weight: 500; }
          .closing-label { width: 75px; font-size: 10px; color: #64748b; text-align: right; font-family: monospace; }
          .chart-footer { display: flex; gap: 20px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 11px; }
          .chart-footer-item { display: flex; align-items: center; gap: 6px; }
          .chart-footer-color { width: 12px; height: 12px; border-radius: 3px; }

          /* Goal Planning */
          .goal-section { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 15px; border-radius: 10px; margin: 15px 0; }
          .goal-title { font-size: 11px; color: #b45309; text-transform: uppercase; margin-bottom: 10px; font-weight: 600; }
          .goal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .goal-item { text-align: center; }
          .goal-value { font-size: 20px; font-weight: bold; color: #92400e; }
          .goal-label { font-size: 10px; color: #b45309; }

          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px; }
          th { background: #f1f5f9; padding: 8px; text-align: right; font-weight: 600; color: #475569; }
          th:first-child { text-align: left; }
          td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; }
          td:first-child { text-align: left; }
          .returns { color: #16a34a; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          @media print {
            body { padding: 10px; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <h1>Lumpsum Investment Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Investment Amount</div>
              <div class="summary-value">₹${formatIndianNumber(investment)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Expected Return</div>
              <div class="summary-value">${rate}% p.a.</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Investment Period</div>
              <div class="summary-value">${years} years</div>
            </div>
          </div>
        </div>

        <div class="total-highlight">
          <div class="total-label">Total Value</div>
          <div class="total-value">₹${formatIndianNumber(result.totalValue)}</div>
        </div>

        <h2>Investment Breakdown</h2>
        <div class="chart-section">
          <div class="pie-chart"></div>
          <div class="chart-legend">
            <div class="legend-item">
              <div class="legend-color legend-invested"></div>
              <span>Invested: ₹${formatIndianNumber(result.investedAmount)} (${investedPercent}%)</span>
            </div>
            <div class="legend-item">
              <div class="legend-color legend-returns"></div>
              <span>Returns: ₹${formatIndianNumber(result.estimatedReturns)} (${returnsPercent}%)</span>
            </div>
            <div class="legend-item" style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
              <strong>Absolute Returns: ${result.absoluteReturns}%</strong>
            </div>
          </div>
        </div>

        ${
          showGoalPlanning && goalPlanResult
            ? `
        <h2>Goal Planning</h2>
        <div class="goal-section">
          <div class="goal-title">To Reach ₹${formatIndianNumber(targetAmount)}</div>
          <div class="goal-grid">
            <div class="goal-item">
              <div class="goal-value">${goalPlanResult.formatted}</div>
              <div class="goal-label">Required ${goalPlanResult.type === 'investment' ? 'Investment' : goalPlanResult.type === 'time' ? 'Time' : 'Return Rate'}</div>
            </div>
            <div class="goal-item">
              <div class="goal-value">${goalMode === 'investment' ? `${rate}% for ${years}y` : goalMode === 'time' ? `₹${formatIndianNumber(investment)} at ${rate}%` : `₹${formatIndianNumber(investment)} for ${years}y`}</div>
              <div class="goal-label">Current Parameters</div>
            </div>
          </div>
        </div>
        `
            : ''
        }

        <h2>Year-by-Year Growth</h2>
        <div class="yearly-chart">
          <div class="chart-header">
            <span>Year</span>
            <span>Growth Progression</span>
            <span>Value</span>
          </div>
          ${generateYearlyGrowthChartHTML(yearlyBreakdown)}
          <div class="chart-footer">
            <div class="chart-footer-item">
              <div class="chart-footer-color" style="background: #22c55e;"></div>
              <span>Opening Balance</span>
            </div>
            <div class="chart-footer-item">
              <div class="chart-footer-color" style="background: #16a34a;"></div>
              <span>Returns</span>
            </div>
          </div>
        </div>

        <div class="page-break"></div>
        <h2>Detailed Growth Schedule</h2>
        <table>
          <tr>
            <th>Year</th>
            <th>Opening Balance</th>
            <th>Returns</th>
            <th>Closing Balance</th>
          </tr>
          ${yearlyBreakdown
            .map(
              (row) => `
            <tr>
              <td>${row.year}</td>
              <td>₹${formatIndianNumber(row.openingBalance)}</td>
              <td class="returns">+₹${formatIndianNumber(row.returns)}</td>
              <td>₹${formatIndianNumber(row.closingBalance)}</td>
            </tr>
          `
            )
            .join('')}
        </table>

        <div class="footer">
          Generated by Calci — Calculate everything. Plan anything.
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
        <title>Lumpsum Investment Calculator Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #16a34a; font-size: 24px; margin-bottom: 5px; }
          h2 { font-size: 16px; margin-top: 25px; margin-bottom: 15px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
          .summary-item { text-align: center; }
          .summary-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .summary-value { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 4px; }
          .total-highlight { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .total-label { font-size: 11px; color: #16a34a; text-transform: uppercase; letter-spacing: 1px; }
          .total-value { font-size: 32px; font-weight: bold; color: #0f172a; }

          /* Pie Chart */
          .chart-section { display: flex; align-items: center; gap: 30px; margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 12px; }
          .pie-chart { width: 120px; height: 120px; border-radius: 50%; background: conic-gradient(#22c55e 0% ${investedPercent}%, #3b82f6 ${investedPercent}% 100%); flex-shrink: 0; }
          .chart-legend { flex: 1; }
          .legend-item { display: flex; align-items: center; gap: 10px; margin: 8px 0; font-size: 13px; }
          .legend-color { width: 16px; height: 16px; border-radius: 4px; }
          .legend-invested { background: #22c55e; }
          .legend-returns { background: #3b82f6; }

          /* Yearly Chart */
          .yearly-chart { margin: 15px 0; }
          .chart-header { display: flex; font-size: 10px; color: #94a3b8; text-transform: uppercase; margin-bottom: 10px; padding: 0 5px; }
          .chart-header span:first-child { width: 40px; }
          .chart-header span:nth-child(2) { flex: 1; }
          .chart-header span:last-child { width: 80px; text-align: right; }
          .year-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
          .year-label { width: 35px; font-size: 11px; color: #64748b; font-family: monospace; }
          .bar-container { height: 24px; background: #e2e8f0; border-radius: 4px; display: flex; overflow: hidden; flex: 1; }
          .bar-opening { display: flex; align-items: center; justify-content: flex-end; padding-right: 4px; }
          .bar-returns { display: flex; align-items: center; justify-content: flex-start; padding-left: 4px; }
          .bar-opening span, .bar-returns span { font-size: 9px; color: white; font-weight: 500; }
          .closing-label { width: 75px; font-size: 10px; color: #64748b; text-align: right; font-family: monospace; }
          .chart-footer { display: flex; gap: 20px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 11px; }
          .chart-footer-item { display: flex; align-items: center; gap: 6px; }
          .chart-footer-color { width: 12px; height: 12px; border-radius: 3px; }

          /* Goal Planning */
          .goal-section { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 15px; border-radius: 10px; margin: 15px 0; }
          .goal-title { font-size: 11px; color: #b45309; text-transform: uppercase; margin-bottom: 10px; font-weight: 600; }
          .goal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .goal-item { text-align: center; }
          .goal-value { font-size: 20px; font-weight: bold; color: #92400e; }
          .goal-label { font-size: 10px; color: #b45309; }

          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px; }
          th { background: #f1f5f9; padding: 8px; text-align: right; font-weight: 600; color: #475569; }
          th:first-child { text-align: left; }
          td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; }
          td:first-child { text-align: left; }
          .returns { color: #16a34a; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        </style>
      </head>
      <body>
        <h1>Lumpsum Investment Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Investment Amount</div>
              <div class="summary-value">₹${formatIndianNumber(investment)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Expected Return</div>
              <div class="summary-value">${rate}% p.a.</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Investment Period</div>
              <div class="summary-value">${years} years</div>
            </div>
          </div>
        </div>

        <div class="total-highlight">
          <div class="total-label">Total Value</div>
          <div class="total-value">₹${formatIndianNumber(result.totalValue)}</div>
        </div>

        <h2>Investment Breakdown</h2>
        <div class="chart-section">
          <div class="pie-chart"></div>
          <div class="chart-legend">
            <div class="legend-item">
              <div class="legend-color legend-invested"></div>
              <span>Invested: ₹${formatIndianNumber(result.investedAmount)} (${investedPercent}%)</span>
            </div>
            <div class="legend-item">
              <div class="legend-color legend-returns"></div>
              <span>Returns: ₹${formatIndianNumber(result.estimatedReturns)} (${returnsPercent}%)</span>
            </div>
            <div class="legend-item" style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
              <strong>Absolute Returns: ${result.absoluteReturns}%</strong>
            </div>
          </div>
        </div>

        ${
          showGoalPlanning && goalPlanResult
            ? `
        <h2>Goal Planning</h2>
        <div class="goal-section">
          <div class="goal-title">To Reach ₹${formatIndianNumber(targetAmount)}</div>
          <div class="goal-grid">
            <div class="goal-item">
              <div class="goal-value">${goalPlanResult.formatted}</div>
              <div class="goal-label">Required ${goalPlanResult.type === 'investment' ? 'Investment' : goalPlanResult.type === 'time' ? 'Time' : 'Return Rate'}</div>
            </div>
            <div class="goal-item">
              <div class="goal-value">${goalMode === 'investment' ? `${rate}% for ${years}y` : goalMode === 'time' ? `₹${formatIndianNumber(investment)} at ${rate}%` : `₹${formatIndianNumber(investment)} for ${years}y`}</div>
              <div class="goal-label">Current Parameters</div>
            </div>
          </div>
        </div>
        `
            : ''
        }

        <h2>Year-by-Year Growth</h2>
        <div class="yearly-chart">
          <div class="chart-header">
            <span>Year</span>
            <span>Growth Progression</span>
            <span>Value</span>
          </div>
          ${generateYearlyGrowthChartHTML(yearlyBreakdown)}
          <div class="chart-footer">
            <div class="chart-footer-item">
              <div class="chart-footer-color" style="background: #22c55e;"></div>
              <span>Opening Balance</span>
            </div>
            <div class="chart-footer-item">
              <div class="chart-footer-color" style="background: #16a34a;"></div>
              <span>Returns</span>
            </div>
          </div>
        </div>

        <h2>Detailed Growth Schedule</h2>
        <table>
          <tr>
            <th>Year</th>
            <th>Opening Balance</th>
            <th>Returns</th>
            <th>Closing Balance</th>
          </tr>
          ${yearlyBreakdown
            .map(
              (row) => `
            <tr>
              <td>${row.year}</td>
              <td>₹${formatIndianNumber(row.openingBalance)}</td>
              <td class="returns">+₹${formatIndianNumber(row.returns)}</td>
              <td>₹${formatIndianNumber(row.closingBalance)}</td>
            </tr>
          `
            )
            .join('')}
        </table>

        <div class="footer">
          Generated by Calci — Calculate everything. Plan anything.
        </div>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Lumpsum_Report_${formatIndianNumber(investment)}_${rate}pct_${years}yrs.html`
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
            {/* Investment Amount */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Investment Amount</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  ₹{formatIndianNumber(investment)}
                </span>
              </div>
              <input
                type="range"
                min={10000}
                max={100000000}
                step={10000}
                value={investment}
                onChange={(e) => setInvestment(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-green-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>₹10K</span>
                <span>₹10Cr</span>
              </div>
            </div>

            {/* Expected Return Rate */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Expected Return Rate</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  {rate}% p.a.
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={30}
                step={0.5}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-green-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>5%</span>
                <span>30%</span>
              </div>
            </div>

            {/* Investment Period */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Investment Period</label>
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
          </div>

          {/* Results */}
          <div className="p-5 bg-slate-50">
            {/* Primary Result */}
            <div className="bg-green-50 rounded-lg p-4 text-center mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-green-600 mb-1">
                Total Value
              </div>
              <div className="font-mono text-3xl font-bold text-slate-900">
                ₹{formatIndianNumber(result.totalValue)}
              </div>
            </div>

            {/* Secondary Results */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
                  Invested
                </div>
                <div className="font-mono text-sm font-semibold text-slate-900">
                  {formatCompact(result.investedAmount)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
                  Est. Returns
                </div>
                <div className="font-mono text-sm font-semibold text-green-600">
                  +{formatCompact(result.estimatedReturns)}
                </div>
              </div>
            </div>

            {/* Absolute Returns */}
            <div className="bg-white rounded-lg p-3 text-center mb-4">
              <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
                Absolute Returns
              </div>
              <div className="font-mono text-lg font-semibold text-green-600">
                {result.absoluteReturns}%
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
                    strokeDasharray={`${investedPercent} ${100 - investedPercent}`}
                  />
                </svg>
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 bg-green-500 rounded-sm" />
                  <span className="text-slate-600">Invested</span>
                  <span className="ml-auto font-mono font-medium">{investedPercent}%</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 bg-blue-500 rounded-sm" />
                  <span className="text-slate-600">Returns</span>
                  <span className="ml-auto font-mono font-medium">{returnsPercent}%</span>
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

      {/* Yearly Growth Chart */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Year-by-Year Growth</h3>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-2 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
            <span className="w-8">Year</span>
            <span className="flex-1">Growth Progression</span>
            <span className="w-20 text-right">Value</span>
          </div>
          <div className="space-y-2">
            {yearlyBreakdown.map((year, index) => {
              const maxValue = Math.max(...yearlyBreakdown.map((y) => y.closingBalance))
              const barWidth = maxValue > 0 ? (year.closingBalance / maxValue) * 100 : 0
              const openingWidth = maxValue > 0 ? (year.openingBalance / maxValue) * 100 : 0
              const returnsWidth = barWidth - openingWidth
              // Gradient from green to teal for growth visualization
              const gradientHue = 120 + (index / yearlyBreakdown.length) * 30

              return (
                <div key={year.year} className="flex items-center gap-3">
                  <span className="text-xs w-8 font-mono text-slate-500">Y{year.year}</span>
                  <div className="flex-1 h-7 bg-slate-100 rounded overflow-hidden relative flex">
                    <div
                      className="h-full bg-green-500 flex items-center justify-end pr-1"
                      style={{ width: `${openingWidth}%` }}
                    >
                      {openingWidth > 15 && (
                        <span className="text-[9px] text-white font-medium">
                          {formatCompact(year.openingBalance)}
                        </span>
                      )}
                    </div>
                    <div
                      className="h-full flex items-center justify-start pl-1"
                      style={{
                        width: `${returnsWidth}%`,
                        backgroundColor: `hsl(${gradientHue}, 70%, 45%)`,
                      }}
                    >
                      {returnsWidth > 15 && (
                        <span className="text-[9px] text-white font-medium">
                          +{formatCompact(year.returns)}
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
          <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-100 text-[10px]">
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-sm" />
              Opening Balance
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 bg-teal-600 rounded-sm" />
              Returns
            </div>
          </div>
        </div>
      </div>

      {/* Goal Planning Simulator */}
      <details open={showGoalPlanning} className="bg-white border border-slate-200 rounded-xl">
        <summary
          className="px-4 py-3 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 flex items-center justify-between"
          onClick={(e) => {
            e.preventDefault()
            setShowGoalPlanning(!showGoalPlanning)
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <span>Goal Planning Simulator</span>
            <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              What-if analysis
            </span>
          </div>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${showGoalPlanning ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        {showGoalPlanning && (
          <div className="px-4 pb-4 pt-2">
            <p className="text-xs text-slate-500 mb-4">
              Enter your target amount and choose what you want to calculate.
            </p>

            {/* Target Amount Input */}
            <div className="mb-4">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Target Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(Number(e.target.value))}
                  className="w-full pl-8 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
                  min={10000}
                  step={10000}
                />
              </div>
              <div className="mt-1 text-[10px] text-slate-400">
                Current projection: ₹{formatIndianNumber(result.totalValue)}
              </div>
            </div>

            {/* Goal Mode Selection */}
            <div className="mb-4">
              <label className="text-xs font-medium text-slate-500 mb-2 block">Calculate:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setGoalMode('investment')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    goalMode === 'investment'
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Required Investment
                </button>
                <button
                  onClick={() => setGoalMode('time')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    goalMode === 'time'
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Required Time
                </button>
                <button
                  onClick={() => setGoalMode('rate')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    goalMode === 'rate'
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Required Rate
                </button>
              </div>
            </div>

            {/* Result Display */}
            {goalPlanResult && (
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
                <div className="text-center">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-1">
                    To reach ₹{formatIndianNumber(targetAmount)}
                  </div>
                  <div className="font-mono text-2xl font-bold text-amber-800">
                    {goalPlanResult.formatted}
                  </div>
                  <div className="text-xs text-amber-600 mt-1">
                    {goalMode === 'investment' &&
                      `at ${rate}% p.a. for ${years} years`}
                    {goalMode === 'time' &&
                      `with ₹${formatIndianNumber(investment)} at ${rate}% p.a.`}
                    {goalMode === 'rate' &&
                      `with ₹${formatIndianNumber(investment)} for ${years} years`}
                  </div>
                </div>

                {/* What-if scenarios */}
                <div className="mt-4 pt-3 border-t border-amber-200">
                  <div className="text-[10px] font-semibold text-amber-700 mb-2">What-if Scenarios:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {goalMode !== 'investment' && (
                      <div className="bg-white/50 rounded-lg p-2">
                        <div className="text-amber-600">If you invest more:</div>
                        <div className="font-mono font-medium text-amber-800">
                          ₹{formatIndianNumber(calculateRequiredInvestment(targetAmount, rate, years))}
                        </div>
                      </div>
                    )}
                    {goalMode !== 'time' && (
                      <div className="bg-white/50 rounded-lg p-2">
                        <div className="text-amber-600">With more time:</div>
                        <div className="font-mono font-medium text-amber-800">
                          {(Math.round(calculateRequiredTime(investment, targetAmount, rate) * 10) / 10).toFixed(1)} years
                        </div>
                      </div>
                    )}
                    {goalMode !== 'rate' && (
                      <div className="bg-white/50 rounded-lg p-2">
                        <div className="text-amber-600">At higher returns:</div>
                        <div className="font-mono font-medium text-amber-800">
                          {calculateRequiredRate(investment, targetAmount, years).toFixed(2)}% p.a.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </details>

      {/* Growth Schedule Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Growth Schedule</h3>
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
                <th className="px-3 py-2 text-right font-semibold text-slate-500">Opening Balance</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-500">Returns</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-500">Closing Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {yearlyBreakdown.map((row) => (
                <tr key={row.year} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-slate-600">{row.year}</td>
                  <td className="px-3 py-2 text-right text-slate-900 font-mono">
                    ₹{formatIndianNumber(row.openingBalance)}
                  </td>
                  <td className="px-3 py-2 text-right text-green-600 font-mono">
                    +₹{formatIndianNumber(row.returns)}
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
            <span>Start early - compounding works best over longer periods</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-500 font-bold">•</span>
            <span>Diversify investments to balance risk and returns</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-500 font-bold">•</span>
            <span>Review your portfolio annually and rebalance if needed</span>
          </div>
        </div>
      </div>

      {/* About Section */}
      <details className="bg-white border border-slate-200 rounded-xl">
        <summary className="px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
          About Lumpsum Calculator
        </summary>
        <div className="px-4 pb-4 text-sm text-slate-600 space-y-3">
          <p>
            <strong>Lumpsum investment</strong> is when you invest a fixed amount of money at once,
            as opposed to SIP (Systematic Investment Plan) where you invest periodically.
          </p>
          <p>
            <strong>Formula:</strong> A = P × (1 + r)^t
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li>A = Final amount (maturity value)</li>
            <li>P = Principal (initial investment)</li>
            <li>r = Annual rate of return (as decimal)</li>
            <li>t = Time period in years</li>
          </ul>
          <p className="text-slate-500">
            This calculator helps you estimate the future value of your lumpsum investment
            considering compound interest. Use the goal planning feature to work backwards
            from your financial targets.
          </p>
        </div>
      </details>
    </div>
  )
})

export default LumpsumCalculator
