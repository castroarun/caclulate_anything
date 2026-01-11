'use client'

import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

interface RDResult {
  monthlyDeposit: number
  totalDeposit: number
  totalInterest: number
  maturityValue: number
  effectiveReturn: number
}

interface QuarterlyBreakdown {
  quarter: number
  deposit: number
  interest: number
  balance: number
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

// RD Calculation with quarterly compounding
function calculateRD(monthlyDeposit: number, annualRate: number, months: number): { result: RDResult; breakdown: QuarterlyBreakdown[] } {
  const quarterlyRate = annualRate / 4 / 100
  const totalDeposit = monthlyDeposit * months
  const breakdown: QuarterlyBreakdown[] = []

  // RD formula: M = P * [(1+r)^n - 1] / (1 - (1+r)^(-1/3))
  // Simplified: Using compound interest on each deposit
  let maturityValue = 0

  for (let i = 0; i < months; i++) {
    const remainingQuarters = (months - i) / 3
    maturityValue += monthlyDeposit * Math.pow(1 + quarterlyRate, remainingQuarters)
  }

  // Generate quarterly breakdown
  let runningDeposit = 0
  let runningBalance = 0
  const quarters = Math.ceil(months / 3)

  for (let q = 1; q <= quarters; q++) {
    const monthsInQuarter = Math.min(3, months - (q - 1) * 3)
    runningDeposit += monthlyDeposit * monthsInQuarter

    // Calculate interest for this quarter
    const interestThisQuarter = runningBalance * quarterlyRate
    runningBalance = runningBalance + (monthlyDeposit * monthsInQuarter) + interestThisQuarter

    breakdown.push({
      quarter: q,
      deposit: Math.round(runningDeposit),
      interest: Math.round(runningBalance - runningDeposit),
      balance: Math.round(runningBalance),
    })
  }

  const totalInterest = maturityValue - totalDeposit
  const effectiveReturn = totalDeposit > 0 ? (totalInterest / totalDeposit) * 100 : 0

  return {
    result: {
      monthlyDeposit,
      totalDeposit: Math.round(totalDeposit),
      totalInterest: Math.round(totalInterest),
      maturityValue: Math.round(maturityValue),
      effectiveReturn: Math.round(effectiveReturn * 10) / 10,
    },
    breakdown,
  }
}

export interface RDCalculatorRef {
  exportToPDF: () => void
  exportToHTML: () => void
  exportToExcel: () => void
  handleClear: () => void
}

const RDCalculator = forwardRef<RDCalculatorRef>(function RDCalculator(props, ref) {
  const [monthlyDeposit, setMonthlyDeposit] = useState(10000)
  const [interestRate, setInterestRate] = useState(7.0)
  const [tenure, setTenure] = useState(60) // in months
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const calculatorRef = useRef<HTMLDivElement>(null)

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calc_rd')
    if (saved) {
      const data = JSON.parse(saved)
      setMonthlyDeposit(data.monthlyDeposit || 10000)
      setInterestRate(data.interestRate || 7.0)
      setTenure(data.tenure || 60)
      setNotes(data.notes || '')
    }
    setIsLoaded(true)
  }, [])

  // Auto-save to localStorage
  useEffect(() => {
    if (!isLoaded) return
    const data = { monthlyDeposit, interestRate, tenure, notes }
    localStorage.setItem('calc_rd', JSON.stringify(data))
    setLastSaved(new Date().toLocaleTimeString())
  }, [monthlyDeposit, interestRate, tenure, notes, isLoaded])

  const handleClear = () => {
    setMonthlyDeposit(10000)
    setInterestRate(7.0)
    setTenure(60)
    setNotes('')
    localStorage.removeItem('calc_rd')
  }

  const { result, breakdown } = useMemo(
    () => calculateRD(monthlyDeposit, interestRate, tenure),
    [monthlyDeposit, interestRate, tenure]
  )

  const depositPercent = useMemo(() => {
    if (result.maturityValue === 0) return 100
    return Math.round((result.totalDeposit / result.maturityValue) * 100)
  }, [result])

  const interestDisplayPercent = 100 - depositPercent

  const tenureYears = Math.floor(tenure / 12)
  const tenureMonths = tenure % 12

