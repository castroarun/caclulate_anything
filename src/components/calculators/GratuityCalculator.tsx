'use client'

import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

interface GratuityResult {
  basicSalary: number
  yearsOfService: number
  gratuityAmount: number
  taxableAmount: number
  taxFreeAmount: number
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

// Gratuity Formula (for employees covered under Gratuity Act)
// Gratuity = (15 × Last drawn salary × Years of service) / 26
// For employees NOT covered under the Act: (15 × Last drawn salary × Years of service) / 30
function calculateGratuity(
  basicSalary: number,
  da: number,
  yearsOfService: number,
  monthsOfService: number,
  isCoveredUnderAct: boolean
): GratuityResult {
  const lastDrawnSalary = basicSalary + da
  const totalYears = yearsOfService + (monthsOfService >= 6 ? 1 : monthsOfService / 12)

  // Round to nearest complete year (6+ months = 1 year)
  const effectiveYears = Math.round(totalYears)

  const divisor = isCoveredUnderAct ? 26 : 30
  const gratuityAmount = (15 * lastDrawnSalary * effectiveYears) / divisor

  // Tax exemption limit is ₹20 lakhs
  const taxExemptionLimit = 2000000
  const taxFreeAmount = Math.min(gratuityAmount, taxExemptionLimit)
  const taxableAmount = Math.max(0, gratuityAmount - taxExemptionLimit)

  return {
    basicSalary: lastDrawnSalary,
    yearsOfService: effectiveYears,
    gratuityAmount: Math.round(gratuityAmount),
    taxableAmount: Math.round(taxableAmount),
    taxFreeAmount: Math.round(taxFreeAmount),
  }
}

export interface GratuityCalculatorRef {
  exportToPDF: () => void
  exportToHTML: () => void
  exportToExcel: () => void
  handleClear: () => void
}

const GratuityCalculator = forwardRef<GratuityCalculatorRef>(function GratuityCalculator(props, ref) {
  const [basicSalary, setBasicSalary] = useState(50000)
  const [da, setDa] = useState(10000)
  const [yearsOfService, setYearsOfService] = useState(10)
  const [monthsOfService, setMonthsOfService] = useState(0)
  const [isCoveredUnderAct, setIsCoveredUnderAct] = useState(true)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const calculatorRef = useRef<HTMLDivElement>(null)

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calc_gratuity')
    if (saved) {
      const data = JSON.parse(saved)
      setBasicSalary(data.basicSalary || 50000)
      setDa(data.da || 10000)
      setYearsOfService(data.yearsOfService || 10)
      setMonthsOfService(data.monthsOfService || 0)
      setIsCoveredUnderAct(data.isCoveredUnderAct !== false)
      setNotes(data.notes || '')
    }
    setIsLoaded(true)
  }, [])

  // Auto-save to localStorage
  useEffect(() => {
    if (!isLoaded) return
    const data = { basicSalary, da, yearsOfService, monthsOfService, isCoveredUnderAct, notes }
    localStorage.setItem('calc_gratuity', JSON.stringify(data))
    setLastSaved(new Date().toLocaleTimeString())
  }, [basicSalary, da, yearsOfService, monthsOfService, isCoveredUnderAct, notes, isLoaded])

  const handleClear = () => {
    setBasicSalary(50000)
    setDa(10000)
    setYearsOfService(10)
    setMonthsOfService(0)
    setIsCoveredUnderAct(true)
    setNotes('')
    localStorage.removeItem('calc_gratuity')
  }

  const result = useMemo(
    () => calculateGratuity(basicSalary, da, yearsOfService, monthsOfService, isCoveredUnderAct),
    [basicSalary, da, yearsOfService, monthsOfService, isCoveredUnderAct]
  )

