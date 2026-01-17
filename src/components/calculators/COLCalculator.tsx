'use client'

import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

interface COLResult {
  fromCity: string
  toCity: string
  currentSalary: number
  equivalentSalary: number
  colIndex: number
  difference: number
  differencePercent: number
}

// Cost of Living Index (Base: Mumbai = 100)
const CITY_COL_INDEX: Record<string, { index: number; country: string }> = {
  'Mumbai': { index: 100, country: 'India' },
  'New Delhi': { index: 92, country: 'India' },
  'Bangalore': { index: 89, country: 'India' },
  'Chennai': { index: 78, country: 'India' },
  'Hyderabad': { index: 76, country: 'India' },
  'Pune': { index: 82, country: 'India' },
  'Kolkata': { index: 72, country: 'India' },
  'Ahmedabad': { index: 68, country: 'India' },
  'New York': { index: 187, country: 'USA' },
  'San Francisco': { index: 195, country: 'USA' },
  'Los Angeles': { index: 165, country: 'USA' },
  'Chicago': { index: 145, country: 'USA' },
  'Seattle': { index: 158, country: 'USA' },
  'Austin': { index: 128, country: 'USA' },
  'London': { index: 175, country: 'UK' },
  'Manchester': { index: 135, country: 'UK' },
  'Singapore': { index: 168, country: 'Singapore' },
  'Dubai': { index: 142, country: 'UAE' },
  'Sydney': { index: 162, country: 'Australia' },
  'Melbourne': { index: 148, country: 'Australia' },
  'Toronto': { index: 145, country: 'Canada' },
  'Vancouver': { index: 152, country: 'Canada' },
  'Berlin': { index: 128, country: 'Germany' },
  'Munich': { index: 145, country: 'Germany' },
  'Paris': { index: 155, country: 'France' },
  'Amsterdam': { index: 148, country: 'Netherlands' },
  'Tokyo': { index: 158, country: 'Japan' },
  'Hong Kong': { index: 172, country: 'China' },
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

function calculateCOL(fromCity: string, toCity: string, currentSalary: number): COLResult {
  const fromIndex = CITY_COL_INDEX[fromCity]?.index || 100
  const toIndex = CITY_COL_INDEX[toCity]?.index || 100

  const colIndex = toIndex / fromIndex
  const equivalentSalary = currentSalary * colIndex
  const difference = equivalentSalary - currentSalary
  const differencePercent = ((colIndex - 1) * 100)

  return {
    fromCity,
    toCity,
    currentSalary,
    equivalentSalary: Math.round(equivalentSalary),
    colIndex: Math.round(colIndex * 100) / 100,
    difference: Math.round(difference),
    differencePercent: Math.round(differencePercent),
  }
}

export interface COLCalculatorRef {
  exportToPDF: () => void
  exportToHTML: () => void
  exportToExcel: () => void
  handleClear: () => void
}

const COLCalculator = forwardRef<COLCalculatorRef>(function COLCalculator(props, ref) {
  const [fromCity, setFromCity] = useState('Bangalore')
  const [toCity, setToCity] = useState('New York')
  const [currentSalary, setCurrentSalary] = useState(2000000)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const calculatorRef = useRef<HTMLDivElement>(null)

  const cities = Object.keys(CITY_COL_INDEX).sort()

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calc_col')
    if (saved) {
      const data = JSON.parse(saved)
      setFromCity(data.fromCity || 'Bangalore')
      setToCity(data.toCity || 'New York')
      setCurrentSalary(data.currentSalary || 2000000)
      setNotes(data.notes || '')
    }
    setIsLoaded(true)
  }, [])

  // Auto-save to localStorage
  useEffect(() => {
    if (!isLoaded) return
    const data = { fromCity, toCity, currentSalary, notes }
    localStorage.setItem('calc_col', JSON.stringify(data))
    setLastSaved(new Date().toLocaleTimeString())
  }, [fromCity, toCity, currentSalary, notes, isLoaded])

  const handleClear = () => {
    setFromCity('Bangalore')
    setToCity('New York')
    setCurrentSalary(2000000)
    setNotes('')
    localStorage.removeItem('calc_col')
  }

  const result = useMemo(
    () => calculateCOL(fromCity, toCity, currentSalary),
    [fromCity, toCity, currentSalary]
  )

  const swapCities = () => {
    const temp = fromCity
    setFromCity(toCity)
    setToCity(temp)
  }

  // Export functions
  const exportToExcel = () => {
    const csvContent = [
      `Cost of Living Comparison`,
      `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`,
      ``,
      `From City: ${fromCity} (COL Index: ${CITY_COL_INDEX[fromCity]?.index})`,
      `To City: ${toCity} (COL Index: ${CITY_COL_INDEX[toCity]?.index})`,
      ``,
      `Current Salary: ₹${formatIndianNumber(currentSalary)}`,
      `Equivalent Salary: ₹${formatIndianNumber(result.equivalentSalary)}`,
      `Difference: ${result.differencePercent > 0 ? '+' : ''}${result.differencePercent}%`,
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `COL_${fromCity}_to_${toCity}.csv`
    link.click()
  }

  const exportToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cost of Living Comparison</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #14b8a6; font-size: 24px; margin-bottom: 5px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .comparison { display: flex; align-items: center; justify-content: center; gap: 30px; margin: 30px 0; }
          .city-box { background: #f8fafc; padding: 20px; border-radius: 12px; text-align: center; min-width: 150px; }
          .city-name { font-size: 18px; font-weight: 600; color: #1e293b; }
          .city-country { font-size: 11px; color: #64748b; }
          .salary { font-size: 24px; font-weight: bold; color: #14b8a6; margin-top: 10px; font-family: monospace; }
          .arrow { font-size: 24px; color: #94a3b8; }
          .result { background: linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <h1>Cost of Living Comparison</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="comparison">
          <div class="city-box">
            <div class="city-name">${fromCity}</div>
            <div class="city-country">${CITY_COL_INDEX[fromCity]?.country}</div>
            <div class="salary">₹${formatIndianNumber(currentSalary)}</div>
          </div>
          <div class="arrow">→</div>
          <div class="city-box">
            <div class="city-name">${toCity}</div>
            <div class="city-country">${CITY_COL_INDEX[toCity]?.country}</div>
            <div class="salary">₹${formatIndianNumber(result.equivalentSalary)}</div>
          </div>
        </div>

        <div class="result">
          <p style="margin: 0; font-size: 14px;">
            To maintain the same standard of living, you need
            <strong>${result.differencePercent > 0 ? '+' : ''}${result.differencePercent}%</strong>
            salary in ${toCity}
          </p>
        </div>

        <div class="footer">Generated by AnyCalc</div>
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
        <title>Cost of Living Comparison</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #14b8a6; }
          .result { background: #ccfbf1; padding: 20px; border-radius: 12px; text-align: center; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <h1>Cost of Living: ${fromCity} → ${toCity}</h1>
        <div class="result">
          <p>Current: ₹${formatIndianNumber(currentSalary)}</p>
          <p><strong>Equivalent: ₹${formatIndianNumber(result.equivalentSalary)}</strong></p>
          <p>Difference: ${result.differencePercent > 0 ? '+' : ''}${result.differencePercent}%</p>
        </div>
        <div class="footer">Generated by AnyCalc</div>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `COL_${fromCity}_to_${toCity}.html`
    link.click()
  }

  useImperativeHandle(ref, () => ({
    exportToPDF,
    exportToHTML,
    exportToExcel,
    handleClear,
  }))

  const isHigherCOL = result.differencePercent > 0

  return (
    <div className="space-y-4" ref={calculatorRef}>
      {/* Main Calculator Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5">
          {/* City Selection */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-600 block mb-2">From City</label>
              <select
                value={fromCity}
                onChange={(e) => setFromCity(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city} ({CITY_COL_INDEX[city].country})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={swapCities}
              className="mt-6 p-2 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors"
              title="Swap cities"
            >
              ⇄
            </button>

            <div className="flex-1">
              <label className="text-sm font-medium text-slate-600 block mb-2">To City</label>
              <select
                value={toCity}
                onChange={(e) => setToCity(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city} ({CITY_COL_INDEX[city].country})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Salary Input */}
          <div className="mb-6">
            <div className="flex justify-between items-baseline mb-2">
              <label className="text-sm font-medium text-slate-600">Current Annual Salary in {fromCity}</label>
              <span className="font-mono text-base font-semibold text-slate-900">
                ₹{formatIndianNumber(currentSalary)}
              </span>
            </div>
            <input
              type="range"
              min={300000}
              max={50000000}
              step={50000}
              value={currentSalary}
              onChange={(e) => setCurrentSalary(Number(e.target.value))}
              className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-teal-600"
            />
            <div className="flex justify-between mt-1 text-[10px] text-slate-400">
              <span>₹3L</span>
              <span>₹5Cr</span>
            </div>
          </div>

          {/* Result */}
          <div className={`rounded-xl p-6 text-center ${isHigherCOL ? 'bg-amber-50' : 'bg-green-50'}`}>
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">
              Equivalent Salary in {toCity}
            </div>
            <div className="font-mono text-4xl font-bold text-slate-900">
              ₹{formatIndianNumber(result.equivalentSalary)}
            </div>
            <div className={`text-sm font-medium mt-2 ${isHigherCOL ? 'text-amber-600' : 'text-green-600'}`}>
              {isHigherCOL ? '↑' : '↓'} {Math.abs(result.differencePercent)}% {isHigherCOL ? 'higher' : 'lower'} cost of living
            </div>
          </div>

          {/* COL Index Comparison */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <div className="text-xs text-slate-500 mb-1">{fromCity} COL Index</div>
              <div className="font-mono text-xl font-bold text-slate-900">{CITY_COL_INDEX[fromCity]?.index}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <div className="text-xs text-slate-500 mb-1">{toCity} COL Index</div>
              <div className="font-mono text-xl font-bold text-slate-900">{CITY_COL_INDEX[toCity]?.index}</div>
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

      {/* About Section */}
      <details className="bg-white border border-slate-200 rounded-xl">
        <summary className="px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
          About Cost of Living Calculator
        </summary>
        <div className="px-4 pb-4 text-sm text-slate-600 space-y-3">
          <p>
            This calculator helps you compare the <strong>cost of living</strong> between different cities
            and understand what salary you&apos;d need to maintain the same standard of living.
          </p>
          <p className="text-slate-500">
            <strong>Note:</strong> COL indices are approximate and can vary based on lifestyle, housing choices,
            and personal spending habits. Use this as a general guideline.
          </p>
        </div>
      </details>
    </div>
  )
})

export default COLCalculator
