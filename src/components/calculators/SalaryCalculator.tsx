'use client'

import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

interface TaxSlabBreakdown {
  slab: string
  range: string
  rate: number
  taxableAmount: number
  tax: number
}

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
  taxableIncome: number
  slabBreakdown: TaxSlabBreakdown[]
  totalTaxBeforeCess: number
  cess: number
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

// Tax Regimes - FY 2024-25 (Static, as per Union Budget 2024)
// Source: Income Tax Department, India - https://incometaxindia.gov.in
type TaxRegime = 'new' | 'old'

const TAX_SLABS = {
  new: {
    name: 'New Regime',
    standardDeduction: 75000,
    slabs: [
      { min: 0, max: 300000, rate: 0, label: '0 - 3L', color: 'bg-emerald-500' },
      { min: 300000, max: 700000, rate: 5, label: '3L - 7L', color: 'bg-lime-500' },
      { min: 700000, max: 1000000, rate: 10, label: '7L - 10L', color: 'bg-yellow-500' },
      { min: 1000000, max: 1200000, rate: 15, label: '10L - 12L', color: 'bg-amber-500' },
      { min: 1200000, max: 1500000, rate: 20, label: '12L - 15L', color: 'bg-orange-500' },
      { min: 1500000, max: Infinity, rate: 30, label: '15L+', color: 'bg-red-500' },
    ],
    benefits: ['Lower tax rates', '₹75K standard deduction', 'Simpler filing'],
    limitations: ['No 80C/80D deductions', 'No HRA exemption', 'No LTA'],
  },
  old: {
    name: 'Old Regime',
    standardDeduction: 50000,
    slabs: [
      { min: 0, max: 250000, rate: 0, label: '0 - 2.5L', color: 'bg-emerald-500' },
      { min: 250000, max: 500000, rate: 5, label: '2.5L - 5L', color: 'bg-lime-500' },
      { min: 500000, max: 1000000, rate: 20, label: '5L - 10L', color: 'bg-amber-500' },
      { min: 1000000, max: Infinity, rate: 30, label: '10L+', color: 'bg-red-500' },
    ],
    benefits: ['80C up to ₹1.5L', '80D health insurance', 'HRA exemption', 'LTA, NPS benefits'],
    limitations: ['Higher base rates', 'Complex filing', 'More documentation'],
  },
}

// Calculate tax with slab breakdown
function calculateTaxWithBreakdown(
  taxableIncome: number,
  regime: TaxRegime
): {
  breakdown: TaxSlabBreakdown[]
  totalTax: number
  cess: number
} {
  const breakdown: TaxSlabBreakdown[] = []
  let totalTax = 0
  const slabs = TAX_SLABS[regime].slabs

  for (const slab of slabs) {
    if (taxableIncome <= slab.min) {
      breakdown.push({
        slab: slab.label,
        range: `₹${formatCompact(slab.min)} - ${slab.max === Infinity ? '∞' : '₹' + formatCompact(slab.max)}`,
        rate: slab.rate,
        taxableAmount: 0,
        tax: 0,
      })
    } else {
      const amountInSlab = Math.min(taxableIncome, slab.max) - slab.min
      const taxInSlab = amountInSlab * (slab.rate / 100)
      totalTax += taxInSlab

      breakdown.push({
        slab: slab.label,
        range: `₹${formatCompact(slab.min)} - ${slab.max === Infinity ? '∞' : '₹' + formatCompact(slab.max)}`,
        rate: slab.rate,
        taxableAmount: Math.round(amountInSlab),
        tax: Math.round(taxInSlab),
      })
    }
  }

  const cess = totalTax * 0.04

  return { breakdown, totalTax: Math.round(totalTax), cess: Math.round(cess) }
}

