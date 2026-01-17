'use client'

import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useNumberFormat } from '@/contexts/NumberFormatContext'

interface TaxResult {
  grossIncome: number
  totalDeductions: number
  taxableIncome: number
  taxOldRegime: number
  taxNewRegime: number
  recommendation: 'old' | 'new'
  savings: number
}

interface TaxSlab {
  min: number
  max: number
  rate: number
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
  return `₹${Math.round(num)}`
}

// Old Tax Regime Slabs (FY 2024-25)
const OLD_REGIME_SLABS: TaxSlab[] = [
  { min: 0, max: 250000, rate: 0 },
  { min: 250000, max: 500000, rate: 5 },
  { min: 500000, max: 1000000, rate: 20 },
  { min: 1000000, max: Infinity, rate: 30 },
]

// New Tax Regime Slabs (FY 2024-25)
const NEW_REGIME_SLABS: TaxSlab[] = [
  { min: 0, max: 300000, rate: 0 },
  { min: 300000, max: 700000, rate: 5 },
  { min: 700000, max: 1000000, rate: 10 },
  { min: 1000000, max: 1200000, rate: 15 },
  { min: 1200000, max: 1500000, rate: 20 },
  { min: 1500000, max: Infinity, rate: 30 },
]

function calculateTaxBySlabs(income: number, slabs: TaxSlab[]): number {
  let tax = 0
  for (const slab of slabs) {
    if (income > slab.min) {
      const taxableInSlab = Math.min(income, slab.max) - slab.min
      tax += taxableInSlab * (slab.rate / 100)
    }
  }
  return tax
}

function calculateTax(
  grossIncome: number,
  section80C: number,
  section80D: number,
  hra: number,
  lta: number,
  otherDeductions: number,
  standardDeduction: number
): TaxResult {
  // Old Regime: All deductions allowed
  const totalDeductionsOld = section80C + section80D + hra + lta + otherDeductions + standardDeduction
  const taxableIncomeOld = Math.max(0, grossIncome - totalDeductionsOld)
  let taxOldRegime = calculateTaxBySlabs(taxableIncomeOld, OLD_REGIME_SLABS)

  // Rebate under 87A for old regime (income up to 5L)
  if (taxableIncomeOld <= 500000) {
    taxOldRegime = Math.max(0, taxOldRegime - 12500)
  }

  // Add cess (4%)
  taxOldRegime = taxOldRegime * 1.04

  // New Regime: Standard deduction of 75,000 only (as per FY 2024-25)
  const standardDeductionNew = 75000
  const taxableIncomeNew = Math.max(0, grossIncome - standardDeductionNew)
  let taxNewRegime = calculateTaxBySlabs(taxableIncomeNew, NEW_REGIME_SLABS)

  // Rebate under 87A for new regime (income up to 7L)
  if (taxableIncomeNew <= 700000) {
    taxNewRegime = Math.max(0, taxNewRegime - 25000)
  }

  // Add cess (4%)
  taxNewRegime = taxNewRegime * 1.04

  const recommendation = taxOldRegime <= taxNewRegime ? 'old' : 'new'
  const savings = Math.abs(taxOldRegime - taxNewRegime)

  return {
    grossIncome,
    totalDeductions: totalDeductionsOld,
    taxableIncome: taxableIncomeOld,
    taxOldRegime: Math.round(taxOldRegime),
    taxNewRegime: Math.round(taxNewRegime),
    recommendation,
    savings: Math.round(savings),
  }
}

export interface TaxCalculatorRef {
  exportToPDF: () => void
  exportToHTML: () => void
  exportToExcel: () => void
  handleClear: () => void
}

