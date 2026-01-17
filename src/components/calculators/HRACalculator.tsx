'use client'

import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

interface HRAResult {
  actualHRA: number
  rentPaid: number
  basicPercent: number
  rentMinusBasicPercent: number
  exemptedHRA: number
  taxableHRA: number
  annualTaxSaving: number
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

// HRA Exemption: Minimum of:
// 1. Actual HRA received
// 2. 50% of salary (Metro) or 40% of salary (Non-Metro) - Basic + DA
// 3. Rent paid minus 10% of salary (Basic + DA)
function calculateHRA(
  basicSalary: number,
  da: number,
  hraReceived: number,
  rentPaid: number,
  isMetro: boolean
): HRAResult {
  const salary = basicSalary + da
  const basicPercent = isMetro ? salary * 0.5 : salary * 0.4
  const rentMinusBasicPercent = rentPaid - (salary * 0.1)

  // Exempted HRA is minimum of the three
  const exemptedHRA = Math.max(0, Math.min(
    hraReceived,
    basicPercent,
    rentMinusBasicPercent
  ))

  const taxableHRA = Math.max(0, hraReceived - exemptedHRA)

  // Estimate tax saving (assuming 30% tax bracket)
  const annualTaxSaving = exemptedHRA * 12 * 0.3

  return {
    actualHRA: hraReceived,
    rentPaid,
    basicPercent: Math.round(basicPercent),
    rentMinusBasicPercent: Math.round(Math.max(0, rentMinusBasicPercent)),
    exemptedHRA: Math.round(exemptedHRA),
    taxableHRA: Math.round(taxableHRA),
    annualTaxSaving: Math.round(annualTaxSaving),
  }
}

export interface HRACalculatorRef {
  exportToPDF: () => void
  exportToHTML: () => void
  exportToExcel: () => void
  handleClear: () => void
}

const HRACalculator = forwardRef<HRACalculatorRef>(function HRACalculator(props, ref) {
  const [basicSalary, setBasicSalary] = useState(50000)
  const [da, setDa] = useState(0)
  const [hraReceived, setHraReceived] = useState(20000)
  const [rentPaid, setRentPaid] = useState(25000)
  const [isMetro, setIsMetro] = useState(true)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const calculatorRef = useRef<HTMLDivElement>(null)

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calc_hra')
    if (saved) {
      const data = JSON.parse(saved)
      setBasicSalary(data.basicSalary || 50000)
      setDa(data.da || 0)
      setHraReceived(data.hraReceived || 20000)
      setRentPaid(data.rentPaid || 25000)
      setIsMetro(data.isMetro !== false)
      setNotes(data.notes || '')
    }
    setIsLoaded(true)
  }, [])

  // Auto-save to localStorage
  useEffect(() => {
    if (!isLoaded) return
    const data = { basicSalary, da, hraReceived, rentPaid, isMetro, notes }
    localStorage.setItem('calc_hra', JSON.stringify(data))
    setLastSaved(new Date().toLocaleTimeString())
  }, [basicSalary, da, hraReceived, rentPaid, isMetro, notes, isLoaded])

  const handleClear = () => {
    setBasicSalary(50000)
    setDa(0)
    setHraReceived(20000)
    setRentPaid(25000)
    setIsMetro(true)
    setNotes('')
    localStorage.removeItem('calc_hra')
  }

  const result = useMemo(
    () => calculateHRA(basicSalary, da, hraReceived, rentPaid, isMetro),
    [basicSalary, da, hraReceived, rentPaid, isMetro]
  )

