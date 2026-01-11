'use client'

import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

interface PPFResult {
  yearlyDeposit: number
  totalDeposit: number
  totalInterest: number
  maturityValue: number
  effectiveReturn: number
}

interface YearlyBreakdown {
  year: number
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

// PPF Calculation with yearly compounding
function calculatePPF(yearlyDeposit: number, interestRate: number, years: number): { result: PPFResult; breakdown: YearlyBreakdown[] } {
  const breakdown: YearlyBreakdown[] = []
  let balance = 0
  let totalDeposit = 0
  const rate = interestRate / 100

  for (let year = 1; year <= years; year++) {
    totalDeposit += yearlyDeposit
    // Interest calculated on opening balance + current year deposit (assuming deposit at start of year)
    const interest = (balance + yearlyDeposit) * rate
    balance = balance + yearlyDeposit + interest

    breakdown.push({
      year,
      deposit: totalDeposit,
      interest: Math.round(balance - totalDeposit),
      balance: Math.round(balance),
    })
  }

  const totalInterest = balance - totalDeposit
  const effectiveReturn = totalDeposit > 0 ? (totalInterest / totalDeposit) * 100 : 0

  return {
    result: {
      yearlyDeposit,
      totalDeposit: Math.round(totalDeposit),
      totalInterest: Math.round(totalInterest),
      maturityValue: Math.round(balance),
      effectiveReturn: Math.round(effectiveReturn),
    },
    breakdown,
  }
}

export interface PPFCalculatorRef {
  exportToPDF: () => void
  exportToHTML: () => void
  exportToExcel: () => void
  handleClear: () => void
}

const PPFCalculator = forwardRef<PPFCalculatorRef>(function PPFCalculator(props, ref) {
  const [yearlyDeposit, setYearlyDeposit] = useState(150000)
  const [interestRate, setInterestRate] = useState(7.1) // Current PPF rate
  const [tenure, setTenure] = useState(15) // PPF minimum tenure
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const calculatorRef = useRef<HTMLDivElement>(null)

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calc_ppf')
    if (saved) {
      const data = JSON.parse(saved)
      setYearlyDeposit(data.yearlyDeposit || 150000)
      setInterestRate(data.interestRate || 7.1)
      setTenure(data.tenure || 15)
      setNotes(data.notes || '')
    }
    setIsLoaded(true)
  }, [])

  // Auto-save to localStorage
  useEffect(() => {
    if (!isLoaded) return
    const data = { yearlyDeposit, interestRate, tenure, notes }
    localStorage.setItem('calc_ppf', JSON.stringify(data))
    setLastSaved(new Date().toLocaleTimeString())
  }, [yearlyDeposit, interestRate, tenure, notes, isLoaded])

  const handleClear = () => {
    setYearlyDeposit(150000)
    setInterestRate(7.1)
    setTenure(15)
    setNotes('')
    localStorage.removeItem('calc_ppf')
  }

  const { result, breakdown } = useMemo(
    () => calculatePPF(yearlyDeposit, interestRate, tenure),
    [yearlyDeposit, interestRate, tenure]
  )

  const depositPercent = useMemo(() => {
    if (result.maturityValue === 0) return 100
    return Math.round((result.totalDeposit / result.maturityValue) * 100)
  }, [result])

  const interestDisplayPercent = 100 - depositPercent