const TaxCalculator = forwardRef<TaxCalculatorRef>(function TaxCalculator(props, ref) {
  const { formatCurrencyCompact } = useNumberFormat()
  const [grossIncome, setGrossIncome] = useState(1200000)
  const [section80C, setSection80C] = useState(150000)
  const [section80D, setSection80D] = useState(25000)
  const [hra, setHra] = useState(100000)
  const [lta, setLta] = useState(0)
  const [otherDeductions, setOtherDeductions] = useState(0)
  const [standardDeduction, setStandardDeduction] = useState(50000)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const calculatorRef = useRef<HTMLDivElement>(null)

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calc_tax')
    if (saved) {
      const data = JSON.parse(saved)
      setGrossIncome(data.grossIncome || 1200000)
      setSection80C(data.section80C || 150000)
      setSection80D(data.section80D || 25000)
      setHra(data.hra || 100000)
      setLta(data.lta || 0)
      setOtherDeductions(data.otherDeductions || 0)
      setStandardDeduction(data.standardDeduction || 50000)
      setNotes(data.notes || '')
    }
    setIsLoaded(true)
  }, [])

  // Auto-save to localStorage
  useEffect(() => {
    if (!isLoaded) return
    const data = { grossIncome, section80C, section80D, hra, lta, otherDeductions, standardDeduction, notes }
    localStorage.setItem('calc_tax', JSON.stringify(data))
    setLastSaved(new Date().toLocaleTimeString())
  }, [grossIncome, section80C, section80D, hra, lta, otherDeductions, standardDeduction, notes, isLoaded])

  const handleClear = () => {
    setGrossIncome(1200000)
    setSection80C(150000)
    setSection80D(25000)
    setHra(100000)
    setLta(0)
    setOtherDeductions(0)
    setStandardDeduction(50000)
    setNotes('')
    localStorage.removeItem('calc_tax')
  }

  const result = useMemo(
    () => calculateTax(grossIncome, section80C, section80D, hra, lta, otherDeductions, standardDeduction),
    [grossIncome, section80C, section80D, hra, lta, otherDeductions, standardDeduction]
  )

  // Export functions
  const exportToExcel = () => {
    const csvContent = [
      `Income Tax Calculator - FY 2024-25`,
      `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`,
      ``,
      `INCOME`,
      `Gross Income: ₹${formatIndianNumber(grossIncome)}`,
      ``,
      `DEDUCTIONS (Old Regime)`,
      `Section 80C: ₹${formatIndianNumber(section80C)}`,
      `Section 80D: ₹${formatIndianNumber(section80D)}`,
      `HRA Exemption: ₹${formatIndianNumber(hra)}`,
      `LTA: ₹${formatIndianNumber(lta)}`,
      `Other Deductions: ₹${formatIndianNumber(otherDeductions)}`,
      `Standard Deduction: ₹${formatIndianNumber(standardDeduction)}`,
      `Total Deductions: ₹${formatIndianNumber(result.totalDeductions)}`,
      ``,
      `TAX COMPARISON`,
      `Old Regime Tax: ₹${formatIndianNumber(result.taxOldRegime)}`,
      `New Regime Tax: ₹${formatIndianNumber(result.taxNewRegime)}`,
      ``,
      `RECOMMENDATION`,
      `Better Option: ${result.recommendation === 'old' ? 'Old Regime' : 'New Regime'}`,
      `Potential Savings: ₹${formatIndianNumber(result.savings)}`,
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Tax_Report_${grossIncome}.csv`
    link.click()
  }

  const exportToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Income Tax Calculator Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #0891b2; font-size: 24px; margin-bottom: 5px; }
          h2 { font-size: 16px; margin-top: 25px; margin-bottom: 15px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
          .regime-box { padding: 20px; border-radius: 12px; text-align: center; }
          .old-regime { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); }
          .new-regime { background: linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%); }
          .regime-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
          .regime-value { font-size: 28px; font-weight: bold; color: #0f172a; }
          .recommended { border: 3px solid #16a34a; position: relative; }
          .recommended::after { content: 'RECOMMENDED'; position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #16a34a; color: white; padding: 2px 10px; font-size: 10px; border-radius: 10px; }
          .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <h1>Income Tax Calculator Report</h1>
        <p class="subtitle">FY 2024-25 | Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="summary">
          <p><strong>Gross Income:</strong> ₹${formatIndianNumber(grossIncome)}</p>
          <p><strong>Total Deductions (Old Regime):</strong> ₹${formatIndianNumber(result.totalDeductions)}</p>
          <p><strong>Taxable Income (Old Regime):</strong> ₹${formatIndianNumber(result.taxableIncome)}</p>
        </div>

        <h2>Tax Comparison</h2>
        <div class="comparison">
          <div class="regime-box old-regime ${result.recommendation === 'old' ? 'recommended' : ''}">
            <div class="regime-label" style="color: #b45309;">Old Regime</div>
            <div class="regime-value">₹${formatIndianNumber(result.taxOldRegime)}</div>
          </div>
          <div class="regime-box new-regime ${result.recommendation === 'new' ? 'recommended' : ''}">
            <div class="regime-label" style="color: #0891b2;">New Regime</div>
            <div class="regime-value">₹${formatIndianNumber(result.taxNewRegime)}</div>
          </div>
        </div>

        <div class="summary" style="background: #dcfce7; text-align: center;">
          <p style="margin: 0; font-size: 14px;">
            <strong>You save ₹${formatIndianNumber(result.savings)}</strong> with the
            <strong>${result.recommendation === 'old' ? 'Old' : 'New'} Regime</strong>
          </p>
        </div>

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
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Income Tax Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #0891b2; }
          .comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
          .regime-box { padding: 20px; border-radius: 12px; text-align: center; }
          .old-regime { background: #fef3c7; }
          .new-regime { background: #cffafe; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <h1>Income Tax Report - FY 2024-25</h1>
        <p>Gross Income: ₹${formatIndianNumber(grossIncome)}</p>
        <div class="comparison">
          <div class="regime-box old-regime">
            <h3>Old Regime</h3>
            <p style="font-size: 24px; font-weight: bold;">₹${formatIndianNumber(result.taxOldRegime)}</p>
          </div>
          <div class="regime-box new-regime">
            <h3>New Regime</h3>
            <p style="font-size: 24px; font-weight: bold;">₹${formatIndianNumber(result.taxNewRegime)}</p>
          </div>
        </div>
        <p><strong>Recommendation:</strong> ${result.recommendation === 'old' ? 'Old' : 'New'} Regime saves ₹${formatIndianNumber(result.savings)}</p>
        <div class="footer">Generated by AnyCalc</div>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Tax_Report_${grossIncome}.html`
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
          <div className="p-5 space-y-4 border-r border-slate-100">
            {/* Gross Income */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Gross Annual Income</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  ₹{formatIndianNumber(grossIncome)}
                </span>
              </div>
              <input
                type="range"
                min={300000}
                max={50000000}
                step={10000}
                value={grossIncome}
                onChange={(e) => setGrossIncome(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-cyan-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>₹3L</span>
                <span>₹5Cr</span>
              </div>
            </div>

            {/* Section 80C */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Section 80C (PF, PPF, ELSS)</label>
                <span className="font-mono text-sm font-semibold text-slate-900">
                  ₹{formatIndianNumber(section80C)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={150000}
                step={5000}
                value={section80C}
                onChange={(e) => setSection80C(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-cyan-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>₹0</span>
                <span>₹1.5L (Max)</span>
              </div>
            </div>

            {/* Section 80D */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Section 80D (Health Insurance)</label>
                <span className="font-mono text-sm font-semibold text-slate-900">
                  ₹{formatIndianNumber(section80D)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100000}
                step={5000}
                value={section80D}
                onChange={(e) => setSection80D(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-cyan-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>₹0</span>
                <span>₹1L</span>
              </div>
            </div>

            {/* HRA */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">HRA Exemption (Annual)</label>
                <span className="font-mono text-sm font-semibold text-slate-900">
                  ₹{formatIndianNumber(hra)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={500000}
                step={5000}
                value={hra}
                onChange={(e) => setHra(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-cyan-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>₹0</span>
                <span>₹5L</span>
              </div>
            </div>

            {/* Other Deductions */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Other Deductions (80E, 80G, etc.)</label>
                <span className="font-mono text-sm font-semibold text-slate-900">
                  ₹{formatIndianNumber(otherDeductions)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={500000}
                step={5000}
                value={otherDeductions}
                onChange={(e) => setOtherDeductions(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-cyan-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>₹0</span>
                <span>₹5L</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="p-5 bg-slate-50">
            {/* Recommendation Banner */}
            <div className={`rounded-lg p-4 text-center mb-4 ${result.recommendation === 'old' ? 'bg-amber-50 border border-amber-200' : 'bg-cyan-50 border border-cyan-200'}`}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-green-600 mb-1">
                Recommended
              </div>
              <div className="font-semibold text-lg text-slate-900">
                {result.recommendation === 'old' ? 'Old Tax Regime' : 'New Tax Regime'}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Saves ₹{formatIndianNumber(result.savings)} compared to {result.recommendation === 'old' ? 'new' : 'old'} regime
              </div>
            </div>

            {/* Comparison Cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className={`rounded-lg p-4 text-center ${result.recommendation === 'old' ? 'bg-amber-100 border-2 border-amber-400' : 'bg-amber-50'}`}>
                <div className="text-[9px] uppercase tracking-wide text-amber-700 mb-1">
                  Old Regime
                </div>
                <div className="font-mono text-lg font-bold text-slate-900">
                  {formatCurrencyCompact(result.taxOldRegime)}
                </div>
                {result.recommendation === 'old' && (
                  <div className="text-[9px] text-green-600 font-medium mt-1">✓ Better</div>
                )}
              </div>
              <div className={`rounded-lg p-4 text-center ${result.recommendation === 'new' ? 'bg-cyan-100 border-2 border-cyan-400' : 'bg-cyan-50'}`}>
                <div className="text-[9px] uppercase tracking-wide text-cyan-700 mb-1">
                  New Regime
                </div>
                <div className="font-mono text-lg font-bold text-slate-900">
                  {formatCurrencyCompact(result.taxNewRegime)}
                </div>
                {result.recommendation === 'new' && (
                  <div className="text-[9px] text-green-600 font-medium mt-1">✓ Better</div>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-lg p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Gross Income</span>
                <span className="font-mono font-medium">{formatCurrencyCompact(grossIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Deductions (Old)</span>
                <span className="font-mono font-medium text-green-600">-{formatCurrencyCompact(result.totalDeductions)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2">
                <span className="text-slate-700 font-medium">Taxable Income (Old)</span>
                <span className="font-mono font-semibold">{formatCurrencyCompact(result.taxableIncome)}</span>
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

      {/* Tax Slabs Reference */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <div className="text-sm font-semibold text-amber-700 mb-3">Old Regime Slabs</div>
          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex justify-between"><span>Up to ₹2.5L</span><span>0%</span></div>
            <div className="flex justify-between"><span>₹2.5L - ₹5L</span><span>5%</span></div>
            <div className="flex justify-between"><span>₹5L - ₹10L</span><span>20%</span></div>
            <div className="flex justify-between"><span>Above ₹10L</span><span>30%</span></div>
          </div>
        </div>
        <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-4">
          <div className="text-sm font-semibold text-cyan-700 mb-3">New Regime Slabs (FY 24-25)</div>
          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex justify-between"><span>Up to ₹3L</span><span>0%</span></div>
            <div className="flex justify-between"><span>₹3L - ₹7L</span><span>5%</span></div>
            <div className="flex justify-between"><span>₹7L - ₹10L</span><span>10%</span></div>
            <div className="flex justify-between"><span>₹10L - ₹12L</span><span>15%</span></div>
            <div className="flex justify-between"><span>₹12L - ₹15L</span><span>20%</span></div>
            <div className="flex justify-between"><span>Above ₹15L</span><span>30%</span></div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <details className="bg-white border border-slate-200 rounded-xl">
        <summary className="px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
          About Tax Calculator
        </summary>
        <div className="px-4 pb-4 text-sm text-slate-600 space-y-3">
          <p>
            This calculator helps you compare tax liability under <strong>Old</strong> and <strong>New</strong> tax regimes
            for FY 2024-25 (AY 2025-26).
          </p>
          <p><strong>Old Regime:</strong> Allows deductions under 80C, 80D, HRA, LTA, etc.</p>
          <p><strong>New Regime:</strong> Lower tax rates but no deductions except standard deduction of ₹75,000.</p>
          <p className="text-slate-500">
            <strong>Note:</strong> This is a simplified calculation. Actual tax may vary based on surcharge, specific exemptions, and other factors.
          </p>
        </div>
      </details>
    </div>
  )
})

export default TaxCalculator
