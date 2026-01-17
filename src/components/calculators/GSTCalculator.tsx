'use client'

import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

interface GSTResult {
  originalAmount: number
  gstRate: number
  gstAmount: number
  totalAmount: number
  cgst: number
  sgst: number
  igst: number
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

// GST Calculation
function calculateGST(
  amount: number,
  gstRate: number,
  isInclusive: boolean,
  isInterState: boolean
): GSTResult {
  let originalAmount: number
  let gstAmount: number
  let totalAmount: number

  if (isInclusive) {
    // GST is included in the amount
    totalAmount = amount
    originalAmount = amount / (1 + gstRate / 100)
    gstAmount = totalAmount - originalAmount
  } else {
    // GST is not included (exclusive)
    originalAmount = amount
    gstAmount = amount * (gstRate / 100)
    totalAmount = amount + gstAmount
  }

  // For intra-state: CGST + SGST (equal split)
  // For inter-state: IGST (full)
  const cgst = isInterState ? 0 : gstAmount / 2
  const sgst = isInterState ? 0 : gstAmount / 2
  const igst = isInterState ? gstAmount : 0

  return {
    originalAmount: Math.round(originalAmount * 100) / 100,
    gstRate,
    gstAmount: Math.round(gstAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    igst: Math.round(igst * 100) / 100,
  }
}

export interface GSTCalculatorRef {
  exportToPDF: () => void
  exportToHTML: () => void
  exportToExcel: () => void
  handleClear: () => void
}

const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28]

const GSTCalculator = forwardRef<GSTCalculatorRef>(function GSTCalculator(props, ref) {
  const [amount, setAmount] = useState(10000)
  const [gstRate, setGstRate] = useState(18)
  const [isInclusive, setIsInclusive] = useState(false)
  const [isInterState, setIsInterState] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const calculatorRef = useRef<HTMLDivElement>(null)

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calc_gst')
    if (saved) {
      const data = JSON.parse(saved)
      setAmount(data.amount || 10000)
      setGstRate(data.gstRate || 18)
      setIsInclusive(data.isInclusive || false)
      setIsInterState(data.isInterState || false)
      setNotes(data.notes || '')
    }
    setIsLoaded(true)
  }, [])

  // Auto-save to localStorage
  useEffect(() => {
    if (!isLoaded) return
    const data = { amount, gstRate, isInclusive, isInterState, notes }
    localStorage.setItem('calc_gst', JSON.stringify(data))
    setLastSaved(new Date().toLocaleTimeString())
  }, [amount, gstRate, isInclusive, isInterState, notes, isLoaded])

  const handleClear = () => {
    setAmount(10000)
    setGstRate(18)
    setIsInclusive(false)
    setIsInterState(false)
    setNotes('')
    localStorage.removeItem('calc_gst')
  }

  const result = useMemo(
    () => calculateGST(amount, gstRate, isInclusive, isInterState),
    [amount, gstRate, isInclusive, isInterState]
  )

  // Export functions
  const exportToExcel = () => {
    const csvContent = [
      `GST Calculator - Tax Breakdown`,
      `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`,
      ``,
      `INPUT`,
      `Amount: ₹${formatIndianNumber(amount)}`,
      `GST Rate: ${gstRate}%`,
      `Type: ${isInclusive ? 'GST Inclusive' : 'GST Exclusive'}`,
      `Transaction: ${isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}`,
      ``,
      `BREAKDOWN`,
      `Base Amount: ₹${result.originalAmount.toFixed(2)}`,
      `GST Amount: ₹${result.gstAmount.toFixed(2)}`,
      isInterState ? `IGST (${gstRate}%): ₹${result.igst.toFixed(2)}` : `CGST (${gstRate/2}%): ₹${result.cgst.toFixed(2)}`,
      isInterState ? '' : `SGST (${gstRate/2}%): ₹${result.sgst.toFixed(2)}`,
      ``,
      `TOTAL`,
      `Total Amount: ₹${result.totalAmount.toFixed(2)}`,
    ].filter(Boolean).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `GST_Report_${amount}_${gstRate}pct.csv`
    link.click()
  }

