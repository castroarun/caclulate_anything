'use client'

import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useNumberFormat } from '@/contexts/NumberFormatContext'

interface SIPResult {
  monthlyInvestment: number
  totalInvestment: number
  expectedReturns: number
  maturityValue: number
  returnsPercent: number
}

interface YearlyBreakdown {
  year: number
  invested: number
  returns: number
  value: number
}

interface StepUpResult {
  totalInvestment: number
  maturityValue: number
  expectedReturns: number
  returnsPercent: number
  extraReturns: number
  yearlyBreakdown: YearlyBreakdown[]
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

// Static format for exports (always Indian)
function formatCompactStatic(num: number): string {
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`
  return `₹${num}`
}

// SIP Formula: M = P × ({[1 + i]^n – 1} / i) × (1 + i)
function calculateSIP(monthlyInvestment: number, annualRate: number, years: number): SIPResult {
  const monthlyRate = annualRate / 12 / 100
  const months = years * 12
  const totalInvestment = monthlyInvestment * months

  if (monthlyRate === 0) {
    return {
      monthlyInvestment,
      totalInvestment,
      expectedReturns: 0,
      maturityValue: totalInvestment,
      returnsPercent: 0,
    }
  }

  const maturityValue =
    monthlyInvestment *
    ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) *
    (1 + monthlyRate)

  const expectedReturns = maturityValue - totalInvestment
  const returnsPercent = totalInvestment > 0 ? (expectedReturns / totalInvestment) * 100 : 0

  return {
    monthlyInvestment,
    totalInvestment: Math.round(totalInvestment),
    expectedReturns: Math.round(expectedReturns),
    maturityValue: Math.round(maturityValue),
    returnsPercent: Math.round(returnsPercent),
  }
}

function generateYearlyBreakdown(
  monthlyInvestment: number,
  annualRate: number,
  years: number
): YearlyBreakdown[] {
  const monthlyRate = annualRate / 12 / 100
  const breakdown: YearlyBreakdown[] = []

  for (let year = 1; year <= years; year++) {
    const months = year * 12
    const invested = monthlyInvestment * months

    let value = 0
    if (monthlyRate === 0) {
      value = invested
    } else {
      value =
        monthlyInvestment *
        ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) *
        (1 + monthlyRate)
    }

    breakdown.push({
      year,
      invested: Math.round(invested),
      returns: Math.round(value - invested),
      value: Math.round(value),
    })
  }

  return breakdown
}

export interface SIPCalculatorRef {
  exportToPDF: () => void
  exportToHTML: () => void
  exportToExcel: () => void
  handleClear: () => void
}

// Reverse calculation: Find required SIP for a target corpus
function calculateRequiredSIP(targetAmount: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 12 / 100
  const months = years * 12

  if (monthlyRate === 0) {
    return Math.round(targetAmount / months)
  }

  // P = M / (((1 + i)^n - 1) / i) × (1 + i))
  const requiredSIP = targetAmount / (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate))
  return Math.round(requiredSIP)
}

function calculateStepUpSIP(
  monthlyInvestment: number,
  annualRate: number,
  years: number,
  stepUpPercent: number,
  baseResult: SIPResult
): StepUpResult {
  const monthlyRate = annualRate / 12 / 100
  const yearlyBreakdown: YearlyBreakdown[] = []

  let totalInvestment = 0
  let currentValue = 0
  let currentMonthlyInvestment = monthlyInvestment

  for (let year = 1; year <= years; year++) {
    // Invest for 12 months at current rate
    for (let month = 1; month <= 12; month++) {
      totalInvestment += currentMonthlyInvestment
      // Grow existing value
      currentValue = (currentValue + currentMonthlyInvestment) * (1 + monthlyRate)
    }

    yearlyBreakdown.push({
      year,
      invested: Math.round(totalInvestment),
      returns: Math.round(currentValue - totalInvestment),
      value: Math.round(currentValue),
    })

    // Step up for next year
    if (year < years) {
      currentMonthlyInvestment = currentMonthlyInvestment * (1 + stepUpPercent / 100)
    }
  }

  const expectedReturns = currentValue - totalInvestment
  const returnsPercent = totalInvestment > 0 ? (expectedReturns / totalInvestment) * 100 : 0
  const extraReturns = currentValue - baseResult.maturityValue

  return {
    totalInvestment: Math.round(totalInvestment),
    maturityValue: Math.round(currentValue),
    expectedReturns: Math.round(expectedReturns),
    returnsPercent: Math.round(returnsPercent),
    extraReturns: Math.round(extraReturns),
    yearlyBreakdown,
  }
}

const SIPCalculator = forwardRef<SIPCalculatorRef>(function SIPCalculator(props, ref) {
  const { formatCurrencyCompact } = useNumberFormat()
  const [mode, setMode] = useState<'calculate' | 'goal'>('calculate')
  const [monthlyInvestment, setMonthlyInvestment] = useState(10000)
  const [targetAmount, setTargetAmount] = useState(10000000) // 1 Crore default for goal mode
  const [expectedReturn, setExpectedReturn] = useState(12)
  const [investmentPeriod, setInvestmentPeriod] = useState(10)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [showStepUp, setShowStepUp] = useState(false)
  const [stepUpPercent, setStepUpPercent] = useState(10)
  const [isLoaded, setIsLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const calculatorRef = useRef<HTMLDivElement>(null)

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calc_sip')
    if (saved) {
      const data = JSON.parse(saved)
      setMode(data.mode || 'calculate')
      setMonthlyInvestment(data.monthlyInvestment || 10000)
      setTargetAmount(data.targetAmount || 10000000)
      setExpectedReturn(data.expectedReturn || 12)
      setInvestmentPeriod(data.investmentPeriod || 10)
      setStepUpPercent(data.stepUpPercent || 10)
      setNotes(data.notes || '')
    }
    setIsLoaded(true)
  }, [])

  // Auto-save to localStorage (only after initial load)
  useEffect(() => {
    if (!isLoaded) return
    const data = { mode, monthlyInvestment, targetAmount, expectedReturn, investmentPeriod, stepUpPercent, notes }
    localStorage.setItem('calc_sip', JSON.stringify(data))
    setLastSaved(new Date().toLocaleTimeString())
  }, [mode, monthlyInvestment, targetAmount, expectedReturn, investmentPeriod, stepUpPercent, notes, isLoaded])

  const handleClear = () => {
    setMode('calculate')
    setMonthlyInvestment(10000)
    setTargetAmount(10000000)
    setExpectedReturn(12)
    setInvestmentPeriod(10)
    setStepUpPercent(10)
    setNotes('')
    localStorage.removeItem('calc_sip')
  }

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    exportToPDF,
    exportToHTML,
    exportToExcel,
    handleClear,
  }))

  // Calculate required SIP for goal mode
  const requiredSIP = useMemo(
    () => calculateRequiredSIP(targetAmount, expectedReturn, investmentPeriod),
    [targetAmount, expectedReturn, investmentPeriod]
  )

  // Use requiredSIP as monthlyInvestment in goal mode for result calculation
  const effectiveMonthlyInvestment = mode === 'goal' ? requiredSIP : monthlyInvestment

  const result = useMemo(
    () => calculateSIP(effectiveMonthlyInvestment, expectedReturn, investmentPeriod),
    [effectiveMonthlyInvestment, expectedReturn, investmentPeriod]
  )

  const yearlyBreakdown = useMemo(
    () => generateYearlyBreakdown(effectiveMonthlyInvestment, expectedReturn, investmentPeriod),
    [effectiveMonthlyInvestment, expectedReturn, investmentPeriod]
  )

  const stepUpResult = useMemo(() => {
    if (stepUpPercent === 0) return null
    return calculateStepUpSIP(monthlyInvestment, expectedReturn, investmentPeriod, stepUpPercent, result)
  }, [monthlyInvestment, expectedReturn, investmentPeriod, stepUpPercent, result])

  const investedPercent = useMemo(() => {
    if (result.maturityValue === 0) return 100
    return Math.round((result.totalInvestment / result.maturityValue) * 100)
  }, [result])

  const returnsDisplayPercent = 100 - investedPercent

  // Generate yearly chart HTML for exports
  const generateYearlyChartHTML = (breakdown: YearlyBreakdown[], isStepUp: boolean = false) => {
    const maxValue = Math.max(...breakdown.map((y) => y.value))
    return breakdown
      .map((y) => {
        const barWidth = maxValue > 0 ? (y.value / maxValue) * 100 : 0
        const investedWidth = y.value > 0 ? (y.invested / y.value) * 100 : 0
        return `
          <div class="year-row ${isStepUp ? 'stepup-year' : ''}">
            <span class="year-label">Y${y.year}</span>
            <div class="bar-container" style="width: ${barWidth}%">
              <div class="bar-invested" style="width: ${investedWidth}%">
                ${investedWidth > 20 ? `<span>${formatCurrencyCompact(y.invested)}</span>` : ''}
              </div>
              <div class="bar-returns" style="width: ${100 - investedWidth}%">
                ${(100 - investedWidth) > 20 ? `<span>${formatCurrencyCompact(y.returns)}</span>` : ''}
              </div>
            </div>
            <span class="value-label">${formatCurrencyCompact(y.value)}</span>
          </div>
        `
      })
      .join('')
  }

  // Export to CSV (Excel compatible)
  const exportToExcel = () => {
    const headers = ['Year', 'Invested (₹)', 'Returns (₹)', 'Total Value (₹)']
    const rows = yearlyBreakdown.map((row) => [row.year, row.invested, row.returns, row.value])

    let csvContent = [
      `SIP Calculator - Investment Growth Report`,
      `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`,
      ``,
      `Monthly Investment: ₹${formatIndianNumber(monthlyInvestment)}`,
      `Expected Return: ${expectedReturn}% p.a.`,
      `Investment Period: ${investmentPeriod} years`,
      ``,
      `RESULTS`,
      `Total Investment: ₹${formatIndianNumber(result.totalInvestment)}`,
      `Expected Returns: ₹${formatIndianNumber(result.expectedReturns)}`,
      `Maturity Value: ₹${formatIndianNumber(result.maturityValue)}`,
      `Returns Percentage: ${result.returnsPercent}%`,
      ``,
    ]

    if (stepUpPercent > 0 && stepUpResult) {
      csvContent = csvContent.concat([
        `STEP-UP SIP (${stepUpPercent}% annual increase)`,
        `Total Investment: ₹${formatIndianNumber(stepUpResult.totalInvestment)}`,
        `Maturity Value: ₹${formatIndianNumber(stepUpResult.maturityValue)}`,
        `Extra Returns: ₹${formatIndianNumber(stepUpResult.extraReturns)}`,
        ``,
      ])
    }

    csvContent = csvContent.concat([
      `YEARLY BREAKDOWN`,
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ])

    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `SIP_Report_${monthlyInvestment}_${expectedReturn}pct_${investmentPeriod}yrs.csv`
    link.click()
  }

  // Export to PDF (uses browser print)
  const exportToPDF = () => {
    const hasStepUp = stepUpPercent > 0 && stepUpResult
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SIP Calculator Report</title>
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
          .maturity-highlight { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .maturity-label { font-size: 11px; color: #16a34a; text-transform: uppercase; letter-spacing: 1px; }
          .maturity-value { font-size: 32px; font-weight: bold; color: #0f172a; }

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
          .chart-header span:last-child { width: 70px; text-align: right; }
          .year-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
          .year-label { width: 35px; font-size: 11px; color: #64748b; font-family: monospace; }
          .bar-container { height: 24px; background: #e2e8f0; border-radius: 4px; display: flex; overflow: hidden; flex: 1; }
          .bar-invested { background: #22c55e; display: flex; align-items: center; justify-content: flex-end; padding-right: 4px; }
          .bar-returns { background: #3b82f6; display: flex; align-items: center; justify-content: flex-start; padding-left: 4px; }
          .bar-invested span, .bar-returns span { font-size: 9px; color: white; font-weight: 500; }
          .value-label { width: 65px; font-size: 10px; color: #64748b; text-align: right; font-family: monospace; }
          .chart-footer { display: flex; gap: 20px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 11px; }
          .chart-footer-item { display: flex; align-items: center; gap: 6px; }
          .chart-footer-color { width: 12px; height: 12px; border-radius: 3px; }

          /* Step-up Summary */
          .stepup-summary { background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%); padding: 15px; border-radius: 10px; margin: 15px 0; }
          .stepup-title { font-size: 11px; color: #2563eb; text-transform: uppercase; margin-bottom: 10px; font-weight: 600; }
          .stepup-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
          .stepup-item { text-align: center; }
          .stepup-value { font-size: 20px; font-weight: bold; color: #1d4ed8; }
          .stepup-label { font-size: 10px; color: #2563eb; }

          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px; }
          th { background: #f1f5f9; padding: 8px; text-align: right; font-weight: 600; color: #475569; }
          th:first-child { text-align: left; }
          td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; }
          td:first-child { text-align: left; }
          .invested { color: #16a34a; }
          .returns { color: #3b82f6; }
          .notes-section { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin: 20px 0; }
          .notes-title { font-size: 12px; font-weight: 600; color: #92400e; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
          .notes-content { font-size: 12px; color: #78350f; line-height: 1.6; white-space: pre-wrap; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          @media print {
            body { padding: 10px; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <h1>SIP Calculator Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Monthly Investment</div>
              <div class="summary-value">₹${formatIndianNumber(monthlyInvestment)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Expected Return</div>
              <div class="summary-value">${expectedReturn}% p.a.</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Investment Period</div>
              <div class="summary-value">${investmentPeriod} years</div>
            </div>
          </div>
        </div>

        <div class="maturity-highlight">
          <div class="maturity-label">Maturity Value</div>
          <div class="maturity-value">₹${formatIndianNumber(result.maturityValue)}</div>
        </div>

        <h2>Investment Breakdown</h2>
        <div class="chart-section">
          <div class="pie-chart"></div>
          <div class="chart-legend">
            <div class="legend-item">
              <div class="legend-color legend-invested"></div>
              <span>Invested: ₹${formatIndianNumber(result.totalInvestment)} (${investedPercent}%)</span>
            </div>
            <div class="legend-item">
              <div class="legend-color legend-returns"></div>
              <span>Returns: ₹${formatIndianNumber(result.expectedReturns)} (${returnsDisplayPercent}%)</span>
            </div>
            <div class="legend-item" style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
              <strong>Returns on Investment: ${result.returnsPercent}%</strong>
            </div>
          </div>
        </div>

        ${
          hasStepUp
            ? `
        <h2>Step-Up SIP Analysis (${stepUpPercent}% annual increase)</h2>
        <div class="stepup-summary">
          <div class="stepup-title">Extra Benefits with Step-Up SIP</div>
          <div class="stepup-grid">
            <div class="stepup-item">
              <div class="stepup-value">₹${formatIndianNumber(stepUpResult.maturityValue)}</div>
              <div class="stepup-label">Maturity Value</div>
            </div>
            <div class="stepup-item">
              <div class="stepup-value">₹${formatIndianNumber(stepUpResult.extraReturns)}</div>
              <div class="stepup-label">Extra Returns</div>
            </div>
          </div>
        </div>
        <p style="font-size: 11px; color: #64748b; margin: 10px 0;">
          Total Investment: ₹${formatIndianNumber(stepUpResult.totalInvestment)} |
          Expected Returns: ₹${formatIndianNumber(stepUpResult.expectedReturns)} |
          Returns %: ${stepUpResult.returnsPercent}%
        </p>
        `
            : ''
        }

        <h2>Yearly Growth Breakdown</h2>
        <div class="yearly-chart">
          <div class="chart-header">
            <span>Year</span>
            <span>Invested & Returns</span>
            <span>Value</span>
          </div>
          ${generateYearlyChartHTML(yearlyBreakdown)}
          <div class="chart-footer">
            <div class="chart-footer-item">
              <div class="chart-footer-color" style="background: #22c55e;"></div>
              <span>Invested</span>
            </div>
            <div class="chart-footer-item">
              <div class="chart-footer-color" style="background: #3b82f6;"></div>
              <span>Returns</span>
            </div>
          </div>
        </div>

        <h2>Detailed Breakdown</h2>
        <table>
          <tr>
            <th>Year</th>
            <th>Total Invested</th>
            <th>Returns</th>
            <th>Total Value</th>
          </tr>
          ${yearlyBreakdown
            .map(
              (row) => `
            <tr>
              <td>Year ${row.year}</td>
              <td class="invested">₹${formatIndianNumber(row.invested)}</td>
              <td class="returns">₹${formatIndianNumber(row.returns)}</td>
              <td>₹${formatIndianNumber(row.value)}</td>
            </tr>
          `
            )
            .join('')}
        </table>

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
    const hasStepUp = stepUpPercent > 0 && stepUpResult
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SIP Calculator Report</title>
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
          .maturity-highlight { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .maturity-label { font-size: 11px; color: #16a34a; text-transform: uppercase; letter-spacing: 1px; }
          .maturity-value { font-size: 32px; font-weight: bold; color: #0f172a; }

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
          .chart-header span:last-child { width: 70px; text-align: right; }
          .year-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
          .year-label { width: 35px; font-size: 11px; color: #64748b; font-family: monospace; }
          .bar-container { height: 24px; background: #e2e8f0; border-radius: 4px; display: flex; overflow: hidden; flex: 1; }
          .bar-invested { background: #22c55e; display: flex; align-items: center; justify-content: flex-end; padding-right: 4px; }
          .bar-returns { background: #3b82f6; display: flex; align-items: center; justify-content: flex-start; padding-left: 4px; }
          .bar-invested span, .bar-returns span { font-size: 9px; color: white; font-weight: 500; }
          .value-label { width: 65px; font-size: 10px; color: #64748b; text-align: right; font-family: monospace; }
          .chart-footer { display: flex; gap: 20px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 11px; }
          .chart-footer-item { display: flex; align-items: center; gap: 6px; }
          .chart-footer-color { width: 12px; height: 12px; border-radius: 3px; }

          /* Step-up Summary */
          .stepup-summary { background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%); padding: 15px; border-radius: 10px; margin: 15px 0; }
          .stepup-title { font-size: 11px; color: #2563eb; text-transform: uppercase; margin-bottom: 10px; font-weight: 600; }
          .stepup-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
          .stepup-item { text-align: center; }
          .stepup-value { font-size: 20px; font-weight: bold; color: #1d4ed8; }
          .stepup-label { font-size: 10px; color: #2563eb; }

          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px; }
          th { background: #f1f5f9; padding: 8px; text-align: right; font-weight: 600; color: #475569; }
          th:first-child { text-align: left; }
          td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; }
          td:first-child { text-align: left; }
          .invested { color: #16a34a; }
          .returns { color: #3b82f6; }
          .notes-section { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin: 20px 0; }
          .notes-title { font-size: 12px; font-weight: 600; color: #92400e; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
          .notes-content { font-size: 12px; color: #78350f; line-height: 1.6; white-space: pre-wrap; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        </style>
      </head>
      <body>
        <h1>SIP Calculator Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Monthly Investment</div>
              <div class="summary-value">₹${formatIndianNumber(monthlyInvestment)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Expected Return</div>
              <div class="summary-value">${expectedReturn}% p.a.</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Investment Period</div>
              <div class="summary-value">${investmentPeriod} years</div>
            </div>
          </div>
        </div>

        <div class="maturity-highlight">
          <div class="maturity-label">Maturity Value</div>
          <div class="maturity-value">₹${formatIndianNumber(result.maturityValue)}</div>
        </div>

        <h2>Investment Breakdown</h2>
        <div class="chart-section">
          <div class="pie-chart"></div>
          <div class="chart-legend">
            <div class="legend-item">
              <div class="legend-color legend-invested"></div>
              <span>Invested: ₹${formatIndianNumber(result.totalInvestment)} (${investedPercent}%)</span>
            </div>
            <div class="legend-item">
              <div class="legend-color legend-returns"></div>
              <span>Returns: ₹${formatIndianNumber(result.expectedReturns)} (${returnsDisplayPercent}%)</span>
            </div>
            <div class="legend-item" style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
              <strong>Returns on Investment: ${result.returnsPercent}%</strong>
            </div>
          </div>
        </div>

        ${
          hasStepUp
            ? `
        <h2>Step-Up SIP Analysis (${stepUpPercent}% annual increase)</h2>
        <div class="stepup-summary">
          <div class="stepup-title">Extra Benefits with Step-Up SIP</div>
          <div class="stepup-grid">
            <div class="stepup-item">
              <div class="stepup-value">₹${formatIndianNumber(stepUpResult.maturityValue)}</div>
              <div class="stepup-label">Maturity Value</div>
            </div>
            <div class="stepup-item">
              <div class="stepup-value">₹${formatIndianNumber(stepUpResult.extraReturns)}</div>
              <div class="stepup-label">Extra Returns</div>
            </div>
          </div>
        </div>
        <p style="font-size: 11px; color: #64748b; margin: 10px 0;">
          Total Investment: ₹${formatIndianNumber(stepUpResult.totalInvestment)} |
          Expected Returns: ₹${formatIndianNumber(stepUpResult.expectedReturns)} |
          Returns %: ${stepUpResult.returnsPercent}%
        </p>
        `
            : ''
        }

        <h2>Yearly Growth Breakdown</h2>
        <div class="yearly-chart">
          <div class="chart-header">
            <span>Year</span>
            <span>Invested & Returns</span>
            <span>Value</span>
          </div>
          ${generateYearlyChartHTML(yearlyBreakdown)}
          <div class="chart-footer">
            <div class="chart-footer-item">
              <div class="chart-footer-color" style="background: #22c55e;"></div>
              <span>Invested</span>
            </div>
            <div class="chart-footer-item">
              <div class="chart-footer-color" style="background: #3b82f6;"></div>
              <span>Returns</span>
            </div>
          </div>
        </div>

        <h2>Detailed Breakdown</h2>
        <table>
          <tr>
            <th>Year</th>
            <th>Total Invested</th>
            <th>Returns</th>
            <th>Total Value</th>
          </tr>
          ${yearlyBreakdown
            .map(
              (row) => `
            <tr>
              <td>Year ${row.year}</td>
              <td class="invested">₹${formatIndianNumber(row.invested)}</td>
              <td class="returns">₹${formatIndianNumber(row.returns)}</td>
              <td>₹${formatIndianNumber(row.value)}</td>
            </tr>
          `
            )
            .join('')}
        </table>

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
          Generated by AnyCalc — Calculate everything. Plan anything.
        </div>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `SIP_Report_${monthlyInvestment}_${expectedReturn}pct_${investmentPeriod}yrs.html`
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
              Calculate Returns
            </button>
            <button
              onClick={() => setMode('goal')}
              className={`flex-1 px-4 py-2 text-xs font-medium rounded-md transition-all ${
                mode === 'goal'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Plan for Goal
            </button>
          </div>
          <p className="text-[10px] text-slate-500 text-center mt-2">
            {mode === 'calculate'
              ? 'Calculate maturity value for your SIP amount'
              : 'Find the SIP needed to reach your target corpus'}
          </p>
        </div>

        <div className="grid md:grid-cols-2">
          {/* Inputs */}
          <div className="p-5 space-y-5 border-r border-slate-100">
            {mode === 'calculate' ? (
              /* Monthly Investment - Calculate mode */
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <label className="text-sm font-medium text-slate-600">Monthly Investment</label>
                  <span className="font-mono text-base font-semibold text-slate-900">
                    ₹{formatIndianNumber(monthlyInvestment)}
                  </span>
                </div>
                <input
                  type="range"
                  min={500}
                  max={1000000}
                  step={500}
                  value={monthlyInvestment}
                  onChange={(e) => setMonthlyInvestment(Number(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-green-600"
                />
                <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                  <span>₹500</span>
                  <span>₹10L</span>
                </div>
              </div>
            ) : (
              /* Target Amount - Goal mode */
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <label className="text-sm font-medium text-slate-600">Target Corpus</label>
                  <span className="font-mono text-base font-semibold text-green-600">
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
                  className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-green-600"
                />
                <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                  <span>₹1L</span>
                  <span>₹10Cr</span>
                </div>
                {/* Quick target presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[1000000, 2500000, 5000000, 10000000, 50000000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setTargetAmount(amt)}
                      className={`px-2 py-1 text-[10px] rounded-full border transition-colors ${
                        targetAmount === amt
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

            {/* Expected Return Rate */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Expected Return Rate</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  {expectedReturn}% p.a.
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={30}
                step={0.5}
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(Number(e.target.value))}
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
                  {investmentPeriod} years
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={investmentPeriod}
                onChange={(e) => setInvestmentPeriod(Number(e.target.value))}
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
            {/* Primary Result - Mode dependent */}
            {mode === 'calculate' ? (
              <div className="bg-green-50 rounded-lg p-4 text-center mb-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-green-600 mb-1">
                  Maturity Value
                </div>
                <div className="font-mono text-3xl font-bold text-slate-900">
                  ₹{formatIndianNumber(result.maturityValue)}
                </div>
              </div>
            ) : (
              <div className="bg-green-50 rounded-lg p-4 text-center mb-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-green-600 mb-1">
                  Required Monthly SIP
                </div>
                <div className="font-mono text-3xl font-bold text-slate-900">
                  ₹{formatIndianNumber(requiredSIP)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  to reach ₹{formatIndianNumber(targetAmount)}
                </div>
              </div>
            )}

            {/* Secondary Results */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
                  {mode === 'calculate' ? 'Invested' : 'Target'}
                </div>
                <div className="font-mono text-sm font-semibold text-slate-900">
                  {mode === 'calculate' ? formatCurrencyCompact(result.totalInvestment) : formatCurrencyCompact(targetAmount)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
                  {mode === 'calculate' ? 'Returns' : 'Invested'}
                </div>
                <div className="font-mono text-sm font-semibold text-slate-900">
                  {mode === 'calculate' ? formatCurrencyCompact(result.expectedReturns) : formatCurrencyCompact(result.totalInvestment)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
                  Returns %
                </div>
                <div className="font-mono text-sm font-semibold text-green-600">
                  {result.returnsPercent}%
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
                  <span className="ml-auto font-mono font-medium">{returnsDisplayPercent}%</span>
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

      {/* Step-up SIP Simulator */}
      <details open={showStepUp} className="bg-white border border-slate-200 rounded-xl">
        <summary
          className="px-4 py-3 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 flex items-center justify-between"
          onClick={(e) => {
            e.preventDefault()
            setShowStepUp(!showStepUp)
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📈</span>
            <span>Step-Up SIP Simulator</span>
            <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded">What-if analysis</span>
            {stepUpPercent > 0 && (
              <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {stepUpPercent}% annual increase
              </span>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${showStepUp ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        {showStepUp && (
          <div className="px-4 pb-4 pt-2">
            <p className="text-xs text-slate-500 mb-4">
              Increase your SIP amount annually to significantly boost your wealth over time.
            </p>

            {/* Step-up Percentage Slider */}
            <div className="mb-6">
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Annual Step-Up</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  {stepUpPercent}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={25}
                step={1}
                value={stepUpPercent}
                onChange={(e) => setStepUpPercent(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>0% (No step-up)</span>
                <span>25%</span>
              </div>
            </div>

            {/* Comparison View */}
            {stepUpResult && stepUpPercent > 0 && (
              <>
                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  {/* Without Step-up */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
                      Regular SIP
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Monthly SIP</span>
                        <span className="font-mono text-sm font-semibold text-slate-700">₹{formatIndianNumber(monthlyInvestment)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Total Invested</span>
                        <span className="font-mono text-sm font-semibold text-slate-700">{formatCurrencyCompact(result.totalInvestment)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Maturity Value</span>
                        <span className="font-mono text-sm font-semibold text-slate-700">{formatCurrencyCompact(result.maturityValue)}</span>
                      </div>
                    </div>
                  </div>

                  {/* With Step-up */}
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 mb-3">
                      Step-Up SIP ({stepUpPercent}% p.a.)
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-blue-700">Starting SIP</span>
                        <span className="font-mono text-sm font-semibold text-blue-700">₹{formatIndianNumber(monthlyInvestment)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-blue-700">Total Invested</span>
                        <span className="font-mono text-sm font-semibold text-blue-700">{formatCurrencyCompact(stepUpResult.totalInvestment)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-blue-700">Maturity Value</span>
                        <span className="font-mono text-sm font-semibold text-blue-700">{formatCurrencyCompact(stepUpResult.maturityValue)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Extra Returns Summary */}
                {stepUpResult.extraReturns > 0 && (
                  <div className="mt-4 bg-gradient-to-r from-blue-100 to-indigo-50 rounded-xl p-4 border border-blue-200">
                    <div className="text-center">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 mb-1">
                        Extra Wealth with Step-Up
                      </div>
                      <div className="flex items-center justify-center gap-6">
                        <div>
                          <div className="font-mono text-2xl font-bold text-blue-700">
                            ₹{formatIndianNumber(stepUpResult.extraReturns)}
                          </div>
                          <div className="text-[10px] text-blue-600">additional corpus</div>
                        </div>
                        <div className="text-2xl text-blue-300">=</div>
                        <div>
                          <div className="font-mono text-2xl font-bold text-blue-700">
                            {Math.round((stepUpResult.extraReturns / result.maturityValue) * 100)}%
                          </div>
                          <div className="text-[10px] text-blue-600">more wealth</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step-up Yearly Breakdown */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="text-xs font-semibold text-slate-700 mb-3">
                    Step-Up SIP Growth Year by Year
                  </div>
                  <div className="flex items-center gap-3 mb-2 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                    <span className="w-8">Year</span>
                    <span className="flex-1">Invested & Returns</span>
                    <span className="w-20 text-right">Value</span>
                  </div>
                  <div className="space-y-2">
                    {stepUpResult.yearlyBreakdown.map((year) => {
                      const maxValue = Math.max(...stepUpResult.yearlyBreakdown.map((y) => y.value))
                      const barWidth = maxValue > 0 ? (year.value / maxValue) * 100 : 0
                      const investedWidth = year.value > 0 ? (year.invested / year.value) * 100 : 0

                      return (
                        <div key={year.year} className="flex items-center gap-3">
                          <span className="text-xs w-8 font-mono text-slate-500">
                            Y{year.year}
                          </span>
                          <div
                            className="flex-1 h-7 bg-slate-100 rounded overflow-hidden relative"
                            style={{ width: `${barWidth}%` }}
                          >
                            <div
                              className="absolute left-0 top-0 h-full bg-green-500 flex items-center justify-end pr-1"
                              style={{ width: `${investedWidth}%` }}
                            >
                              {investedWidth > 25 && (
                                <span className="text-[9px] text-white font-medium">
                                  {formatCurrencyCompact(year.invested)}
                                </span>
                              )}
                            </div>
                            <div
                              className="absolute top-0 h-full bg-blue-500 flex items-center justify-start pl-1"
                              style={{ left: `${investedWidth}%`, width: `${100 - investedWidth}%` }}
                            >
                              {(100 - investedWidth) > 25 && (
                                <span className="text-[9px] text-white font-medium">
                                  {formatCurrencyCompact(year.returns)}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-600 w-20 text-right font-mono">
                            {formatCurrencyCompact(year.value)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-100 text-[10px]">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 bg-green-500 rounded-sm" />
                      Invested
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm" />
                      Returns
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </details>

      {/* Yearly Breakdown Visual Chart */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Yearly Growth Breakdown</h3>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
            <span className="w-8">Year</span>
            <span className="flex-1">Invested & Returns</span>
            <span className="w-20 text-right">Value</span>
          </div>
          <div className="space-y-2">
            {yearlyBreakdown.map((year) => {
              const maxValue = Math.max(...yearlyBreakdown.map((y) => y.value))
              const barWidth = maxValue > 0 ? (year.value / maxValue) * 100 : 0
              const investedWidth = year.value > 0 ? (year.invested / year.value) * 100 : 0

              return (
                <div key={year.year} className="flex items-center gap-3">
                  <span className="text-xs w-8 font-mono text-slate-500">
                    Y{year.year}
                  </span>
                  <div
                    className="flex-1 h-7 bg-slate-100 rounded overflow-hidden relative"
                    style={{ width: `${barWidth}%` }}
                  >
                    <div
                      className="absolute left-0 top-0 h-full bg-green-500 flex items-center justify-end pr-1"
                      style={{ width: `${investedWidth}%` }}
                    >
                      {investedWidth > 25 && (
                        <span className="text-[9px] text-white font-medium">
                          {formatCurrencyCompact(year.invested)}
                        </span>
                      )}
                    </div>
                    <div
                      className="absolute top-0 h-full bg-blue-500 flex items-center justify-start pl-1"
                      style={{ left: `${investedWidth}%`, width: `${100 - investedWidth}%` }}
                    >
                      {(100 - investedWidth) > 25 && (
                        <span className="text-[9px] text-white font-medium">
                          {formatCurrencyCompact(year.returns)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-600 w-20 text-right font-mono">
                    {formatCurrencyCompact(year.value)}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 text-[10px]">
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-sm" />
              Invested Amount
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm" />
              Returns
            </div>
          </div>
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
            <span>Start early - even small amounts compound significantly over time</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-500 font-bold">•</span>
            <span>Step-up your SIP by 10% annually to beat inflation</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-500 font-bold">•</span>
            <span>Stay invested through market volatility for best results</span>
          </div>
        </div>
      </div>

      {/* About Section */}
      <details className="bg-white border border-slate-200 rounded-xl">
        <summary className="px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
          About SIP Calculator
        </summary>
        <div className="px-4 pb-4 text-sm text-slate-600 space-y-3">
          <p>
            <strong>SIP (Systematic Investment Plan)</strong> is a disciplined approach to
            investing a fixed amount regularly in mutual funds. It helps you build wealth
            through rupee cost averaging and the power of compounding.
          </p>
          <p>
            <strong>Formula:</strong> M = P × (&#123;[1 + i]^n - 1&#125; / i) × (1 + i)
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li>P = Monthly investment amount</li>
            <li>i = Monthly interest rate (annual rate / 12 / 100)</li>
            <li>n = Number of monthly installments (years × 12)</li>
            <li>M = Maturity value</li>
          </ul>
          <p className="text-slate-500">
            <strong>Step-Up SIP:</strong> By increasing your SIP amount annually (typically
            matching salary increments), you can significantly boost your corpus. A 10% annual
            step-up can result in 50-60% more wealth over 20 years.
          </p>
        </div>
      </details>
    </div>
  )
})

export default SIPCalculator