  // Export functions
  const exportToExcel = () => {
    const csvContent = [
      `Gratuity Calculator - Report`,
      `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`,
      ``,
      `INPUT DETAILS`,
      `Basic Salary: ₹${formatIndianNumber(basicSalary)}`,
      `DA: ₹${formatIndianNumber(da)}`,
      `Last Drawn Salary: ₹${formatIndianNumber(basicSalary + da)}`,
      `Years of Service: ${yearsOfService}`,
      `Months: ${monthsOfService}`,
      `Covered under Gratuity Act: ${isCoveredUnderAct ? 'Yes' : 'No'}`,
      ``,
      `RESULTS`,
      `Gratuity Amount: ₹${formatIndianNumber(result.gratuityAmount)}`,
      `Tax-Free Amount: ₹${formatIndianNumber(result.taxFreeAmount)}`,
      `Taxable Amount: ₹${formatIndianNumber(result.taxableAmount)}`,
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Gratuity_Report_${yearsOfService}yrs.csv`
    link.click()
  }

  const exportToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gratuity Calculator Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #dc2626; font-size: 24px; margin-bottom: 5px; }
          h2 { font-size: 16px; margin-top: 25px; margin-bottom: 15px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
          .summary-item { text-align: center; }
          .summary-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .summary-value { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 4px; }
          .gratuity-highlight { background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .gratuity-label { font-size: 11px; color: #dc2626; text-transform: uppercase; letter-spacing: 1px; }
          .gratuity-value { font-size: 32px; font-weight: bold; color: #0f172a; }
          .tax-info { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; }
          .tax-box { background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <h1>Gratuity Calculator Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Basic Salary + DA</div>
              <div class="summary-value">₹${formatIndianNumber(basicSalary + da)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Years of Service</div>
              <div class="summary-value">${result.yearsOfService} years</div>
            </div>
          </div>
        </div>

        <div class="gratuity-highlight">
          <div class="gratuity-label">Total Gratuity Amount</div>
          <div class="gratuity-value">₹${formatIndianNumber(result.gratuityAmount)}</div>
        </div>

        <h2>Tax Treatment</h2>
        <div class="tax-info">
          <div class="tax-box">
            <div class="summary-label">Tax-Free Amount</div>
            <div class="summary-value" style="color: #16a34a;">₹${formatIndianNumber(result.taxFreeAmount)}</div>
            <p style="font-size: 10px; color: #64748b; margin-top: 5px;">Exempt up to ₹20 Lakhs</p>
          </div>
          <div class="tax-box">
            <div class="summary-label">Taxable Amount</div>
            <div class="summary-value" style="color: #dc2626;">₹${formatIndianNumber(result.taxableAmount)}</div>
            <p style="font-size: 10px; color: #64748b; margin-top: 5px;">Added to income</p>
          </div>
        </div>

        <h2>Formula Used</h2>
        <p style="font-size: 12px; color: #64748b;">
          Gratuity = (15 × Last Drawn Salary × Years of Service) ÷ ${isCoveredUnderAct ? '26' : '30'}
        </p>
        <p style="font-size: 12px; color: #64748b;">
          = (15 × ₹${formatIndianNumber(basicSalary + da)} × ${result.yearsOfService}) ÷ ${isCoveredUnderAct ? '26' : '30'}
        </p>
        <p style="font-size: 12px; color: #64748b;">
          = ₹${formatIndianNumber(result.gratuityAmount)}
        </p>

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
        <title>Gratuity Calculator Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #dc2626; font-size: 24px; margin-bottom: 5px; }
          .gratuity-highlight { background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .gratuity-label { font-size: 11px; color: #dc2626; text-transform: uppercase; letter-spacing: 1px; }
          .gratuity-value { font-size: 32px; font-weight: bold; color: #0f172a; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        </style>
      </head>
      <body>
        <h1>Gratuity Calculator Report</h1>
        <div class="gratuity-highlight">
          <div class="gratuity-label">Total Gratuity Amount</div>
          <div class="gratuity-value">₹${formatIndianNumber(result.gratuityAmount)}</div>
        </div>
        <div class="footer">
          Generated by Calci — Calculate everything. Plan anything.
        </div>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Gratuity_Report_${yearsOfService}yrs.html`
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
            {/* Basic Salary */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Basic Salary (Monthly)</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  ₹{formatIndianNumber(basicSalary)}
                </span>
              </div>
              <input
                type="range"
                min={10000}
                max={500000}
                step={1000}
                value={basicSalary}
                onChange={(e) => setBasicSalary(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-red-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>₹10K</span>
                <span>₹5L</span>
              </div>
            </div>

            {/* DA */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Dearness Allowance (DA)</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  ₹{formatIndianNumber(da)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={200000}
                step={500}
                value={da}
                onChange={(e) => setDa(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-red-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>₹0</span>
                <span>₹2L</span>
              </div>
            </div>

            {/* Years of Service */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Years of Service</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  {yearsOfService} years {monthsOfService > 0 ? `${monthsOfService} months` : ''}
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={40}
                step={1}
                value={yearsOfService}
                onChange={(e) => setYearsOfService(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-red-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>5 yrs (Min)</span>
                <span>40 yrs</span>
              </div>
            </div>

            {/* Months */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Additional Months</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  {monthsOfService} months
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={11}
                step={1}
                value={monthsOfService}
                onChange={(e) => setMonthsOfService(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-red-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>0</span>
                <span>11</span>
              </div>
              <div className="mt-1 text-[10px] text-red-600">
                {monthsOfService >= 6 ? '6+ months rounds up to next year' : 'Less than 6 months is ignored'}
              </div>
            </div>

            {/* Gratuity Act Coverage */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <input
                type="checkbox"
                id="coveredUnderAct"
                checked={isCoveredUnderAct}
                onChange={(e) => setIsCoveredUnderAct(e.target.checked)}
                className="w-4 h-4 accent-red-600"
              />
              <label htmlFor="coveredUnderAct" className="text-sm text-slate-600">
                Covered under Payment of Gratuity Act, 1972
              </label>
            </div>
          </div>

          {/* Results */}
          <div className="p-5 bg-slate-50">
            {/* Primary Result */}
            <div className="bg-red-50 rounded-lg p-4 text-center mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-red-600 mb-1">
                Gratuity Amount
              </div>
              <div className="font-mono text-3xl font-bold text-slate-900">
                ₹{formatIndianNumber(result.gratuityAmount)}
              </div>
            </div>

            {/* Tax Breakdown */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                <div className="text-[9px] uppercase tracking-wide text-green-600 mb-0.5">
                  Tax-Free
                </div>
                <div className="font-mono text-sm font-semibold text-green-700">
                  {formatCompact(result.taxFreeAmount)}
                </div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-100">
                <div className="text-[9px] uppercase tracking-wide text-amber-600 mb-0.5">
                  Taxable
                </div>
                <div className="font-mono text-sm font-semibold text-amber-700">
                  {formatCompact(result.taxableAmount)}
                </div>
              </div>
            </div>

            {/* Formula Display */}
            <div className="bg-white rounded-lg p-4 text-xs text-slate-600">
              <div className="font-semibold text-slate-700 mb-2">Calculation</div>
              <div className="font-mono space-y-1">
                <div>= (15 × ₹{formatIndianNumber(basicSalary + da)} × {result.yearsOfService}) ÷ {isCoveredUnderAct ? '26' : '30'}</div>
                <div>= (₹{formatIndianNumber(15 * (basicSalary + da) * result.yearsOfService)}) ÷ {isCoveredUnderAct ? '26' : '30'}</div>
                <div className="font-semibold text-red-600">= ₹{formatIndianNumber(result.gratuityAmount)}</div>
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
                  ? 'text-red-600 bg-red-50 hover:bg-red-100'
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
                className="w-full h-16 p-2 text-xs text-slate-600 bg-white border border-slate-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-red-400 focus:border-red-400"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* Gratuity Rules */}
      <div className="bg-gradient-to-r from-red-50 to-transparent border border-red-100 rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-red-600 mb-2">
          <span>📋</span> Gratuity Rules
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-xs text-slate-600">
          <div className="flex gap-2">
            <span className="text-red-500 font-bold">•</span>
            <span>Minimum 5 years of continuous service required</span>
          </div>
          <div className="flex gap-2">
            <span className="text-red-500 font-bold">•</span>
            <span>Tax exemption limit: ₹20 Lakhs</span>
          </div>
          <div className="flex gap-2">
            <span className="text-red-500 font-bold">•</span>
            <span>6+ months of service rounds up to next year</span>
          </div>
          <div className="flex gap-2">
            <span className="text-red-500 font-bold">•</span>
            <span>Applicable to all employees (10+ employee orgs)</span>
          </div>
        </div>
      </div>

      {/* About Section */}
      <details className="bg-white border border-slate-200 rounded-xl">
        <summary className="px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
          About Gratuity Calculator
        </summary>
        <div className="px-4 pb-4 text-sm text-slate-600 space-y-3">
          <p>
            <strong>Gratuity</strong> is a lump sum amount paid by an employer to an employee as a
            token of appreciation for the services rendered during employment.
          </p>
          <p>
            <strong>Formula (Under Gratuity Act):</strong> Gratuity = (15 × Last drawn salary × Years of service) ÷ 26
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li>15 represents 15 days of wages</li>
            <li>26 represents working days in a month</li>
            <li>Last drawn salary = Basic + DA</li>
            <li>Maximum gratuity limit is ₹20 Lakhs (tax-free)</li>
          </ul>
        </div>
      </details>
    </div>
  )
})

export default GratuityCalculator
