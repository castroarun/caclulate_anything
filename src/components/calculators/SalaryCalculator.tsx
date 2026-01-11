'use client'

import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

interface SalaryResult {
  grossSalary: number
  basicSalary: number
  hra: number
  specialAllowance: number
  pf: number
  professionalTax: number
  incomeTax: number
  netSalary: number
  annualCTC: number
  annualNet: number
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

function calculateSalary(
  ctc: number,
  basicPercent: number,
  hraPercent: number,
  pfPercent: number,
  professionalTax: number,
  estimatedTaxRate: number
): SalaryResult {
  const monthlyGross = ctc / 12

  const basicSalary = monthlyGross * (basicPercent / 100)
  const hra = basicSalary * (hraPercent / 100)
  const pf = basicSalary * (pfPercent / 100)

  // Special allowance is the remainder
  const specialAllowance = monthlyGross - basicSalary - hra

  // Estimated monthly income tax
  const annualTaxableIncome = ctc - (pf * 12) - 50000 // Standard deduction
  const annualTax = annualTaxableIncome * (estimatedTaxRate / 100)
  const incomeTax = Math.max(0, annualTax / 12)

  // Deductions
  const totalDeductions = pf + professionalTax + incomeTax

  const netSalary = monthlyGross - totalDeductions

  return {
    grossSalary: Math.round(monthlyGross),
    basicSalary: Math.round(basicSalary),
    hra: Math.round(hra),
    specialAllowance: Math.round(specialAllowance),
    pf: Math.round(pf),
    professionalTax: Math.round(professionalTax),
    incomeTax: Math.round(incomeTax),
    netSalary: Math.round(netSalary),
    annualCTC: ctc,
    annualNet: Math.round(netSalary * 12),
  }
}

export interface SalaryCalculatorRef {
  exportToPDF: () => void
  exportToHTML: () => void
  exportToExcel: () => void
  handleClear: () => void
}

const SalaryCalculator = forwardRef<SalaryCalculatorRef>(function SalaryCalculator(props, ref) {
  const [ctc, setCtc] = useState(1200000)
  const [basicPercent, setBasicPercent] = useState(40)
  const [hraPercent, setHraPercent] = useState(50)
  const [pfPercent, setPfPercent] = useState(12)
  const [professionalTax, setProfessionalTax] = useState(200)
  const [estimatedTaxRate, setEstimatedTaxRate] = useState(10)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const calculatorRef = useRef<HTMLDivElement>(null)

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calc_salary')
    if (saved) {
      const data = JSON.parse(saved)
      setCtc(data.ctc || 1200000)
      setBasicPercent(data.basicPercent || 40)
      setHraPercent(data.hraPercent || 50)
      setPfPercent(data.pfPercent || 12)
      setProfessionalTax(data.professionalTax || 200)
      setEstimatedTaxRate(data.estimatedTaxRate || 10)
      setNotes(data.notes || '')
    }
    setIsLoaded(true)
  }, [])

  // Auto-save to localStorage
  useEffect(() => {
    if (!isLoaded) return
    const data = { ctc, basicPercent, hraPercent, pfPercent, professionalTax, estimatedTaxRate, notes }
    localStorage.setItem('calc_salary', JSON.stringify(data))
    setLastSaved(new Date().toLocaleTimeString())
  }, [ctc, basicPercent, hraPercent, pfPercent, professionalTax, estimatedTaxRate, notes, isLoaded])

  const handleClear = () => {
    setCtc(1200000)
    setBasicPercent(40)
    setHraPercent(50)
    setPfPercent(12)
    setProfessionalTax(200)
    setEstimatedTaxRate(10)
    setNotes('')
    localStorage.removeItem('calc_salary')
  }

  const result = useMemo(
    () => calculateSalary(ctc, basicPercent, hraPercent, pfPercent, professionalTax, estimatedTaxRate),
    [ctc, basicPercent, hraPercent, pfPercent, professionalTax, estimatedTaxRate]
  )