function calculateSalary(
  ctc: number,
  basicPercent: number,
  hraPercent: number,
  pfPercent: number,
  professionalTax: number,
  regime: TaxRegime
): SalaryResult {
  const monthlyGross = ctc / 12

  const basicSalary = monthlyGross * (basicPercent / 100)
  const hra = basicSalary * (hraPercent / 100)
  const pf = basicSalary * (pfPercent / 100)

  // Special allowance is the remainder
  const specialAllowance = monthlyGross - basicSalary - hra

  // Standard deduction based on regime
  const standardDeduction = TAX_SLABS[regime].standardDeduction
  const annualTaxableIncome = Math.max(0, ctc - (pf * 12) - standardDeduction)

  // Calculate tax with slab breakdown
  const { breakdown, totalTax, cess } = calculateTaxWithBreakdown(annualTaxableIncome, regime)
  const annualTax = totalTax + cess
  const incomeTax = annualTax / 12

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
    taxableIncome: Math.round(annualTaxableIncome),
    slabBreakdown: breakdown,
    totalTaxBeforeCess: totalTax,
    cess: cess,
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
  const [ctcInput, setCtcInput] = useState('12,00,000') // Raw input for editing
  const [isCtcFocused, setIsCtcFocused] = useState(false)
  const [basicPercent, setBasicPercent] = useState(40)
  const [hraPercent, setHraPercent] = useState(50)
  const [pfPercent, setPfPercent] = useState(12)
  const [professionalTax, setProfessionalTax] = useState(200)
  const [taxRegime, setTaxRegime] = useState<TaxRegime>('new')
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const calculatorRef = useRef<HTMLDivElement>(null)

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calc_salary')
    if (saved) {
      const data = JSON.parse(saved)
      const loadedCtc = data.ctc || 1200000
      setCtc(loadedCtc)
      setCtcInput(loadedCtc.toString())
      setBasicPercent(data.basicPercent || 40)
      setHraPercent(data.hraPercent || 50)
      setPfPercent(data.pfPercent || 12)
      setProfessionalTax(data.professionalTax || 200)
      setTaxRegime(data.taxRegime || 'new')
      setNotes(data.notes || '')
    }
    setIsLoaded(true)
  }, [])

  // Auto-save to localStorage
  useEffect(() => {
    if (!isLoaded) return
    const data = { ctc, basicPercent, hraPercent, pfPercent, professionalTax, taxRegime, notes }
    localStorage.setItem('calc_salary', JSON.stringify(data))
    setLastSaved(new Date().toLocaleTimeString())
  }, [ctc, basicPercent, hraPercent, pfPercent, professionalTax, taxRegime, notes, isLoaded])

  const handleClear = () => {
    setCtc(1200000)
    setCtcInput('1200000')
    setBasicPercent(40)
    setHraPercent(50)
    setPfPercent(12)
    setProfessionalTax(200)
    setTaxRegime('new')
    setNotes('')
    localStorage.removeItem('calc_salary')
  }

  const result = useMemo(
    () => calculateSalary(ctc, basicPercent, hraPercent, pfPercent, professionalTax, taxRegime),
    [ctc, basicPercent, hraPercent, pfPercent, professionalTax, taxRegime]
  )

  // Calculate comparison with other regime
  const otherRegime = taxRegime === 'new' ? 'old' : 'new'
  const otherResult = useMemo(
    () => calculateSalary(ctc, basicPercent, hraPercent, pfPercent, professionalTax, otherRegime),
    [ctc, basicPercent, hraPercent, pfPercent, professionalTax, otherRegime]
  )
  const taxSavings = otherResult.incomeTax * 12 - (result.totalTaxBeforeCess + result.cess)

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
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">₹</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={isCtcFocused ? ctcInput : formatIndianNumber(ctc)}
                    onChange={(e) => {
                      setCtcInput(e.target.value)
                      // Parse and update ctc in real-time
                      const val = Number(e.target.value.replace(/,/g, ''))
                      if (!isNaN(val) && val >= 0) {
                        setCtc(Math.min(val, 100000000)) // Cap at 10Cr for sanity
                      }
                    }}
                    onFocus={() => {
                      setIsCtcFocused(true)
                      setCtcInput(ctc.toString())
                    }}
                    onBlur={() => {
                      setIsCtcFocused(false)
                      // Clean up the input on blur
                      const val = Number(ctcInput.replace(/,/g, ''))
                      if (!isNaN(val) && val > 0) {
                        setCtc(Math.min(val, 100000000))
                      }
                    }}
                    className="font-mono text-base font-semibold text-slate-900 w-32 text-right bg-transparent border-b border-dashed border-slate-300 focus:border-orange-500 focus:outline-none"
                    placeholder="e.g. 3800000"
                  />
                </div>
              </div>
              <input
                type="range"
                min={300000}
                max={20000000}
                step={10000}
                value={Math.min(Math.max(ctc, 300000), 20000000)}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setCtc(val)
                  setCtcInput(val.toString())
                }}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-orange-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>₹3L</span>
                <span>₹2Cr</span>
              </div>
              {/* Quick CTC presets */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[1000000, 1500000, 2000000, 3000000, 5000000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => {
                      setCtc(amount)
                      setCtcInput(amount.toString())
                    }}
                    className={`px-2 py-1 text-[10px] rounded-full border transition-colors ${
                      ctc === amount
                        ? 'bg-orange-50 border-orange-300 text-orange-700'
                        : 'border-slate-200 text-slate-500 hover:border-orange-300'
                    }`}
                  >
                    {formatCompact(amount)}
                  </button>
                ))}
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

            {/* Tax Regime Toggle */}
            <div className="p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-600">Tax Regime</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded">FY 2024-25</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setTaxRegime('new')}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg border-2 transition-all ${
                    taxRegime === 'new'
                      ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  New Regime
                </button>
                <button
                  onClick={() => setTaxRegime('old')}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg border-2 transition-all ${
                    taxRegime === 'old'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
                  }`}
                >
                  Old Regime
                </button>
              </div>
              {/* Regime comparison hint */}
              {taxSavings !== 0 && (
                <div className={`mt-2 text-[10px] ${taxSavings > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                  {taxSavings > 0
                    ? `✓ Saving ₹${formatIndianNumber(Math.abs(taxSavings))}/year vs ${TAX_SLABS[otherRegime].name}`
                    : `${TAX_SLABS[otherRegime].name} saves ₹${formatIndianNumber(Math.abs(taxSavings))}/year`
                  }
                </div>
              )}
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

      {/* Tax Slab Breakdown - Visual Design */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Header with Regime Info */}
        <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">Tax Breakdown</span>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${
                taxRegime === 'new' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {TAX_SLABS[taxRegime].name}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">FY 2024-25 • Union Budget 2024</span>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Taxable Income Summary */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Taxable Income</div>
              <div className="font-mono text-xl font-bold text-slate-800">₹{formatIndianNumber(result.taxableIncome)}</div>
            </div>
            <div className="text-right text-[10px] text-slate-500">
              <div>CTC ₹{formatIndianNumber(result.annualCTC)}</div>
              <div>- PF ₹{formatIndianNumber(result.pf * 12)} - Std. ₹{formatIndianNumber(TAX_SLABS[taxRegime].standardDeduction)}</div>
            </div>
          </div>

          {/* ===== Compare Toggle at Top ===== */}
          <div className="flex items-center justify-end">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={`text-[10px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                showComparison
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}
            >
              {showComparison ? 'Hide Comparison' : 'Compare Regimes'}
            </button>
          </div>

          {/* ===== Tax Breakdown Visualization ===== */}
          {(() => {
            const otherRegimeKey = taxRegime === 'new' ? 'old' : 'new'
            const otherResult = calculateSalary(ctc, basicPercent, hraPercent, pfPercent, professionalTax, otherRegimeKey)
            const otherTax = otherResult.totalTaxBeforeCess + otherResult.cess
            const otherEffectiveRate = otherResult.taxableIncome > 0
              ? (otherTax / otherResult.taxableIncome * 100).toFixed(1)
              : '0'
            const currentTax = result.totalTaxBeforeCess + result.cess
            const currentEffectiveRate = result.taxableIncome > 0
              ? (currentTax / result.taxableIncome * 100).toFixed(1)
              : '0'
            const diff = otherTax - currentTax
            const isBetter = diff > 0
            const savings = Math.abs(diff)

            return (
              <>
                {/* ===== Bar 1: Current Regime ===== */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold ${taxRegime === 'new' ? 'text-blue-700' : 'text-amber-700'}`}>
                      {taxRegime === 'new' ? 'NEW REGIME' : 'OLD REGIME'}
                    </span>
                    <span className={`text-[8px] px-2 py-0.5 rounded-full ${
                      taxRegime === 'new' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      Selected
                    </span>
                  </div>

                  {/* The main segmented bar */}
                  <div className="h-12 flex rounded-lg overflow-hidden shadow-inner border border-slate-200">
                    {TAX_SLABS[taxRegime].slabs.map((slab, index) => {
                      const slabData = result.slabBreakdown[index]
                      const percentage = result.taxableIncome > 0
                        ? (slabData.taxableAmount / result.taxableIncome) * 100
                        : 0
                      if (percentage === 0) return null
                      return (
                        <div
                          key={index}
                          className={`${slab.color} flex flex-col items-center justify-center transition-all relative group`}
                          style={{ width: `${percentage}%` }}
                        >
                          <span className="text-[10px] font-bold text-white drop-shadow">{slab.label}</span>
                          <span className="text-[8px] text-white/80">{formatCompact(slabData.taxableAmount)}</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Labels below the bar */}
                  <div className="flex mt-2">
                    {TAX_SLABS[taxRegime].slabs.map((slab, index) => {
                      const slabData = result.slabBreakdown[index]
                      const percentage = result.taxableIncome > 0
                        ? (slabData.taxableAmount / result.taxableIncome) * 100
                        : 0
                      if (percentage === 0) return null
                      return (
                        <div
                          key={index}
                          className="flex flex-col items-center justify-start text-center"
                          style={{ width: `${percentage}%` }}
                        >
                          <div className={`text-[9px] font-medium ${slab.rate === 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                            {slab.rate}%
                          </div>
                          <div className={`text-[10px] font-bold ${slab.rate === 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            ₹{formatIndianNumber(slabData.tax)}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Tax breakdown note */}
                  <div className="text-[9px] text-slate-400 mt-2 pt-2 border-t border-slate-200">
                    Tax ₹{formatIndianNumber(result.totalTaxBeforeCess)} + 4% Cess ₹{formatIndianNumber(result.cess)}
                  </div>
                </div>

                {/* ===== Stats Boxes (Between Bars) ===== */}
                <div className={`flex ${showComparison ? 'justify-between' : 'justify-start'} gap-4`}>
                  {/* Current regime stats - left aligned */}
                  <div className={`rounded-r-xl border-r-4 ${
                    taxRegime === 'new' ? 'border-r-blue-500 bg-blue-50' : 'border-r-amber-500 bg-amber-50'
                  } p-3 space-y-2 min-w-[140px]`}>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[9px] text-slate-500">Total Tax</span>
                      <span className="text-[11px] font-bold text-slate-700">₹{formatIndianNumber(currentTax)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[9px] text-slate-500">Eff. Rate</span>
                      <span className={`text-[11px] font-bold ${taxRegime === 'new' ? 'text-blue-600' : 'text-amber-600'}`}>
                        {currentEffectiveRate}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[9px] text-slate-500">Take Home</span>
                      <span className="text-[11px] font-bold text-emerald-600">₹{formatIndianNumber(result.netSalary)}</span>
                    </div>
                  </div>

                  {/* Alternative regime stats - right aligned (only when comparison is on) */}
                  {showComparison && (
                    <div className={`rounded-l-xl border-l-4 ${
                      otherRegimeKey === 'new' ? 'border-l-blue-400 bg-blue-50' : 'border-l-amber-400 bg-amber-50'
                    } p-3 space-y-2 min-w-[140px]`}>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[9px] text-slate-500">Total Tax</span>
                        <span className="text-[11px] font-bold text-slate-700">₹{formatIndianNumber(otherTax)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[9px] text-slate-500">Eff. Rate</span>
                        <span className={`text-[11px] font-bold ${otherRegimeKey === 'new' ? 'text-blue-600' : 'text-amber-600'}`}>
                          {otherEffectiveRate}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[9px] text-slate-500">Take Home</span>
                        <span className="text-[11px] font-bold text-emerald-600">₹{formatIndianNumber(otherResult.netSalary)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ===== Bar 2: Alternative Regime (only when comparison is on) ===== */}
                {showComparison && (
                  <>
                    <div className={`rounded-xl p-4 ${otherRegimeKey === 'new' ? 'bg-blue-50/50' : 'bg-amber-50/50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold ${otherRegimeKey === 'new' ? 'text-blue-700' : 'text-amber-700'}`}>
                          {otherRegimeKey === 'new' ? 'NEW REGIME' : 'OLD REGIME'}
                        </span>
                        <span className={`text-[8px] px-2 py-0.5 rounded-full ${
                          otherRegimeKey === 'new' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                          Alternative
                        </span>
                      </div>

                      {/* Full bar */}
                      <div className="h-12 flex rounded-lg overflow-hidden shadow-inner border border-slate-200">
                        {TAX_SLABS[otherRegimeKey].slabs.map((slab, index) => {
                          const slabData = otherResult.slabBreakdown[index]
                          const percentage = otherResult.taxableIncome > 0
                            ? (slabData.taxableAmount / otherResult.taxableIncome) * 100
                            : 0
                          if (percentage === 0) return null
                          return (
                            <div
                              key={index}
                              className={`${slab.color} flex flex-col items-center justify-center`}
                              style={{ width: `${percentage}%` }}
                            >
                              <span className="text-[10px] font-bold text-white drop-shadow">{slab.label}</span>
                              <span className="text-[8px] text-white/80">{formatCompact(slabData.taxableAmount)}</span>
                            </div>
                          )
                        })}
                      </div>

                      {/* Labels below the bar */}
                      <div className="flex mt-2">
                        {TAX_SLABS[otherRegimeKey].slabs.map((slab, index) => {
                          const slabData = otherResult.slabBreakdown[index]
                          const percentage = otherResult.taxableIncome > 0
                            ? (slabData.taxableAmount / otherResult.taxableIncome) * 100
                            : 0
                          if (percentage === 0) return null
                          return (
                            <div
                              key={index}
                              className="flex flex-col items-center justify-start text-center"
                              style={{ width: `${percentage}%` }}
                            >
                              <div className={`text-[9px] font-medium ${slab.rate === 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                {slab.rate}%
                              </div>
                              <div className={`text-[10px] font-bold ${slab.rate === 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                ₹{formatIndianNumber(slabData.tax)}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Tax breakdown note */}
                      <div className="text-[9px] text-slate-400 mt-2 pt-2 border-t border-slate-200">
                        Tax ₹{formatIndianNumber(otherResult.totalTaxBeforeCess)} + 4% Cess ₹{formatIndianNumber(otherResult.cess)}
                      </div>
                    </div>

                    {/* Savings indicator */}
                    {savings > 0 && (
                      <div className={`flex items-center justify-center gap-2 p-3 rounded-lg ${
                        isBetter
                          ? (taxRegime === 'new' ? 'bg-blue-100' : 'bg-amber-100')
                          : (otherRegimeKey === 'new' ? 'bg-blue-100' : 'bg-amber-100')
                      }`}>
                        <span className="text-lg">{isBetter ? '✓' : '💡'}</span>
                        <span className={`text-xs font-medium ${
                          isBetter
                            ? (taxRegime === 'new' ? 'text-blue-700' : 'text-amber-700')
                            : (otherRegimeKey === 'new' ? 'text-blue-700' : 'text-amber-700')
                        }`}>
                          {isBetter ? (
                            <>
                              <strong>{taxRegime === 'new' ? 'New Regime' : 'Old Regime'}</strong> (current) saves you{' '}
                              <span className="font-bold">₹{formatIndianNumber(savings)}/year</span>
                            </>
                          ) : (
                            <>
                              Switch to <strong>{otherRegimeKey === 'new' ? 'New Regime' : 'Old Regime'}</strong> to save{' '}
                          <span className="font-bold">₹{formatIndianNumber(savings)}/year</span>
                            </>
                          )}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </>
            )
          })()}
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
