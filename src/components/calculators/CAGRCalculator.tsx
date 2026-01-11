'use client'

import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

interface CAGRResult {
  initialValue: number
  finalValue: number
  years: number
  cagr: number
  totalReturn: number
  totalReturnPercent: number
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
  return `₹${Math.round(num)}`
}

// CAGR Formula: ((Final Value / Initial Value)^(1/years) - 1) * 100
function calculateCAGR(initialValue: number, finalValue: number, years: number): CAGRResult {
  const cagr = years > 0 ? (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100 : 0
  const totalReturn = finalValue - initialValue
  const totalReturnPercent = initialValue > 0 ? (totalReturn / initialValue) * 100 : 0

  return {
    initialValue,
    finalValue,
    years,
    cagr: Math.round(cagr * 100) / 100,
    totalReturn: Math.round(totalReturn),
    totalReturnPercent: Math.round(totalReturnPercent * 10) / 10,
  }
}

// Generate yearly projections for visualization
function generateProjections(initialValue: number, cagr: number, years: number): { year: number; value: number }[] {
  const projections: { year: number; value: number }[] = []
  for (let year = 0; year <= years; year++) {
    const value = initialValue * Math.pow(1 + cagr / 100, year)
    projections.push({ year, value: Math.round(value) })
  }
  return projections
}

export interface CAGRCalculatorRef {
  exportToPDF: () => void
  exportToHTML: () => void
  exportToExcel: () => void
  handleClear: () => void
}

const CAGRCalculator = forwardRef<CAGRCalculatorRef>(function CAGRCalculator(props, ref) {
  const [initialValue, setInitialValue] = useState(100000)
  const [finalValue, setFinalValue] = useState(250000)
  const [years, setYears] = useState(5)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const calculatorRef = useRef<HTMLDivElement>(null)

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calc_cagr')
    if (saved) {
      const data = JSON.parse(saved)
      setInitialValue(data.initialValue || 100000)
      setFinalValue(data.finalValue || 250000)
      setYears(data.years || 5)
      setNotes(data.notes || '')
    }
    setIsLoaded(true)
  }, [])

  // Auto-save to localStorage
  useEffect(() => {
    if (!isLoaded) return
    const data = { initialValue, finalValue, years, notes }
    localStorage.setItem('calc_cagr', JSON.stringify(data))
    setLastSaved(new Date().toLocaleTimeString())
  }, [initialValue, finalValue, years, notes, isLoaded])

  const handleClear = () => {
    setInitialValue(100000)
    setFinalValue(250000)
    setYears(5)
    setNotes('')
    localStorage.removeItem('calc_cagr')
  }

  const result = useMemo(
    () => calculateCAGR(initialValue, finalValue, years),
    [initialValue, finalValue, years]
  )

  const projections = useMemo(
    () => generateProjections(initialValue, result.cagr, years),
    [initialValue, result.cagr, years]
  )

  // Export functions
  const exportToExcel = () => {
    const headers = ['Year', 'Projected Value (₹)']
    const rows = projections.map((p) => [p.year, p.value])

    const csvContent = [
      `CAGR Calculator - Investment Analysis`,
      `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`,
      ``,
      `Initial Investment: ₹${formatIndianNumber(initialValue)}`,
      `Final Value: ₹${formatIndianNumber(finalValue)}`,
      `Time Period: ${years} years`,
      ``,
      `RESULTS`,
      `CAGR: ${result.cagr}%`,
      `Total Return: ₹${formatIndianNumber(result.totalReturn)}`,
      `Total Return %: ${result.totalReturnPercent}%`,
      ``,
      `YEARLY PROJECTIONS`,
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `CAGR_Report_${result.cagr}pct_${years}yrs.csv`
    link.click()
  }

  const exportToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>CAGR Calculator Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #059669; font-size: 24px; margin-bottom: 5px; }
          h2 { font-size: 16px; margin-top: 25px; margin-bottom: 15px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
          .summary-item { text-align: center; }
          .summary-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .summary-value { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 4px; }
          .cagr-highlight { background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .cagr-label { font-size: 11px; color: #059669; text-transform: uppercase; letter-spacing: 1px; }
          .cagr-value { font-size: 48px; font-weight: bold; color: #0f172a; }
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
        <h1>CAGR Calculator Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Initial Investment</div>
              <div class="summary-value">₹${formatIndianNumber(initialValue)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Final Value</div>
              <div class="summary-value">₹${formatIndianNumber(finalValue)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Time Period</div>
              <div class="summary-value">${years} years</div>
            </div>
          </div>
        </div>

        <div class="cagr-highlight">
          <div class="cagr-label">Compound Annual Growth Rate</div>
          <div class="cagr-value">${result.cagr}%</div>
        </div>

        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Total Return</div>
              <div class="summary-value">₹${formatIndianNumber(result.totalReturn)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Return %</div>
              <div class="summary-value">${result.totalReturnPercent}%</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Multiplier</div>
              <div class="summary-value">${(finalValue / initialValue).toFixed(2)}x</div>
            </div>
          </div>
        </div>

        <h2>Year-by-Year Growth</h2>
        <table>
          <tr>
            <th>Year</th>
            <th>Projected Value</th>
          </tr>
          ${projections.map((p) => `
            <tr>
              <td>Year ${p.year}</td>
              <td>₹${formatIndianNumber(p.value)}</td>
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
        <title>CAGR Calculator Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #059669; font-size: 24px; margin-bottom: 5px; }
          h2 { font-size: 16px; margin-top: 25px; margin-bottom: 15px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .cagr-highlight { background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .cagr-label { font-size: 11px; color: #059669; text-transform: uppercase; letter-spacing: 1px; }
          .cagr-value { font-size: 48px; font-weight: bold; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th { background: #f1f5f9; padding: 10px; text-align: right; font-weight: 600; color: #475569; }
          th:first-child { text-align: left; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; }
          td:first-child { text-align: left; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        </style>
      </head>
      <body>
        <h1>CAGR Calculator Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="cagr-highlight">
          <div class="cagr-label">Compound Annual Growth Rate</div>
          <div class="cagr-value">${result.cagr}%</div>
        </div>

        <h2>Year-by-Year Growth</h2>
        <table>
          <tr>
            <th>Year</th>
            <th>Projected Value</th>
          </tr>
          ${projections.map((p) => `
            <tr>
              <td>Year ${p.year}</td>
              <td>₹${formatIndianNumber(p.value)}</td>
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
    link.download = `CAGR_Report_${result.cagr}pct_${years}yrs.html`
    link.click()
  }

  useImperativeHandle(ref, () => ({
    exportToPDF,
    exportToHTML,
    exportToExcel,
    handleClear,
  }))

  const isPositiveReturn = result.cagr >= 0

  return (
    <div className="space-y-4" ref={calculatorRef}>
      {/* Main Calculator Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid md:grid-cols-2">
          {/* Inputs */}
          <div className="p-5 space-y-5 border-r border-slate-100">
            {/* Initial Value */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Initial Investment</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  ₹{formatIndianNumber(initialValue)}
                </span>
              </div>
              <input
                type="range"
                min={1000}
                max={100000000}
                step={1000}
                value={initialValue}
                onChange={(e) => setInitialValue(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>₹1K</span>
                <span>₹10Cr</span>
              </div>
            </div>

            {/* Final Value */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Final Value</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  ₹{formatIndianNumber(finalValue)}
                </span>
              </div>
              <input
                type="range"
                min={1000}
                max={100000000}
                step={1000}
                value={finalValue}
                onChange={(e) => setFinalValue(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>₹1K</span>
                <span>₹10Cr</span>
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
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>1 yr</span>
                <span>30 yrs</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="p-5 bg-slate-50">
            {/* Primary Result - CAGR */}
            <div className={`${isPositiveReturn ? 'bg-emerald-50' : 'bg-red-50'} rounded-lg p-4 text-center mb-4`}>
              <div className={`text-[10px] font-semibold uppercase tracking-wider ${isPositiveReturn ? 'text-emerald-600' : 'text-red-600'} mb-1`}>
                Compound Annual Growth Rate
              </div>
              <div className="font-mono text-4xl font-bold text-slate-900">
                {isPositiveReturn ? '+' : ''}{result.cagr}%
              </div>
              <div className="text-xs text-slate-500 mt-1">
                per year, compounded annually
              </div>
            </div>

            {/* Secondary Results */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
                  Total Return
                </div>
                <div className={`font-mono text-sm font-semibold ${isPositiveReturn ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCompact(result.totalReturn)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
                  Return %
                </div>
                <div className={`font-mono text-sm font-semibold ${isPositiveReturn ? 'text-emerald-600' : 'text-red-600'}`}>
                  {isPositiveReturn ? '+' : ''}{result.totalReturnPercent}%
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
                  Multiplier
                </div>
                <div className="font-mono text-sm font-semibold text-slate-900">
                  {(finalValue / initialValue).toFixed(2)}x
                </div>
              </div>
            </div>

            {/* Growth Visualization */}
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-center">
                  <div className="text-[9px] uppercase tracking-wide text-slate-400">Start</div>
                  <div className="font-mono text-sm font-semibold text-slate-600">{formatCompact(initialValue)}</div>
                </div>
                <div className="flex-1 mx-4 h-2 bg-slate-100 rounded-full relative overflow-hidden">
                  <div
                    className={`h-full ${isPositiveReturn ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-red-400 to-red-600'} rounded-full`}
                    style={{ width: `${Math.min(100, (Math.abs(result.totalReturnPercent) / 5))}%` }}
                  />
                </div>
                <div className="text-center">
                  <div className="text-[9px] uppercase tracking-wide text-slate-400">End</div>
                  <div className="font-mono text-sm font-semibold text-slate-900">{formatCompact(finalValue)}</div>
                </div>
              </div>
              <div className="text-center text-xs text-slate-500">
                in {years} years
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
                  ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
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
                className="w-full h-16 p-2 text-xs text-slate-600 bg-white border border-slate-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* Year-by-Year Projection */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Growth Projection at {result.cagr}% CAGR</h3>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
            <span className="w-12">Year</span>
            <span className="flex-1">Growth</span>
            <span className="w-20 text-right">Value</span>
          </div>
          <div className="space-y-2">
            {projections.map((proj) => {
              const maxValue = Math.max(...projections.map((p) => p.value))
              const barWidth = maxValue > 0 ? (proj.value / maxValue) * 100 : 0

              return (
                <div key={proj.year} className="flex items-center gap-3">
                  <span className="text-xs w-12 font-mono text-slate-500">Year {proj.year}</span>
                  <div className="flex-1 h-6 bg-slate-100 rounded overflow-hidden">
                    <div
                      className={`h-full ${isPositiveReturn ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-600 w-20 text-right font-mono">
                    {formatCompact(proj.value)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* CAGR Benchmarks */}
      <div className="bg-gradient-to-r from-emerald-50 to-transparent border border-emerald-100 rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 mb-2">
          <span>📊</span> CAGR Benchmarks (India)
        </div>
        <div className="grid sm:grid-cols-4 gap-3 text-xs text-slate-600">
          <div className="flex gap-2 items-center">
            <span className="text-emerald-500 font-bold">•</span>
            <span>Nifty 50: ~12-15%</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-emerald-500 font-bold">•</span>
            <span>FD: ~6-7%</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-emerald-500 font-bold">•</span>
            <span>Gold: ~8-10%</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-emerald-500 font-bold">•</span>
            <span>Real Estate: ~8-12%</span>
          </div>
        </div>
      </div>

      {/* About Section */}
      <details className="bg-white border border-slate-200 rounded-xl">
        <summary className="px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
          About CAGR Calculator
        </summary>
        <div className="px-4 pb-4 text-sm text-slate-600 space-y-3">
          <p>
            <strong>CAGR (Compound Annual Growth Rate)</strong> measures the mean annual growth rate
            of an investment over a specified period longer than one year.
          </p>
          <p>
            <strong>Formula:</strong> CAGR = (Final Value / Initial Value)^(1/years) - 1
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li>CAGR smoothens out volatility to show consistent growth rate</li>
            <li>Useful for comparing different investments over time</li>
            <li>Does not reflect actual year-to-year returns</li>
            <li>Higher CAGR indicates better compounding performance</li>
          </ul>
        </div>
      </details>
    </div>
  )
})

export default CAGRCalculator
