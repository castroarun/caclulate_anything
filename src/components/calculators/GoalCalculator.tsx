'use client'

import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

interface GoalResult {
  targetAmount: number
  currentSavings: number
  timeYears: number
  expectedReturn: number
  amountNeeded: number
  monthlySIP: number
  lumpsumRequired: number
  totalInvestment: number
  wealthGained: number
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

// Calculate required monthly SIP to reach goal
function calculateGoal(
  targetAmount: number,
  currentSavings: number,
  timeYears: number,
  expectedReturn: number
): GoalResult {
  const monthlyRate = expectedReturn / 12 / 100
  const months = timeYears * 12

  // Future value of current savings
  const fvCurrentSavings = currentSavings * Math.pow(1 + expectedReturn / 100, timeYears)

  // Amount still needed after current savings grow
  const amountNeeded = Math.max(0, targetAmount - fvCurrentSavings)

  // Required monthly SIP using formula: PMT = FV * r / ((1+r)^n - 1) / (1+r)
  let monthlySIP = 0
  if (amountNeeded > 0 && monthlyRate > 0) {
    monthlySIP = amountNeeded * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1) / (1 + monthlyRate)
  } else if (amountNeeded > 0) {
    monthlySIP = amountNeeded / months
  }

  // Lumpsum required today to reach goal
  const lumpsumRequired = amountNeeded / Math.pow(1 + expectedReturn / 100, timeYears)

  const totalInvestment = currentSavings + (monthlySIP * months)
  const wealthGained = targetAmount - totalInvestment

  return {
    targetAmount,
    currentSavings,
    timeYears,
    expectedReturn,
    amountNeeded: Math.round(amountNeeded),
    monthlySIP: Math.round(monthlySIP),
    lumpsumRequired: Math.round(lumpsumRequired),
    totalInvestment: Math.round(totalInvestment),
    wealthGained: Math.round(wealthGained),
  }
}

export interface GoalCalculatorRef {
  exportToPDF: () => void
  exportToHTML: () => void
  exportToExcel: () => void
  handleClear: () => void
}

const PRESET_GOALS = [
  { name: 'Emergency Fund', amount: 500000, years: 2 },
  { name: 'Car', amount: 1000000, years: 3 },
  { name: 'Home Down Payment', amount: 2500000, years: 5 },
  { name: 'Child Education', amount: 5000000, years: 15 },
  { name: 'Retirement', amount: 50000000, years: 25 },
]