  const exportToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>GST Calculator Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #0891b2; font-size: 24px; margin-bottom: 5px; }
          h2 { font-size: 16px; margin-top: 25px; margin-bottom: 15px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
          .summary-item { text-align: center; }
          .summary-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .summary-value { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 4px; }
          .gst-highlight { background: linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .gst-label { font-size: 11px; color: #0891b2; text-transform: uppercase; letter-spacing: 1px; }
          .gst-value { font-size: 32px; font-weight: bold; color: #0f172a; }
          .breakdown-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .breakdown-table th, .breakdown-table td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          .breakdown-table th { background: #f1f5f9; font-weight: 600; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <h1>GST Calculator Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="gst-highlight">
          <div class="gst-label">Total Amount (with GST)</div>
          <div class="gst-value">₹${result.totalAmount.toFixed(2)}</div>
        </div>

        <h2>Breakdown</h2>
        <table class="breakdown-table">
          <tr>
            <th>Component</th>
            <th style="text-align: right;">Amount</th>
          </tr>
          <tr>
            <td>Base Amount</td>
            <td style="text-align: right;">₹${result.originalAmount.toFixed(2)}</td>
          </tr>
          ${isInterState ? `
          <tr>
            <td>IGST @ ${gstRate}%</td>
            <td style="text-align: right;">₹${result.igst.toFixed(2)}</td>
          </tr>
          ` : `
          <tr>
            <td>CGST @ ${gstRate/2}%</td>
            <td style="text-align: right;">₹${result.cgst.toFixed(2)}</td>
          </tr>
          <tr>
            <td>SGST @ ${gstRate/2}%</td>
            <td style="text-align: right;">₹${result.sgst.toFixed(2)}</td>
          </tr>
          `}
          <tr style="background: #cffafe;">
            <td><strong>Total GST</strong></td>
            <td style="text-align: right;"><strong>₹${result.gstAmount.toFixed(2)}</strong></td>
          </tr>
          <tr style="background: #f1f5f9;">
            <td><strong>Grand Total</strong></td>
            <td style="text-align: right;"><strong>₹${result.totalAmount.toFixed(2)}</strong></td>
          </tr>
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

  const exportToHTML = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>GST Calculator Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #0891b2; font-size: 24px; margin-bottom: 5px; }
          .gst-highlight { background: linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .gst-label { font-size: 11px; color: #0891b2; text-transform: uppercase; letter-spacing: 1px; }
          .gst-value { font-size: 32px; font-weight: bold; color: #0f172a; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        </style>
      </head>
      <body>
        <h1>GST Calculator Report</h1>
        <div class="gst-highlight">
          <div class="gst-label">Total Amount (with GST)</div>
          <div class="gst-value">₹${result.totalAmount.toFixed(2)}</div>
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
    link.download = `GST_Report_${amount}_${gstRate}pct.html`
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
            {/* Amount */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">
                  {isInclusive ? 'Total Amount (with GST)' : 'Base Amount (without GST)'}
                </label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  ₹{formatIndianNumber(amount)}
                </span>
              </div>
              <input
                type="range"
                min={100}
                max={10000000}
                step={100}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-cyan-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>₹100</span>
                <span>₹1Cr</span>
              </div>
            </div>

            {/* GST Rate */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">GST Rate</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  {gstRate}%
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {GST_RATES.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setGstRate(rate)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      gstRate === rate
                        ? 'bg-cyan-50 border-cyan-300 text-cyan-700 font-medium'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>

            {/* Inclusive/Exclusive Toggle */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsInclusive(false)}
                className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${
                  !isInclusive
                    ? 'bg-cyan-50 border-cyan-300 text-cyan-700 font-medium'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Add GST
              </button>
              <button
                onClick={() => setIsInclusive(true)}
                className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${
                  isInclusive
                    ? 'bg-cyan-50 border-cyan-300 text-cyan-700 font-medium'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Remove GST
              </button>
            </div>

            {/* Inter/Intra State Toggle */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsInterState(false)}
                className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${
                  !isInterState
                    ? 'bg-cyan-50 border-cyan-300 text-cyan-700 font-medium'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Intra-State
                <span className="block text-[10px] opacity-70">CGST + SGST</span>
              </button>
              <button
                onClick={() => setIsInterState(true)}
                className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${
                  isInterState
                    ? 'bg-cyan-50 border-cyan-300 text-cyan-700 font-medium'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Inter-State
                <span className="block text-[10px] opacity-70">IGST</span>
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="p-5 bg-slate-50">
            {/* Primary Result */}
            <div className="bg-cyan-50 rounded-lg p-4 text-center mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-600 mb-1">
                {isInclusive ? 'Base Amount' : 'Total Amount'}
              </div>
              <div className="font-mono text-3xl font-bold text-slate-900">
                ₹{formatIndianNumber(isInclusive ? result.originalAmount : result.totalAmount)}
              </div>
            </div>

            {/* GST Breakdown */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Base Amount</span>
                  <span className="font-mono font-semibold">₹{result.originalAmount.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-100 pt-3">
                  {isInterState ? (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">IGST @ {gstRate}%</span>
                      <span className="font-mono font-semibold text-cyan-600">₹{result.igst.toFixed(2)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span className="text-slate-600">CGST @ {gstRate/2}%</span>
                        <span className="font-mono font-semibold text-cyan-600">₹{result.cgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">SGST @ {gstRate/2}%</span>
                        <span className="font-mono font-semibold text-cyan-600">₹{result.sgst.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-slate-700">Total GST</span>
                    <span className="font-mono font-bold text-cyan-700">₹{result.gstAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Final Total */}
            <div className="bg-cyan-100 rounded-lg p-4 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-700 mb-1">
                Grand Total
              </div>
              <div className="font-mono text-2xl font-bold text-cyan-900">
                ₹{formatIndianNumber(result.totalAmount)}
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

      {/* GST Rate Categories */}
      <div className="bg-gradient-to-r from-cyan-50 to-transparent border border-cyan-100 rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-cyan-600 mb-2">
          <span>📋</span> GST Rate Categories
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-xs text-slate-600">
          <div className="flex gap-2">
            <span className="text-cyan-500 font-bold">0%</span>
            <span>Essential items, milk, fresh vegetables</span>
          </div>
          <div className="flex gap-2">
            <span className="text-cyan-500 font-bold">5%</span>
            <span>Packaged food, footwear (&lt;₹1000)</span>
          </div>
          <div className="flex gap-2">
            <span className="text-cyan-500 font-bold">12%</span>
            <span>Processed food, computers, mobiles</span>
          </div>
          <div className="flex gap-2">
            <span className="text-cyan-500 font-bold">18%</span>
            <span>Most services, electronics, restaurants</span>
          </div>
          <div className="flex gap-2">
            <span className="text-cyan-500 font-bold">28%</span>
            <span>Luxury items, cars, tobacco, AC</span>
          </div>
        </div>
      </div>

      {/* About Section */}
      <details className="bg-white border border-slate-200 rounded-xl">
        <summary className="px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
          About GST Calculator
        </summary>
        <div className="px-4 pb-4 text-sm text-slate-600 space-y-3">
          <p>
            <strong>GST (Goods and Services Tax)</strong> is an indirect tax levied on supply of goods
            and services in India. It replaced multiple cascading taxes.
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li><strong>CGST</strong> - Central GST (goes to Central Government)</li>
            <li><strong>SGST</strong> - State GST (goes to State Government)</li>
            <li><strong>IGST</strong> - Integrated GST (for inter-state transactions)</li>
          </ul>
          <p className="text-slate-500">
            For intra-state transactions, GST is split equally between CGST and SGST.
            For inter-state transactions, only IGST is applicable.
          </p>
        </div>
      </details>
    </div>
  )
})

export default GSTCalculator