  // Export functions
  const exportToExcel = () => {
    const csvContent = [
      `Salary Breakdown Calculator`,
      `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`,
      ``,
      `ANNUAL`,
      `CTC: ₹${formatIndianNumber(ctc)}`,
      `Annual Net Salary: ₹${formatIndianNumber(result.annualNet)}`,
      ``,
      `MONTHLY BREAKDOWN`,
      `Gross Salary: ₹${formatIndianNumber(result.grossSalary)}`,
      ``,
      `EARNINGS`,
      `Basic Salary: ₹${formatIndianNumber(result.basicSalary)}`,
      `HRA: ₹${formatIndianNumber(result.hra)}`,
      `Special Allowance: ₹${formatIndianNumber(result.specialAllowance)}`,
      ``,
      `DEDUCTIONS`,
      `PF (Employee): ₹${formatIndianNumber(result.pf)}`,
      `Professional Tax: ₹${formatIndianNumber(result.professionalTax)}`,
      `Income Tax (Est.): ₹${formatIndianNumber(result.incomeTax)}`,
      ``,
      `NET SALARY`,
      `Take Home: ₹${formatIndianNumber(result.netSalary)}`,
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Salary_Breakdown_${ctc}.csv`
    link.click()
  }

  const exportToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salary Breakdown Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #ea580c; font-size: 24px; margin-bottom: 5px; }
          h2 { font-size: 16px; margin-top: 25px; margin-bottom: 15px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .highlight { background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .highlight-label { font-size: 11px; color: #ea580c; text-transform: uppercase; letter-spacing: 1px; }
          .highlight-value { font-size: 32px; font-weight: bold; color: #0f172a; }
          .breakdown-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .breakdown-table th, .breakdown-table td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          .breakdown-table th { background: #f1f5f9; font-weight: 600; }
          .earnings { color: #16a34a; }
          .deductions { color: #dc2626; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <h1>Salary Breakdown Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="highlight">
          <div class="highlight-label">Monthly Take Home</div>
          <div class="highlight-value">₹${formatIndianNumber(result.netSalary)}</div>
          <p style="font-size: 12px; color: #ea580c; margin-top: 5px;">Annual: ₹${formatIndianNumber(result.annualNet)}</p>
        </div>

        <h2>Monthly Breakdown</h2>
        <table class="breakdown-table">
          <tr>
            <th>Component</th>
            <th style="text-align: right;">Amount</th>
          </tr>
          <tr>
            <td><strong>Gross Salary</strong></td>
            <td style="text-align: right;"><strong>₹${formatIndianNumber(result.grossSalary)}</strong></td>
          </tr>
          <tr>
            <td colspan="2" style="background: #f1f5f9; font-weight: 600;">Earnings</td>
          </tr>
          <tr>
            <td>Basic Salary</td>
            <td style="text-align: right;" class="earnings">₹${formatIndianNumber(result.basicSalary)}</td>
          </tr>
          <tr>
            <td>HRA</td>
            <td style="text-align: right;" class="earnings">₹${formatIndianNumber(result.hra)}</td>
          </tr>
          <tr>
            <td>Special Allowance</td>
            <td style="text-align: right;" class="earnings">₹${formatIndianNumber(result.specialAllowance)}</td>
          </tr>
          <tr>
            <td colspan="2" style="background: #f1f5f9; font-weight: 600;">Deductions</td>
          </tr>
          <tr>
            <td>PF (Employee)</td>
            <td style="text-align: right;" class="deductions">-₹${formatIndianNumber(result.pf)}</td>
          </tr>
          <tr>
            <td>Professional Tax</td>
            <td style="text-align: right;" class="deductions">-₹${formatIndianNumber(result.professionalTax)}</td>
          </tr>
          <tr>
            <td>Income Tax (Est.)</td>
            <td style="text-align: right;" class="deductions">-₹${formatIndianNumber(result.incomeTax)}</td>
          </tr>
          <tr style="background: #ffedd5;">
            <td><strong>Net Salary</strong></td>
            <td style="text-align: right;"><strong>₹${formatIndianNumber(result.netSalary)}</strong></td>
          </tr>
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
        <title>Salary Breakdown</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #ea580c; }
          .highlight { background: #ffedd5; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <h1>Salary Breakdown</h1>
        <div class="highlight">
          <h3>Monthly Take Home: ₹${formatIndianNumber(result.netSalary)}</h3>
          <p>Annual CTC: ₹${formatIndianNumber(ctc)}</p>
        </div>
        <div class="footer">Generated by Calci</div>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Salary_Breakdown_${ctc}.html`
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
            {/* Annual CTC */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Annual CTC</label>
                <span className="font-mono text-base font-semibold text-slate-900">
                  ₹{formatIndianNumber(ctc)}
                </span>
              </div>
              <input
                type="range"
                min={300000}
                max={50000000}
                step={10000}
                value={ctc}
                onChange={(e) => setCtc(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-orange-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>₹3L</span>
                <span>₹5Cr</span>
              </div>
            </div>

            {/* Basic % */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Basic Salary %</label>
                <span className="font-mono text-sm font-semibold text-slate-900">
                  {basicPercent}%
                </span>
              </div>
              <input
                type="range"
                min={30}
                max={60}
                step={5}
                value={basicPercent}
                onChange={(e) => setBasicPercent(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-orange-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>30%</span>
                <span>60%</span>
              </div>
            </div>

            {/* HRA % */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">HRA % of Basic</label>
                <span className="font-mono text-sm font-semibold text-slate-900">
                  {hraPercent}%
                </span>
              </div>
              <input
                type="range"
                min={30}
                max={100}
                step={5}
                value={hraPercent}
                onChange={(e) => setHraPercent(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-orange-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>30%</span>
                <span>100%</span>
              </div>
            </div>

            {/* PF % */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">PF % of Basic</label>
                <span className="font-mono text-sm font-semibold text-slate-900">
                  {pfPercent}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={12}
                step={1}
                value={pfPercent}
                onChange={(e) => setPfPercent(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-orange-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>0%</span>
                <span>12%</span>
              </div>
            </div>

            {/* Estimated Tax Rate */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Estimated Tax Rate</label>
                <span className="font-mono text-sm font-semibold text-slate-900">
                  {estimatedTaxRate}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={estimatedTaxRate}
                onChange={(e) => setEstimatedTaxRate(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-orange-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>0%</span>
                <span>30%</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="p-5 bg-slate-50">
            {/* Primary Result */}
            <div className="bg-orange-50 rounded-lg p-4 text-center mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-orange-600 mb-1">
                Monthly Take Home
              </div>
              <div className="font-mono text-3xl font-bold text-slate-900">
                ₹{formatIndianNumber(result.netSalary)}
              </div>
              <div className="text-xs text-orange-600 mt-1">
                Annual: ₹{formatIndianNumber(result.annualNet)}
              </div>
            </div>

            {/* Breakdown */}
            <div className="bg-white rounded-lg p-4 space-y-3">
              <div className="text-xs font-semibold text-slate-700 border-b pb-2">Earnings</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Basic Salary</span>
                  <span className="font-mono text-green-600">₹{formatIndianNumber(result.basicSalary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">HRA</span>
                  <span className="font-mono text-green-600">₹{formatIndianNumber(result.hra)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Special Allowance</span>
                  <span className="font-mono text-green-600">₹{formatIndianNumber(result.specialAllowance)}</span>
                </div>
              </div>

              <div className="text-xs font-semibold text-slate-700 border-b pb-2 pt-2">Deductions</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">PF (Employee)</span>
                  <span className="font-mono text-red-600">-₹{formatIndianNumber(result.pf)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Professional Tax</span>
                  <span className="font-mono text-red-600">-₹{formatIndianNumber(result.professionalTax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Income Tax (Est.)</span>
                  <span className="font-mono text-red-600">-₹{formatIndianNumber(result.incomeTax)}</span>
                </div>
              </div>

              <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                <span className="text-slate-700">Net Salary</span>
                <span className="font-mono text-orange-600">₹{formatIndianNumber(result.netSalary)}</span>
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
                  ? 'text-orange-600 bg-orange-50 hover:bg-orange-100'
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
                className="w-full h-16 p-2 text-xs text-slate-600 bg-white border border-slate-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* About Section */}
      <details className="bg-white border border-slate-200 rounded-xl">
        <summary className="px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
          About Salary Calculator
        </summary>
        <div className="px-4 pb-4 text-sm text-slate-600 space-y-3">
          <p>
            This calculator helps you understand your <strong>CTC to Take-Home salary</strong> breakdown.
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li><strong>Basic:</strong> Usually 40-50% of CTC, affects PF and gratuity</li>
            <li><strong>HRA:</strong> Usually 40-50% of Basic, tax exemption available</li>
            <li><strong>PF:</strong> 12% of Basic (both employee and employer)</li>
            <li><strong>Professional Tax:</strong> Varies by state (max ₹2,500/year)</li>
          </ul>
        </div>
      </details>
    </div>
  )
})

export default SalaryCalculator