const GoalCalculator = forwardRef<GoalCalculatorRef>(function GoalCalculator(props, ref) {
  const [goalName, setGoalName] = useState('Financial Goal')
  const [targetAmount, setTargetAmount] = useState(5000000)
  const [currentSavings, setCurrentSavings] = useState(100000)
  const [timeYears, setTimeYears] = useState(10)
  const [expectedReturn, setExpectedReturn] = useState(12)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const calculatorRef = useRef<HTMLDivElement>(null)

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calc_goal')
    if (saved) {
      const data = JSON.parse(saved)
      setGoalName(data.goalName || 'Financial Goal')
      setTargetAmount(data.targetAmount || 5000000)
      setCurrentSavings(data.currentSavings || 100000)
      setTimeYears(data.timeYears || 10)
      setExpectedReturn(data.expectedReturn || 12)
      setNotes(data.notes || '')
    }
    setIsLoaded(true)
  }, [])

  // Auto-save to localStorage
  useEffect(() => {
    if (!isLoaded) return
    const data = { goalName, targetAmount, currentSavings, timeYears, expectedReturn, notes }
    localStorage.setItem('calc_goal', JSON.stringify(data))
    setLastSaved(new Date().toLocaleTimeString())
  }, [goalName, targetAmount, currentSavings, timeYears, expectedReturn, notes, isLoaded])

  const handleClear = () => {
    setGoalName('Financial Goal')
    setTargetAmount(5000000)
    setCurrentSavings(100000)
    setTimeYears(10)
    setExpectedReturn(12)
    setNotes('')
    localStorage.removeItem('calc_goal')
  }

  const applyPreset = (preset: typeof PRESET_GOALS[0]) => {
    setGoalName(preset.name)
    setTargetAmount(preset.amount)
    setTimeYears(preset.years)
  }

  const result = useMemo(
    () => calculateGoal(targetAmount, currentSavings, timeYears, expectedReturn),
    [targetAmount, currentSavings, timeYears, expectedReturn]
  )

  // Export functions
  const exportToExcel = () => {
    const csvContent = [
      `Goal Planner - ${goalName}`,
      `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`,
      ``,
      `GOAL DETAILS`,
      `Goal Name: ${goalName}`,
      `Target Amount: ₹${formatIndianNumber(targetAmount)}`,
      `Current Savings: ₹${formatIndianNumber(currentSavings)}`,
      `Time Horizon: ${timeYears} years`,
      `Expected Return: ${expectedReturn}%`,
      ``,
      `INVESTMENT REQUIRED`,
      `Monthly SIP Required: ₹${formatIndianNumber(result.monthlySIP)}`,
      `OR Lumpsum Today: ₹${formatIndianNumber(result.lumpsumRequired)}`,
      ``,
      `SUMMARY`,
      `Total Investment: ₹${formatIndianNumber(result.totalInvestment)}`,
      `Wealth Gained: ₹${formatIndianNumber(result.wealthGained)}`,
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Goal_${goalName.replace(/\s+/g, '_')}.csv`
    link.click()
  }

  const exportToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Goal Planner - ${goalName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #ec4899; font-size: 24px; margin-bottom: 5px; }
          h2 { font-size: 16px; margin-top: 25px; margin-bottom: 15px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .highlight { background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .highlight-label { font-size: 11px; color: #ec4899; text-transform: uppercase; letter-spacing: 1px; }
          .highlight-value { font-size: 32px; font-weight: bold; color: #0f172a; }
          .options { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
          .option-box { padding: 20px; border-radius: 12px; text-align: center; background: #f8fafc; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <h1>Goal Planner: ${goalName}</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="highlight">
          <div class="highlight-label">Target Amount</div>
          <div class="highlight-value">₹${formatIndianNumber(targetAmount)}</div>
          <p style="font-size: 12px; color: #ec4899; margin-top: 5px;">in ${timeYears} years</p>
        </div>

        <h2>Investment Options</h2>
        <div class="options">
          <div class="option-box">
            <div style="font-size: 11px; color: #ec4899; text-transform: uppercase;">Monthly SIP</div>
            <div style="font-size: 28px; font-weight: bold; color: #0f172a;">₹${formatIndianNumber(result.monthlySIP)}</div>
            <p style="font-size: 11px; color: #64748b;">per month for ${timeYears} years</p>
          </div>
          <div class="option-box">
            <div style="font-size: 11px; color: #ec4899; text-transform: uppercase;">Lumpsum Today</div>
            <div style="font-size: 28px; font-weight: bold; color: #0f172a;">₹${formatIndianNumber(result.lumpsumRequired)}</div>
            <p style="font-size: 11px; color: #64748b;">one-time investment</p>
          </div>
        </div>

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
        <title>Goal Planner - ${goalName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #ec4899; }
          .highlight { background: #fce7f3; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <h1>Goal: ${goalName}</h1>
        <div class="highlight">
          <h2>Target: ₹${formatIndianNumber(targetAmount)}</h2>
          <p>Monthly SIP: ₹${formatIndianNumber(result.monthlySIP)}</p>
        </div>
        <div class="footer">Generated by Calci</div>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Goal_${goalName.replace(/\s+/g, '_')}.html`
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
      {/* Preset Goals */}
      <div className="flex flex-wrap gap-2">
        {PRESET_GOALS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => applyPreset(preset)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              goalName === preset.name
                ? 'bg-pink-50 border-pink-300 text-pink-700 font-medium'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Main Calculator Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid md:grid-cols-2">
          {/* Inputs */}
          <div className="p-5 space-y-4 border-r border-slate-100">
            {/* Goal Name */}
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-2">Goal Name</label>
              <input
                type="text"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="e.g., Child Education"
              />
            </div>

            {/* Target Amount */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Target Amount</label>
                <span className="font-mono text-base font-semibold text-slate-900">
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
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-pink-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>₹1L</span>
                <span>₹10Cr</span>
              </div>
            </div>

            {/* Current Savings */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Current Savings</label>
                <span className="font-mono text-sm font-semibold text-slate-900">
                  ₹{formatIndianNumber(currentSavings)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={targetAmount / 2}
                step={10000}
                value={currentSavings}
                onChange={(e) => setCurrentSavings(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-pink-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>₹0</span>
                <span>{formatCompact(targetAmount / 2)}</span>
              </div>
            </div>

            {/* Time Horizon */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Time Horizon</label>
                <span className="font-mono text-sm font-semibold text-slate-900">
                  {timeYears} years
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={timeYears}
                onChange={(e) => setTimeYears(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-pink-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>1 yr</span>
                <span>30 yrs</span>
              </div>
            </div>

            {/* Expected Return */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Expected Return</label>
                <span className="font-mono text-sm font-semibold text-slate-900">
                  {expectedReturn}% p.a.
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={20}
                step={0.5}
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-pink-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>5%</span>
                <span>20%</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="p-5 bg-slate-50">
            {/* Target Display */}
            <div className="bg-pink-50 rounded-lg p-4 text-center mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-pink-600 mb-1">
                {goalName}
              </div>
              <div className="font-mono text-2xl font-bold text-slate-900">
                ₹{formatIndianNumber(targetAmount)}
              </div>
              <div className="text-xs text-pink-600 mt-1">
                in {timeYears} years
              </div>
            </div>

            {/* Investment Options */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white rounded-lg p-4 text-center border-2 border-pink-200">
                <div className="text-[9px] uppercase tracking-wide text-pink-600 mb-1">
                  Monthly SIP
                </div>
                <div className="font-mono text-lg font-bold text-slate-900">
                  ₹{formatIndianNumber(result.monthlySIP)}
                </div>
                <div className="text-[9px] text-slate-500 mt-1">
                  for {timeYears * 12} months
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border border-slate-200">
                <div className="text-[9px] uppercase tracking-wide text-slate-500 mb-1">
                  OR Lumpsum
                </div>
                <div className="font-mono text-lg font-bold text-slate-900">
                  ₹{formatIndianNumber(result.lumpsumRequired)}
                </div>
                <div className="text-[9px] text-slate-500 mt-1">
                  one-time today
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-lg p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Current Savings</span>
                <span className="font-mono font-medium">{formatCompact(currentSavings)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Investment (SIP)</span>
                <span className="font-mono font-medium">{formatCompact(result.totalInvestment)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2">
                <span className="text-slate-700 font-medium">Wealth Gained</span>
                <span className="font-mono font-semibold text-green-600">{formatCompact(result.wealthGained)}</span>
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
                  ? 'text-pink-600 bg-pink-50 hover:bg-pink-100'
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
                className="w-full h-16 p-2 text-xs text-slate-600 bg-white border border-slate-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-pink-400 focus:border-pink-400"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* About Section */}
      <details className="bg-white border border-slate-200 rounded-xl">
        <summary className="px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
          About Goal Planner
        </summary>
        <div className="px-4 pb-4 text-sm text-slate-600 space-y-3">
          <p>
            The Goal Planner helps you calculate how much you need to invest monthly or as a lumpsum
            to reach your financial goals.
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li>Set realistic timeframes for your goals</li>
            <li>Expected returns depend on investment type (FD: 6-7%, Equity: 10-15%)</li>
            <li>Start early to benefit from compounding</li>
            <li>Review and adjust your goals periodically</li>
          </ul>
        </div>
      </details>
    </div>
  )
})

export default GoalCalculator