  // Export functions
  const exportToExcel = () => {
    const headers = ['Year', 'Total Deposited (₹)', 'Total Interest (₹)', 'Balance (₹)']
    const rows = breakdown.map((row) => [row.year, row.deposit, row.interest, row.balance])

    const csvContent = [
      `PPF Calculator - Investment Report`,
      `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`,
      ``,
      `Yearly Deposit: ₹${formatIndianNumber(yearlyDeposit)}`,
      `Interest Rate: ${interestRate}% p.a.`,
      `Tenure: ${tenure} years`,
      ``,
      `RESULTS`,
      `Total Deposited: ₹${formatIndianNumber(result.totalDeposit)}`,
      `Total Interest: ₹${formatIndianNumber(result.totalInterest)}`,
      `Maturity Value: ₹${formatIndianNumber(result.maturityValue)}`,
      ``,
      `YEARLY BREAKDOWN`,
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `PPF_Report_${yearlyDeposit}_${tenure}yrs.csv`
    link.click()
  }

  const exportToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>PPF Calculator Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #7c3aed; font-size: 24px; margin-bottom: 5px; }
          h2 { font-size: 16px; margin-top: 25px; margin-bottom: 15px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
          .summary-item { text-align: center; }
          .summary-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .summary-value { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 4px; }
          .maturity-highlight { background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .maturity-label { font-size: 11px; color: #7c3aed; text-transform: uppercase; letter-spacing: 1px; }
          .maturity-value { font-size: 32px; font-weight: bold; color: #0f172a; }
          .chart-section { display: flex; align-items: center; gap: 30px; margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 12px; }
          .pie-chart { width: 120px; height: 120px; border-radius: 50%; background: conic-gradient(#7c3aed 0% ${depositPercent}%, #3b82f6 ${depositPercent}% 100%); flex-shrink: 0; }
          .chart-legend { flex: 1; }
          .legend-item { display: flex; align-items: center; gap: 10px; margin: 8px 0; font-size: 13px; }
          .legend-color { width: 16px; height: 16px; border-radius: 4px; }
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
        <h1>PPF Calculator Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Yearly Deposit</div>
              <div class="summary-value">₹${formatIndianNumber(yearlyDeposit)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Interest Rate</div>
              <div class="summary-value">${interestRate}% p.a.</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Tenure</div>
              <div class="summary-value">${tenure} years</div>
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
              <div class="legend-color" style="background: #7c3aed;"></div>
              <span>Deposited: ₹${formatIndianNumber(result.totalDeposit)} (${depositPercent}%)</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: #3b82f6;"></div>
              <span>Interest: ₹${formatIndianNumber(result.totalInterest)} (${interestDisplayPercent}%)</span>
            </div>
          </div>
        </div>

        <h2>Yearly Breakdown</h2>
        <table>
          <tr>
            <th>Year</th>
            <th>Total Deposited</th>
            <th>Total Interest</th>
            <th>Balance</th>
          </tr>
          ${breakdown.map((row) => `
            <tr>
              <td>Year ${row.year}</td>
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
        <title>PPF Calculator Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #7c3aed; font-size: 24px; margin-bottom: 5px; }
          h2 { font-size: 16px; margin-top: 25px; margin-bottom: 15px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
          .summary-item { text-align: center; }
          .summary-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .summary-value { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 4px; }
          .maturity-highlight { background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .maturity-label { font-size: 11px; color: #7c3aed; text-transform: uppercase; letter-spacing: 1px; }
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
        <h1>PPF Calculator Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Yearly Deposit</div>
              <div class="summary-value">₹${formatIndianNumber(yearlyDeposit)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Interest Rate</div>
              <div class="summary-value">${interestRate}% p.a.</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Tenure</div>
              <div class="summary-value">${tenure} years</div>
            </div>
          </div>
        </div>

        <div class="maturity-highlight">
          <div class="maturity-label">Maturity Value</div>
          <div class="maturity-value">₹${formatIndianNumber(result.maturityValue)}</div>
        </div>

        <h2>Yearly Breakdown</h2>
        <table>
          <tr>
            <th>Year</th>
            <th>Total Deposited</th>
            <th>Total Interest</th>
            <th>Balance</th>
          </tr>
          ${breakdown.map((row) => `
            <tr>
              <td>Year ${row.year}</td>
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
    link.download = `PPF_Report_${yearlyDeposit}_${tenure}yrs.html`
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
            {/* Yearly Deposit */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Yearly Deposit</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  ₹{formatIndianNumber(yearlyDeposit)}
                </span>
              </div>
              <input
                type="range"
                min={500}
                max={150000}
                step={500}
                value={yearlyDeposit}
                onChange={(e) => setYearlyDeposit(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-violet-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>₹500</span>
                <span>₹1.5L (Max)</span>
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
                min={6}
                max={9}
                step={0.1}
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-violet-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>6%</span>
                <span>9%</span>
              </div>
              <div className="mt-1 text-[10px] text-violet-600">
                Current PPF rate: 7.1% (Q4 FY25)
              </div>
            </div>

            {/* Tenure */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Tenure</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  {tenure} years
                </span>
              </div>
              <input
                type="range"
                min={15}
                max={50}
                step={1}
                value={tenure}
                onChange={(e) => setTenure(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-violet-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>15 yrs (Min)</span>
                <span>50 yrs</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="p-5 bg-slate-50">
            {/* Primary Result */}
            <div className="bg-violet-50 rounded-lg p-4 text-center mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 mb-1">
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
                <div className="font-mono text-sm font-semibold text-violet-600">
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
                    stroke="#7c3aed"
                    strokeWidth="3"
                    strokeDasharray={`${depositPercent} ${100 - depositPercent}`}
                  />
                </svg>
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 bg-violet-500 rounded-sm" />
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
                  ? 'text-violet-600 bg-violet-50 hover:bg-violet-100'
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
                className="w-full h-16 p-2 text-xs text-slate-600 bg-white border border-slate-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-violet-400 focus:border-violet-400"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* Yearly Breakdown Chart */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Yearly Growth</h3>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
            <span className="w-8">Year</span>
            <span className="flex-1">Deposited & Interest</span>
            <span className="w-20 text-right">Balance</span>
          </div>
          <div className="space-y-2">
            {breakdown.map((year) => {
              const maxValue = Math.max(...breakdown.map((y) => y.balance))
              const barWidth = maxValue > 0 ? (year.balance / maxValue) * 100 : 0
              const depositWidth = year.balance > 0 ? (year.deposit / year.balance) * 100 : 0

              return (
                <div key={year.year} className="flex items-center gap-3">
                  <span className="text-xs w-8 font-mono text-slate-500">Y{year.year}</span>
                  <div
                    className="flex-1 h-7 bg-slate-100 rounded overflow-hidden relative"
                    style={{ width: `${barWidth}%` }}
                  >
                    <div
                      className="absolute left-0 top-0 h-full bg-violet-500 flex items-center justify-end pr-1"
                      style={{ width: `${depositWidth}%` }}
                    >
                      {depositWidth > 25 && (
                        <span className="text-[9px] text-white font-medium">
                          {formatCompact(year.deposit)}
                        </span>
                      )}
                    </div>
                    <div
                      className="absolute top-0 h-full bg-blue-500 flex items-center justify-start pl-1"
                      style={{ left: `${depositWidth}%`, width: `${100 - depositWidth}%` }}
                    >
                      {(100 - depositWidth) > 25 && (
                        <span className="text-[9px] text-white font-medium">
                          {formatCompact(year.interest)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-600 w-20 text-right font-mono">
                    {formatCompact(year.balance)}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 text-[10px]">
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 bg-violet-500 rounded-sm" />
              Deposited
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm" />
              Interest Earned
            </div>
          </div>
        </div>
      </div>

      {/* PPF Benefits */}
      <div className="bg-gradient-to-r from-violet-50 to-transparent border border-violet-100 rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-violet-600 mb-2">
          <span>💡</span> PPF Benefits
        </div>
        <div className="grid sm:grid-cols-3 gap-3 text-xs text-slate-600">
          <div className="flex gap-2">
            <span className="text-violet-500 font-bold">•</span>
            <span>Tax-free returns under Section 80C (up to ₹1.5L/year)</span>
          </div>
          <div className="flex gap-2">
            <span className="text-violet-500 font-bold">•</span>
            <span>Government-backed, risk-free investment</span>
          </div>
          <div className="flex gap-2">
            <span className="text-violet-500 font-bold">•</span>
            <span>Loan facility available after 3rd year</span>
          </div>
        </div>
      </div>

      {/* About Section */}
      <details className="bg-white border border-slate-200 rounded-xl">
        <summary className="px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
          About PPF Calculator
        </summary>
        <div className="px-4 pb-4 text-sm text-slate-600 space-y-3">
          <p>
            <strong>Public Provident Fund (PPF)</strong> is a government-backed long-term savings
            scheme with attractive tax benefits. It&apos;s one of the safest investment options in India.
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li>Minimum tenure: 15 years (can be extended in blocks of 5 years)</li>
            <li>Maximum yearly deposit: ₹1,50,000</li>
            <li>Minimum yearly deposit: ₹500</li>
            <li>Interest is compounded annually</li>
            <li>EEE status: Exempt at investment, accumulation, and withdrawal</li>
          </ul>
        </div>
      </details>
    </div>
  )
})

export default PPFCalculator
