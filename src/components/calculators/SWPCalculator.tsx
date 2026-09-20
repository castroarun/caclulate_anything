'use client'

import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { EditableValue } from '@/components/calculator/EditableValue'
import { AmountSlider, AmountRange } from '@/components/calculator/AmountSlider'

// Narrow bands keep the withdrawal slider easy to land on a round number
const WITHDRAWAL_RANGES: AmountRange[] = [
  { label: 'Up to ₹1L', intlLabel: 'Up to 100K', min: 5000, max: 100000, step: 1000, minLabel: '₹5K', maxLabel: '₹1L' },
  { label: '₹1L – ₹5L', intlLabel: '100K – 500K', min: 100000, max: 500000, step: 5000, minLabel: '₹1L', maxLabel: '₹5L' },
  { label: '₹5L – ₹25L', intlLabel: '500K – 2.5M', min: 500000, max: 2500000, step: 25000, minLabel: '₹5L', maxLabel: '₹25L' },
]

interface SWPYear {
  year: number
  opening: number
  growth: number
  withdrawn: number
  closing: number
}

interface SWPResult {
  corpusAtStart: number
  totalWithdrawn: number
  totalGrowth: number
  finalBalance: number
  // Number of withdrawal months paid in full before the money ran out; null if it lasted
  depletedAfterMonths: number | null
  sustainableWithdrawal: number
  lastMonthlyWithdrawal: number
  yearly: SWPYear[]
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

function formatMonths(months: number): string {
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${m} month${m === 1 ? '' : 's'}`
  return `${y} yr${y === 1 ? '' : 's'}${m > 0 ? ` ${m} mo` : ''}`
}

// Month-by-month: corpus grows every month; withdrawals start only after the waiting period
function calculateSWP(
  investment: number,
  annualRate: number,
  monthlyWithdrawal: number,
  waitingMonths: number,
  withdrawalYears: number,
  stepUpPercent: number
): SWPResult {
  const monthlyRate = annualRate / 12 / 100
  const totalMonths = waitingMonths + withdrawalYears * 12
  const yearly: SWPYear[] = []

  let balance = investment
  let corpusAtStart = investment
  let totalWithdrawn = 0
  let totalGrowth = 0
  let depletedAfterMonths: number | null = null
  let currentWithdrawal = monthlyWithdrawal
  let lastPaidWithdrawal = monthlyWithdrawal

  let yearOpening = balance
  let yearGrowth = 0
  let yearWithdrawn = 0

  for (let month = 1; month <= totalMonths; month++) {
    const growth = balance * monthlyRate
    balance += growth
    totalGrowth += growth
    yearGrowth += growth

    if (month === waitingMonths) corpusAtStart = balance

    // Step-up: raise the withdrawal once every 12 months of SWP
    const swpMonth = month - waitingMonths
    if (swpMonth > 1 && (swpMonth - 1) % 12 === 0) {
      currentWithdrawal = currentWithdrawal * (1 + stepUpPercent / 100)
    }

    if (month > waitingMonths && balance > 0) {
      const withdrawal = Math.min(currentWithdrawal, balance)
      balance -= withdrawal
      totalWithdrawn += withdrawal
      yearWithdrawn += withdrawal
      if (withdrawal === currentWithdrawal) lastPaidWithdrawal = currentWithdrawal
      if (withdrawal < currentWithdrawal && depletedAfterMonths === null) {
        depletedAfterMonths = month - waitingMonths - 1
      } else if (balance <= 0 && depletedAfterMonths === null && month < totalMonths) {
        depletedAfterMonths = month - waitingMonths
      }
    }

    if (month % 12 === 0 || month === totalMonths) {
      yearly.push({
        year: Math.ceil(month / 12),
        opening: Math.round(yearOpening),
        growth: Math.round(yearGrowth),
        withdrawn: Math.round(yearWithdrawn),
        closing: Math.round(balance),
      })
      yearOpening = balance
      yearGrowth = 0
      yearWithdrawn = 0
    }
  }

  // Largest starting withdrawal that never runs out: after a year of growth and withdrawals the
  // corpus must have grown by at least the step-up, so it can fund next year's bigger withdrawal.
  // With no step-up this is simply one month's growth on the corpus.
  const yearFactor = Math.pow(1 + monthlyRate, 12)
  const sustainable =
    monthlyRate > 0
      ? (corpusAtStart * (yearFactor - 1 - stepUpPercent / 100) * monthlyRate) / (yearFactor - 1)
      : 0

  return {
    corpusAtStart: Math.round(corpusAtStart),
    totalWithdrawn: Math.round(totalWithdrawn),
    totalGrowth: Math.round(totalGrowth),
    finalBalance: Math.round(balance),
    depletedAfterMonths,
    sustainableWithdrawal: Math.max(0, Math.floor(sustainable)),
    lastMonthlyWithdrawal: Math.round(lastPaidWithdrawal),
    yearly,
  }
}

export interface SWPCalculatorRef {
  exportToPDF: () => void
  exportToHTML: () => void
  exportToExcel: () => void
  handleClear: () => void
}

const SWPCalculator = forwardRef<SWPCalculatorRef>(function SWPCalculator(props, ref) {
  const [investment, setInvestment] = useState(5000000)
  const [expectedReturn, setExpectedReturn] = useState(10)
  const [monthlyWithdrawal, setMonthlyWithdrawal] = useState(40000)
  const [waitingMonths, setWaitingMonths] = useState(12)
  const [withdrawalYears, setWithdrawalYears] = useState(20)
  const [stepUpEnabled, setStepUpEnabled] = useState(false)
  const [stepUpPercent, setStepUpPercent] = useState(6)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const calculatorRef = useRef<HTMLDivElement>(null)

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calc_swp')
    if (saved) {
      const data = JSON.parse(saved)
      setInvestment(data.investment || 5000000)
      setExpectedReturn(data.expectedReturn || 10)
      setMonthlyWithdrawal(data.monthlyWithdrawal || 40000)
      setWaitingMonths(data.waitingMonths ?? 12)
      setWithdrawalYears(data.withdrawalYears || 20)
      setStepUpEnabled(Boolean(data.stepUpEnabled))
      setStepUpPercent(data.stepUpPercent || 6)
      setNotes(data.notes || '')
    }
    setIsLoaded(true)
  }, [])

  // Auto-save to localStorage
  useEffect(() => {
    if (!isLoaded) return
    const data = { investment, expectedReturn, monthlyWithdrawal, waitingMonths, withdrawalYears, stepUpEnabled, stepUpPercent, notes }
    localStorage.setItem('calc_swp', JSON.stringify(data))
    setLastSaved(new Date().toLocaleTimeString())
  }, [investment, expectedReturn, monthlyWithdrawal, waitingMonths, withdrawalYears, stepUpEnabled, stepUpPercent, notes, isLoaded])

  const handleClear = () => {
    setInvestment(5000000)
    setExpectedReturn(10)
    setMonthlyWithdrawal(40000)
    setWaitingMonths(12)
    setWithdrawalYears(20)
    setStepUpEnabled(false)
    setStepUpPercent(6)
    setNotes('')
    localStorage.removeItem('calc_swp')
  }

  const result = useMemo(
    () => calculateSWP(investment, expectedReturn, monthlyWithdrawal, waitingMonths, withdrawalYears, stepUpEnabled ? stepUpPercent : 0),
    [investment, expectedReturn, monthlyWithdrawal, waitingMonths, withdrawalYears, stepUpEnabled, stepUpPercent]
  )

  const lasts = result.depletedAfterMonths === null
  const verdict = lasts
    ? `Lasts the full ${withdrawalYears} years`
    : `Runs out after ${formatMonths(result.depletedAfterMonths ?? 0)} of withdrawals`

  // Export functions
  const exportToExcel = () => {
    const csvContent = [
      `SWP Calculator`,
      `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`,
      ``,
      `INPUTS`,
      `Investment: ₹${formatIndianNumber(investment)}`,
      `Expected Return: ${expectedReturn}% p.a.`,
      `Monthly Withdrawal: ₹${formatIndianNumber(monthlyWithdrawal)}`,
      `Withdrawal Step-up: ${stepUpEnabled ? `${stepUpPercent}% every year` : 'None (constant)'}`,
      `Waiting Period: ${waitingMonths} months`,
      `Withdrawal Period: ${withdrawalYears} years`,
      ``,
      `RESULT`,
      `${verdict}`,
      `Corpus when SWP starts: ₹${formatIndianNumber(result.corpusAtStart)}`,
      `Total Withdrawn: ₹${formatIndianNumber(result.totalWithdrawn)}`,
      `Final Balance: ₹${formatIndianNumber(result.finalBalance)}`,
      ``,
      `Year,Opening,Growth,Withdrawn,Closing`,
      ...result.yearly.map((y) => `${y.year},${y.opening},${y.growth},${y.withdrawn},${y.closing}`),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `SWP_${investment}.csv`
    link.click()
  }

  const buildReportHTML = () => `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SWP Calculator</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #0d9488; font-size: 24px; margin-bottom: 5px; }
          h2 { font-size: 16px; margin-top: 25px; margin-bottom: 15px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .highlight { background: #ccfbf1; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .highlight-value { font-size: 28px; font-weight: bold; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { padding: 6px 8px; text-align: right; border-bottom: 1px solid #e2e8f0; }
          th:first-child, td:first-child { text-align: left; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <h1>SWP Calculator</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>
        <p>Investment ₹${formatIndianNumber(investment)} at ${expectedReturn}% p.a. · ₹${formatIndianNumber(monthlyWithdrawal)}/month${stepUpEnabled ? ` (+${stepUpPercent}% every year)` : ''} after ${waitingMonths} months wait · ${withdrawalYears} years</p>
        <div class="highlight">
          <div class="highlight-value">${verdict}</div>
          <p>Final balance ₹${formatIndianNumber(result.finalBalance)} · Total withdrawn ₹${formatIndianNumber(result.totalWithdrawn)}</p>
        </div>
        <h2>Yearly Breakdown</h2>
        <table>
          <tr><th>Year</th><th>Opening</th><th>Growth</th><th>Withdrawn</th><th>Closing</th></tr>
          ${result.yearly.map((y) => `<tr><td>Y${y.year}</td><td>₹${formatIndianNumber(y.opening)}</td><td>₹${formatIndianNumber(y.growth)}</td><td>₹${formatIndianNumber(y.withdrawn)}</td><td>₹${formatIndianNumber(y.closing)}</td></tr>`).join('')}
        </table>
        ${notes && notes.trim() ? `<h2>Notes</h2><p>${notes.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>` : ''}
        <div class="footer">Generated by AnyCalc — Calculate everything. Plan anything.</div>
      </body>
      </html>
    `

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(buildReportHTML())
      printWindow.document.close()
      printWindow.print()
    }
  }

  const exportToHTML = () => {
    const blob = new Blob([buildReportHTML()], { type: 'text/html;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `SWP_${investment}.html`
    link.click()
  }

  useImperativeHandle(ref, () => ({
    exportToPDF,
    exportToHTML,
    exportToExcel,
    handleClear,
  }))

  const peak = Math.max(...result.yearly.map((y) => y.closing), investment)

  return (
    <div className="space-y-4" ref={calculatorRef}>
      {/* Main Calculator Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid md:grid-cols-2">
          {/* Inputs */}
          <div className="p-5 space-y-5 md:border-r border-slate-100">
            <AmountSlider
              label="Investment (Lumpsum)"
              value={investment}
              onChange={setInvestment}
              accentClass="accent-teal-600"
              activeChipClass="bg-teal-50 border-teal-300 text-teal-700"
            />

            {/* Expected Return */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Expected Return</label>
                <EditableValue value={expectedReturn} onChange={setExpectedReturn} min={1} max={30} suffix="% p.a." allowDecimal />
              </div>
              <input
                type="range"
                min={1}
                max={30}
                step={0.5}
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-teal-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>1%</span>
                <span>30%</span>
              </div>
            </div>

            {/* Monthly Withdrawal */}
            <div>
              <AmountSlider
                label="Monthly Withdrawal (SWP)"
                value={monthlyWithdrawal}
                onChange={setMonthlyWithdrawal}
                ranges={WITHDRAWAL_RANGES}
                accentClass="accent-teal-600"
                activeChipClass="bg-teal-50 border-teal-300 text-teal-700"
              />

              {/* Constant vs step-up */}
              <div className="mt-3 flex bg-slate-100 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setStepUpEnabled(false)}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    !stepUpEnabled ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Constant
                </button>
                <button
                  type="button"
                  onClick={() => setStepUpEnabled(true)}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    stepUpEnabled ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Step-up yearly
                </button>
              </div>

              {stepUpEnabled && (
                <div className="mt-3">
                  <div className="flex justify-between items-baseline mb-2">
                    <label className="text-sm font-medium text-slate-600">Increase Every Year</label>
                    <EditableValue value={stepUpPercent} onChange={setStepUpPercent} min={1} max={20} suffix="%" allowDecimal />
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    step={0.5}
                    value={stepUpPercent}
                    onChange={(e) => setStepUpPercent(Number(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-teal-600"
                  />
                  <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                    <span>1%</span>
                    <span>20%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    ~6% keeps pace with inflation. {lasts ? 'Final year' : 'Last full withdrawal'}: ₹{formatIndianNumber(result.lastMonthlyWithdrawal)}/mo
                  </p>
                </div>
              )}
            </div>

            {/* Waiting Period */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Waiting Period</label>
                <EditableValue value={waitingMonths} onChange={setWaitingMonths} min={0} max={240} suffix="months" />
              </div>
              <input
                type="range"
                min={0}
                max={120}
                step={1}
                value={waitingMonths}
                onChange={(e) => setWaitingMonths(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-teal-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>No wait</span>
                <span>10 yrs</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">No withdrawals during this time — the money just grows.</p>
            </div>

            {/* Withdrawal Period */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Withdraw For</label>
                <EditableValue value={withdrawalYears} onChange={setWithdrawalYears} min={1} max={40} suffix="years" />
              </div>
              <input
                type="range"
                min={1}
                max={40}
                step={1}
                value={withdrawalYears}
                onChange={(e) => setWithdrawalYears(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-teal-600"
              />
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>1 yr</span>
                <span>40 yrs</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="p-5 bg-slate-50">
            <div className={`rounded-lg p-4 text-center mb-4 ${lasts ? 'bg-teal-50' : 'bg-red-50'}`}>
              <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${lasts ? 'text-teal-600' : 'text-red-600'}`}>
                {lasts ? 'Balance Left at the End' : 'Money Runs Out'}
              </div>
              <div className="font-mono text-2xl font-bold text-slate-900 break-words">
                {lasts ? `₹${formatIndianNumber(result.finalBalance)}` : formatMonths(result.depletedAfterMonths ?? 0)}
              </div>
              <div className={`text-xs mt-1 ${lasts ? 'text-teal-600' : 'text-red-600'}`}>{verdict}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white rounded-lg p-3 text-center border border-slate-200">
                <div className="text-[9px] uppercase tracking-wide text-slate-500 mb-1">Corpus at SWP Start</div>
                <div className="font-mono text-base font-bold text-slate-900">{formatCompact(result.corpusAtStart)}</div>
                <div className="text-[9px] text-slate-500 mt-1">after {waitingMonths} mo wait</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center border border-slate-200">
                <div className="text-[9px] uppercase tracking-wide text-slate-500 mb-1">Total Withdrawn</div>
                <div className="font-mono text-base font-bold text-teal-600">{formatCompact(result.totalWithdrawn)}</div>
                <div className="text-[9px] text-slate-500 mt-1">
                  ₹{formatIndianNumber(monthlyWithdrawal)}/mo{stepUpEnabled ? ` → ₹${formatIndianNumber(result.lastMonthlyWithdrawal)}/mo` : ''}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Invested</span>
                <span className="font-mono font-medium">{formatCompact(investment)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Growth Earned</span>
                <span className="font-mono font-medium text-green-600">{formatCompact(result.totalGrowth)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Withdrawn + Balance</span>
                <span className="font-mono font-medium">{formatCompact(result.totalWithdrawn + result.finalBalance)}</span>
              </div>
              <div className="flex justify-between gap-3 border-t border-slate-100 pt-2">
                <span className="text-slate-700 font-medium">
                  {stepUpEnabled ? `Safe starting SWP with ${stepUpPercent}% step-up` : 'Safe constant SWP'} (never runs out)
                </span>
                <span className="font-mono font-semibold text-teal-600 whitespace-nowrap">
                  {result.sustainableWithdrawal > 0 ? `₹${formatIndianNumber(result.sustainableWithdrawal)}/mo` : 'None'}
                </span>
              </div>
              {monthlyWithdrawal > result.sustainableWithdrawal && (
                <p className="text-[10px] text-amber-600">
                  Your ₹{formatIndianNumber(monthlyWithdrawal)}/mo is above this, so the corpus shrinks over time
                  {stepUpEnabled ? ' — each yearly step-up widens the gap.' : '.'}
                </p>
              )}
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
                  ? 'text-teal-600 bg-teal-50 hover:bg-teal-100'
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
                className="w-full h-16 p-2 text-xs text-slate-600 bg-white border border-slate-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-teal-400 focus:border-teal-400"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* Yearly Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Year-by-Year Balance</h3>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 text-[10px] text-slate-400 uppercase tracking-wide mb-2">
            <span className="w-8">Year</span>
            <span className="flex-1">Opening Balance + Net Growth</span>
            <span className="w-20 text-right">Value</span>
          </div>
          <div className="space-y-2">
            {result.yearly.map((y) => {
              // Net = growth earned minus what was taken out that year
              const net = y.closing - y.opening
              const grew = net >= 0
              const baseWidth = peak > 0 ? (Math.min(y.opening, y.closing) / peak) * 100 : 0
              const netWidth = peak > 0 ? (Math.abs(net) / peak) * 100 : 0
              const netLabel = `${grew ? '+' : '−'}${formatCompact(Math.abs(net))}`
              const netInside = netWidth > 18
              return (
                <div
                  key={y.year}
                  className="flex items-center gap-3"
                  title={`Growth +${formatCompact(y.growth)} · Withdrawn −${formatCompact(y.withdrawn)}`}
                >
                  <span className="text-xs w-8 font-mono text-slate-500">Y{y.year}</span>
                  <div className="flex-1 min-w-0 h-7 bg-slate-100 rounded overflow-hidden flex">
                    <div
                      className="h-full bg-green-500 flex items-center justify-end pr-1 overflow-hidden"
                      style={{ width: `${baseWidth}%` }}
                    >
                      <span className="text-[9px] text-white font-medium whitespace-nowrap">
                        {formatCompact(Math.min(y.opening, y.closing))}
                      </span>
                    </div>
                    <div
                      className={`h-full flex items-center justify-start pl-1 overflow-hidden ${grew ? 'bg-teal-600' : 'bg-rose-300'}`}
                      style={{ width: `${netWidth}%` }}
                    >
                      {netInside && (
                        <span className={`text-[9px] font-medium whitespace-nowrap ${grew ? 'text-white' : 'text-rose-800'}`}>
                          {netLabel}
                        </span>
                      )}
                    </div>
                    {!netInside && (
                      <span className={`self-center pl-1 text-[9px] font-medium whitespace-nowrap ${grew ? 'text-teal-700' : 'text-rose-600'}`}>
                        {netLabel}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] w-20 text-right font-mono ${y.closing > 0 ? 'text-slate-600' : 'text-red-500'}`}>
                    {y.closing > 0 ? formatCompact(y.closing) : 'Exhausted'}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-sm" />
              Opening Balance
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-teal-600 rounded-sm" />
              Net Growth (growth − withdrawals)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-rose-300 rounded-sm" />
              Net Drawdown
            </div>
          </div>
        </div>
      </div>

      {/* Pro Tips */}
      <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-teal-700 mb-2">💡 Pro Tips</h3>
        <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
          <li>Withdraw less than the growth each month and the corpus never runs out</li>
          <li>A longer waiting period lets the corpus compound before withdrawals begin</li>
          <li>Returns are not guaranteed — plan with a conservative rate</li>
        </ul>
      </div>
    </div>
  )
})

export default SWPCalculator