  // Export functions
  const exportToExcel = () => {
    const csvContent = [
      `HRA Calculator - Tax Exemption Report`,
      `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`,
      ``,
      `INPUT DETAILS (Monthly)`,
      `Basic Salary: ₹${formatIndianNumber(basicSalary)}`,
      `DA: ₹${formatIndianNumber(da)}`,
      `HRA Received: ₹${formatIndianNumber(hraReceived)}`,
      `Rent Paid: ₹${formatIndianNumber(rentPaid)}`,
      `City: ${isMetro ? 'Metro' : 'Non-Metro'}`,
      ``,
      `EXEMPTION CALCULATION (Monthly)`,
      `1. Actual HRA Received: ₹${formatIndianNumber(result.actualHRA)}`,
      `2. ${isMetro ? '50%' : '40%'} of Basic+DA: ₹${formatIndianNumber(result.basicPercent)}`,
      `3. Rent - 10% of Basic+DA: ₹${formatIndianNumber(result.rentMinusBasicPercent)}`,
      ``,
      `RESULTS (Monthly)`,
      `Exempted HRA: ₹${formatIndianNumber(result.exemptedHRA)}`,
      `Taxable HRA: ₹${formatIndianNumber(result.taxableHRA)}`,
      ``,
      `ANNUAL`,
      `Annual Exemption: ₹${formatIndianNumber(result.exemptedHRA * 12)}`,
      `Estimated Tax Saving: ₹${formatIndianNumber(result.annualTaxSaving)}`,
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `HRA_Report_${basicSalary}.csv`
    link.click()
  }

  const exportToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>HRA Calculator Report</title>
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
          .hra-highlight { background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .hra-label { font-size: 11px; color: #7c3aed; text-transform: uppercase; letter-spacing: 1px; }
          .hra-value { font-size: 32px; font-weight: bold; color: #0f172a; }
          .comparison-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .comparison-table th, .comparison-table td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          .comparison-table th { background: #f1f5f9; font-weight: 600; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <h1>HRA Exemption Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="hra-highlight">
          <div class="hra-label">Monthly HRA Exemption</div>
          <div class="hra-value">₹${formatIndianNumber(result.exemptedHRA)}</div>
          <p style="font-size: 12px; color: #7c3aed; margin-top: 5px;">
            Annual: ₹${formatIndianNumber(result.exemptedHRA * 12)}
          </p>
        </div>

        <h2>Exemption Calculation</h2>
        <table class="comparison-table">
          <tr>
            <th>Component</th>
            <th style="text-align: right;">Amount (Monthly)</th>
          </tr>
          <tr>
            <td>1. Actual HRA Received</td>
            <td style="text-align: right;">₹${formatIndianNumber(result.actualHRA)}</td>
          </tr>
          <tr>
            <td>2. ${isMetro ? '50%' : '40%'} of (Basic + DA)</td>
            <td style="text-align: right;">₹${formatIndianNumber(result.basicPercent)}</td>
          </tr>
          <tr>
            <td>3. Rent paid - 10% of (Basic + DA)</td>
            <td style="text-align: right;">₹${formatIndianNumber(result.rentMinusBasicPercent)}</td>
          </tr>
          <tr style="background: #ede9fe;">
            <td><strong>Exempted HRA (Minimum of above)</strong></td>
            <td style="text-align: right;"><strong>₹${formatIndianNumber(result.exemptedHRA)}</strong></td>
          </tr>
          <tr>
            <td>Taxable HRA</td>
            <td style="text-align: right;">₹${formatIndianNumber(result.taxableHRA)}</td>
          </tr>
        </table>

        <div class="summary" style="margin-top: 20px;">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Annual Exemption</div>
              <div class="summary-value" style="color: #16a34a;">₹${formatIndianNumber(result.exemptedHRA * 12)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Est. Tax Saving</div>
              <div class="summary-value" style="color: #16a34a;">₹${formatIndianNumber(result.annualTaxSaving)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">City Type</div>
              <div class="summary-value">${isMetro ? 'Metro' : 'Non-Metro'}</div>
            </div>
          </div>
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
        <title>HRA Calculator Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #7c3aed; font-size: 24px; margin-bottom: 5px; }
          .hra-highlight { background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .hra-label { font-size: 11px; color: #7c3aed; text-transform: uppercase; letter-spacing: 1px; }
          .hra-value { font-size: 32px; font-weight: bold; color: #0f172a; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        </style>
      </head>
      <body>
        <h1>HRA Exemption Report</h1>
        <div class="hra-highlight">
          <div class="hra-label">Monthly HRA Exemption</div>
          <div class="hra-value">₹${formatIndianNumber(result.exemptedHRA)}</div>
        </div>
        <div class="footer">
          Generated by AnyCalc — Calculate everything. Plan anything.
        </div>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `HRA_Report_${basicSalary}.html`
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
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-violet-600"
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
                max={100000}
                step={500}
                value={da}
                onChange={(e) => setDa(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-violet-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>₹0</span>
                <span>₹1L</span>
              </div>
            </div>

            {/* HRA Received */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">HRA Received (Monthly)</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  ₹{formatIndianNumber(hraReceived)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={200000}
                step={500}
                value={hraReceived}
                onChange={(e) => setHraReceived(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-violet-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>₹0</span>
                <span>₹2L</span>
              </div>
            </div>

            {/* Rent Paid */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Rent Paid (Monthly)</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  ₹{formatIndianNumber(rentPaid)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={200000}
                step={500}
                value={rentPaid}
                onChange={(e) => setRentPaid(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-violet-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>₹0</span>
                <span>₹2L</span>
              </div>
            </div>

            {/* Metro Selection */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsMetro(true)}
                className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${
                  isMetro
                    ? 'bg-violet-50 border-violet-300 text-violet-700 font-medium'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Metro (50%)
              </button>
              <button
                onClick={() => setIsMetro(false)}
                className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${
                  !isMetro
                    ? 'bg-violet-50 border-violet-300 text-violet-700 font-medium'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Non-Metro (40%)
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="p-5 bg-slate-50">
            {/* Primary Result */}
            <div className="bg-violet-50 rounded-lg p-4 text-center mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 mb-1">
                HRA Exemption (Monthly)
              </div>
              <div className="font-mono text-3xl font-bold text-slate-900">
                ₹{formatIndianNumber(result.exemptedHRA)}
              </div>
              <div className="text-xs text-violet-600 mt-1">
                Annual: ₹{formatIndianNumber(result.exemptedHRA * 12)}
              </div>
            </div>

            {/* Breakdown */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <div className="text-xs font-semibold text-slate-700 mb-3">Exemption is Minimum of:</div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">1. Actual HRA</span>
                  <span className={`font-mono ${result.exemptedHRA === result.actualHRA ? 'text-violet-600 font-semibold' : ''}`}>
                    ₹{formatIndianNumber(result.actualHRA)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">2. {isMetro ? '50%' : '40%'} of Basic+DA</span>
                  <span className={`font-mono ${result.exemptedHRA === result.basicPercent ? 'text-violet-600 font-semibold' : ''}`}>
                    ₹{formatIndianNumber(result.basicPercent)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">3. Rent - 10% of Basic+DA</span>
                  <span className={`font-mono ${result.exemptedHRA === result.rentMinusBasicPercent ? 'text-violet-600 font-semibold' : ''}`}>
                    ₹{formatIndianNumber(result.rentMinusBasicPercent)}
                  </span>
                </div>
              </div>
            </div>

            {/* Tax Impact */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                <div className="text-[9px] uppercase tracking-wide text-green-600 mb-0.5">
                  Exempted
                </div>
                <div className="font-mono text-sm font-semibold text-green-700">
                  {formatCompact(result.exemptedHRA)}
                </div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-100">
                <div className="text-[9px] uppercase tracking-wide text-amber-600 mb-0.5">
                  Taxable
                </div>
                <div className="font-mono text-sm font-semibold text-amber-700">
                  {formatCompact(result.taxableHRA)}
                </div>
              </div>
            </div>

            {/* Annual Tax Saving */}
            <div className="mt-4 bg-green-50 rounded-lg p-3 text-center border border-green-100">
              <div className="text-[9px] uppercase tracking-wide text-green-600 mb-0.5">
                Est. Annual Tax Saving (30% bracket)
              </div>
              <div className="font-mono text-lg font-bold text-green-700">
                ₹{formatIndianNumber(result.annualTaxSaving)}
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

      {/* Metro Cities Info */}
      <div className="bg-gradient-to-r from-violet-50 to-transparent border border-violet-100 rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-violet-600 mb-2">
          <span>🏙️</span> Metro Cities (50% exemption)
        </div>
        <div className="text-xs text-slate-600">
          Delhi, Mumbai, Kolkata, Chennai — All other cities qualify for 40% exemption
        </div>
      </div>

      {/* About Section */}
      <details className="bg-white border border-slate-200 rounded-xl">
        <summary className="px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
          About HRA Calculator
        </summary>
        <div className="px-4 pb-4 text-sm text-slate-600 space-y-3">
          <p>
            <strong>HRA (House Rent Allowance)</strong> exemption helps salaried employees save tax
            on rent paid for accommodation.
          </p>
          <p>
            <strong>Exemption is the minimum of:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li>Actual HRA received from employer</li>
            <li>50% of (Basic + DA) for metro cities, 40% for others</li>
            <li>Rent paid minus 10% of (Basic + DA)</li>
          </ul>
          <p className="text-slate-500">
            <strong>Note:</strong> To claim HRA, rent receipts are required if annual rent exceeds ₹1 lakh.
            PAN of landlord is required if annual rent exceeds ₹1 lakh.
          </p>
        </div>
      </details>
    </div>
  )
})

export default HRACalculator