  // Export functions
  const exportToExcel = () => {
    const headers = ['Quarter', 'Total Deposited (₹)', 'Total Interest (₹)', 'Balance (₹)']
    const rows = breakdown.map((row) => [row.quarter, row.deposit, row.interest, row.balance])

    const csvContent = [
      `RD Calculator - Investment Report`,
      `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`,
      ``,
      `Monthly Deposit: ₹${formatIndianNumber(monthlyDeposit)}`,
      `Interest Rate: ${interestRate}% p.a.`,
      `Tenure: ${tenure} months`,
      ``,
      `RESULTS`,
      `Total Deposited: ₹${formatIndianNumber(result.totalDeposit)}`,
      `Total Interest: ₹${formatIndianNumber(result.totalInterest)}`,
      `Maturity Value: ₹${formatIndianNumber(result.maturityValue)}`,
      ``,
      `QUARTERLY BREAKDOWN`,
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `RD_Report_${monthlyDeposit}_${tenure}m.csv`
    link.click()
  }

  const exportToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>RD Calculator Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #0891b2; font-size: 24px; margin-bottom: 5px; }
          h2 { font-size: 16px; margin-top: 25px; margin-bottom: 15px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
          .summary-item { text-align: center; }
          .summary-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .summary-value { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 4px; }
          .maturity-highlight { background: linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .maturity-label { font-size: 11px; color: #0891b2; text-transform: uppercase; letter-spacing: 1px; }
          .maturity-value { font-size: 32px; font-weight: bold; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px; }
          th { background: #f1f5f9; padding: 8px; text-align: right; font-weight: 600; color: #475569; }
          th:first-child { text-align: left; }
          td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; }
          td:first-child { text-align: left; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <h1>RD Calculator Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Monthly Deposit</div>
              <div class="summary-value">₹${formatIndianNumber(monthlyDeposit)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Interest Rate</div>
              <div class="summary-value">${interestRate}% p.a.</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Tenure</div>
              <div class="summary-value">${tenure} months</div>
            </div>
          </div>
        </div>

        <div class="maturity-highlight">
          <div class="maturity-label">Maturity Value</div>
          <div class="maturity-value">₹${formatIndianNumber(result.maturityValue)}</div>
        </div>

        <h2>Quarterly Breakdown</h2>
        <table>
          <tr>
            <th>Quarter</th>
            <th>Total Deposited</th>
            <th>Total Interest</th>
            <th>Balance</th>
          </tr>
          ${breakdown.map((row) => `
            <tr>
              <td>Q${row.quarter}</td>
              <td>₹${formatIndianNumber(row.deposit)}</td>
              <td>₹${formatIndianNumber(row.interest)}</td>
              <td>₹${formatIndianNumber(row.balance)}</td>
            </tr>
          `).join('')}
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

  const exportToHTML = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>RD Calculator Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #0891b2; font-size: 24px; margin-bottom: 5px; }
          h2 { font-size: 16px; margin-top: 25px; margin-bottom: 15px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
          .summary-item { text-align: center; }
          .summary-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .summary-value { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 4px; }
          .maturity-highlight { background: linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .maturity-label { font-size: 11px; color: #0891b2; text-transform: uppercase; letter-spacing: 1px; }
          .maturity-value { font-size: 32px; font-weight: bold; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th { background: #f1f5f9; padding: 10px; text-align: right; font-weight: 600; color: #475569; }
          th:first-child { text-align: left; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; }
          td:first-child { text-align: left; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        </style>
      </head>
      <body>
        <h1>RD Calculator Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Monthly Deposit</div>
              <div class="summary-value">₹${formatIndianNumber(monthlyDeposit)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Interest Rate</div>
              <div class="summary-value">${interestRate}% p.a.</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Tenure</div>
              <div class="summary-value">${tenure} months</div>
            </div>
          </div>
        </div>

        <div class="maturity-highlight">
          <div class="maturity-label">Maturity Value</div>
          <div class="maturity-value">₹${formatIndianNumber(result.maturityValue)}</div>
        </div>

        <h2>Quarterly Breakdown</h2>
        <table>
          <tr>
            <th>Quarter</th>
            <th>Total Deposited</th>
            <th>Total Interest</th>
            <th>Balance</th>
          </tr>
          ${breakdown.map((row) => `
            <tr>
              <td>Q${row.quarter}</td>
              <td>₹${formatIndianNumber(row.deposit)}</td>
              <td>₹${formatIndianNumber(row.interest)}</td>
              <td>₹${formatIndianNumber(row.balance)}</td>
            </tr>
          `).join('')}
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
    link.download = `RD_Report_${monthlyDeposit}_${tenure}m.html`
    link.click()
  }

  useImperativeHandle(ref, () => ({
    exportToPDF,
    exportToHTML,
    exportToExcel,
    handleClear,
  }))

  return (
    <div className="space-y-4" ref={calculatorRef}>
      {/* Main Calculator Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid md:grid-cols-2">
          {/* Inputs */}
          <div className="p-5 space-y-5 border-r border-slate-100">
            {/* Monthly Deposit */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Monthly Deposit</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  ₹{formatIndianNumber(monthlyDeposit)}
                </span>
              </div>
              <input
                type="range"
                min={500}
                max={500000}
                step={500}
                value={monthlyDeposit}
                onChange={(e) => setMonthlyDeposit(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-cyan-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>₹500</span>
                <span>₹5L</span>
              </div>
            </div>

            {/* Interest Rate */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Interest Rate</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  {interestRate}% p.a.
                </span>
              </div>
              <input
                type="range"
                min={4}
                max={9}
                step={0.1}
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-cyan-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>4%</span>
                <span>9%</span>
              </div>
            </div>

            {/* Tenure */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Tenure</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  {tenureYears > 0 ? `${tenureYears}y ` : ''}{tenureMonths > 0 ? `${tenureMonths}m` : ''}
                  {tenureYears === 0 && tenureMonths === 0 ? `${tenure}m` : ''}
                </span>
              </div>
              <input
                type="range"
                min={6}
                max={120}
                step={6}
                value={tenure}
                onChange={(e) => setTenure(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-cyan-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>6 months</span>
                <span>10 years</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="p-5 bg-slate-50">
            {/* Primary Result */}
            <div className="bg-cyan-50 rounded-lg p-4 text-center mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-600 mb-1">
                Maturity Value
              </div>
              <div className="font-mono text-3xl font-bold text-slate-900">
                ₹{formatIndianNumber(result.maturityValue)}
              </div>
            </div>

            {/* Secondary Results */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
                  Deposited
                </div>
                <div className="font-mono text-sm font-semibold text-slate-900">
                  {formatCompact(result.totalDeposit)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
                  Interest
                </div>
                <div className="font-mono text-sm font-semibold text-slate-900">
                  {formatCompact(result.totalInterest)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
                  Returns %
                </div>
                <div className="font-mono text-sm font-semibold text-cyan-600">
                  {result.effectiveReturn}%
                </div>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="bg-white rounded-lg p-3 flex items-center gap-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="#0891b2"
                    strokeWidth="3"
                    strokeDasharray={`${depositPercent} ${100 - depositPercent}`}
                  />
                </svg>
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 bg-cyan-600 rounded-sm" />
                  <span className="text-slate-600">Deposited</span>
                  <span className="ml-auto font-mono font-medium">{depositPercent}%</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 bg-blue-500 rounded-sm" />
                  <span className="text-slate-600">Interest</span>
                  <span className="ml-auto font-mono font-medium">{interestDisplayPercent}%</span>
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
                  ? 'text-cyan-600 bg-cyan-50 hover:bg-cyan-100'
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
                className="w-full h-16 p-2 text-xs text-slate-600 bg-white border border-slate-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* Quarterly Breakdown Chart */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Quarterly Growth</h3>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
            <span className="w-8">Qtr</span>
            <span className="flex-1">Deposited & Interest</span>
            <span className="w-20 text-right">Balance</span>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {breakdown.map((quarter) => {
              const maxValue = Math.max(...breakdown.map((q) => q.balance))
              const barWidth = maxValue > 0 ? (quarter.balance / maxValue) * 100 : 0
              const depositWidth = quarter.balance > 0 ? (quarter.deposit / quarter.balance) * 100 : 0

              return (
                <div key={quarter.quarter} className="flex items-center gap-3">
                  <span className="text-xs w-8 font-mono text-slate-500">Q{quarter.quarter}</span>
                  <div
                    className="flex-1 h-6 bg-slate-100 rounded overflow-hidden relative"
                    style={{ width: `${barWidth}%` }}
                  >
                    <div
                      className="absolute left-0 top-0 h-full bg-cyan-500"
                      style={{ width: `${depositWidth}%` }}
                    />
                    <div
                      className="absolute top-0 h-full bg-blue-500"
                      style={{ left: `${depositWidth}%`, width: `${100 - depositWidth}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-600 w-20 text-right font-mono">
                    {formatCompact(quarter.balance)}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 text-[10px]">
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 bg-cyan-500 rounded-sm" />
              Deposited
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm" />
              Interest Earned
            </div>
          </div>
        </div>
      </div>

      {/* RD Benefits */}
      <div className="bg-gradient-to-r from-cyan-50 to-transparent border border-cyan-100 rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-cyan-600 mb-2">
          <span>💡</span> RD Benefits
        </div>
        <div className="grid sm:grid-cols-3 gap-3 text-xs text-slate-600">
          <div className="flex gap-2">
            <span className="text-cyan-500 font-bold">•</span>
            <span>Build savings habit with monthly deposits</span>
          </div>
          <div className="flex gap-2">
            <span className="text-cyan-500 font-bold">•</span>
            <span>Guaranteed returns, no market risk</span>
          </div>
          <div className="flex gap-2">
            <span className="text-cyan-500 font-bold">•</span>
            <span>Flexible tenure from 6 months to 10 years</span>
          </div>
        </div>
      </div>

      {/* About Section */}
      <details className="bg-white border border-slate-200 rounded-xl">
        <summary className="px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
          About RD Calculator
        </summary>
        <div className="px-4 pb-4 text-sm text-slate-600 space-y-3">
          <p>
            <strong>Recurring Deposit (RD)</strong> is a term deposit where you make regular monthly
            deposits for a fixed tenure. It&apos;s ideal for building savings discipline.
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li>Interest is compounded quarterly</li>
            <li>Tenure typically ranges from 6 months to 10 years</li>
            <li>Interest rates vary by bank (usually 5-7.5%)</li>
            <li>TDS applicable if interest exceeds ₹40,000/year (₹50,000 for seniors)</li>
          </ul>
        </div>
      </details>
    </div>
  )
})

export default RDCalculator
