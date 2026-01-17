'use client'

import { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

interface TripResult {
  totalBudget: number
  perPersonBudget: number
  perDayBudget: number
  breakdown: {
    flights: number
    accommodation: number
    food: number
    transport: number
    activities: number
    shopping: number
    misc: number
  }
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

function calculateTrip(
  destination: string,
  travelers: number,
  days: number,
  tripType: 'budget' | 'standard' | 'luxury',
  flights: number,
  accommodation: number
): TripResult {
  // Base daily costs per person based on trip type
  const dailyCosts = {
    budget: { food: 1000, transport: 500, activities: 800, shopping: 500, misc: 300 },
    standard: { food: 2000, transport: 1000, activities: 2000, shopping: 1500, misc: 500 },
    luxury: { food: 5000, transport: 3000, activities: 5000, shopping: 5000, misc: 1000 },
  }

  const costs = dailyCosts[tripType]

  const foodTotal = costs.food * days * travelers
  const transportTotal = costs.transport * days * travelers
  const activitiesTotal = costs.activities * days * travelers
  const shoppingTotal = costs.shopping * travelers
  const miscTotal = costs.misc * days * travelers

  const totalBudget = flights + accommodation + foodTotal + transportTotal + activitiesTotal + shoppingTotal + miscTotal

  return {
    totalBudget: Math.round(totalBudget),
    perPersonBudget: Math.round(totalBudget / travelers),
    perDayBudget: Math.round(totalBudget / days),
    breakdown: {
      flights: Math.round(flights),
      accommodation: Math.round(accommodation),
      food: Math.round(foodTotal),
      transport: Math.round(transportTotal),
      activities: Math.round(activitiesTotal),
      shopping: Math.round(shoppingTotal),
      misc: Math.round(miscTotal),
    },
  }
}

export interface TripCalculatorRef {
  exportToPDF: () => void
  exportToHTML: () => void
  exportToExcel: () => void
  handleClear: () => void
}

const TripCalculator = forwardRef<TripCalculatorRef>(function TripCalculator(props, ref) {
  const [destination, setDestination] = useState('Goa')
  const [travelers, setTravelers] = useState(2)
  const [days, setDays] = useState(5)
  const [tripType, setTripType] = useState<'budget' | 'standard' | 'luxury'>('standard')
  const [flights, setFlights] = useState(15000)
  const [accommodation, setAccommodation] = useState(25000)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const calculatorRef = useRef<HTMLDivElement>(null)

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calc_trip')
    if (saved) {
      const data = JSON.parse(saved)
      setDestination(data.destination || 'Goa')
      setTravelers(data.travelers || 2)
      setDays(data.days || 5)
      setTripType(data.tripType || 'standard')
      setFlights(data.flights || 15000)
      setAccommodation(data.accommodation || 25000)
      setNotes(data.notes || '')
    }
    setIsLoaded(true)
  }, [])

  // Auto-save to localStorage
  useEffect(() => {
    if (!isLoaded) return
    const data = { destination, travelers, days, tripType, flights, accommodation, notes }
    localStorage.setItem('calc_trip', JSON.stringify(data))
    setLastSaved(new Date().toLocaleTimeString())
  }, [destination, travelers, days, tripType, flights, accommodation, notes, isLoaded])

  const handleClear = () => {
    setDestination('Goa')
    setTravelers(2)
    setDays(5)
    setTripType('standard')
    setFlights(15000)
    setAccommodation(25000)
    setNotes('')
    localStorage.removeItem('calc_trip')
  }

  const result = useMemo(
    () => calculateTrip(destination, travelers, days, tripType, flights, accommodation),
    [destination, travelers, days, tripType, flights, accommodation]
  )

  // Export functions
  const exportToExcel = () => {
    const csvContent = [
      `Trip Budget Planner - ${destination}`,
      `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`,
      ``,
      `TRIP DETAILS`,
      `Destination: ${destination}`,
      `Travelers: ${travelers}`,
      `Duration: ${days} days`,
      `Trip Type: ${tripType}`,
      ``,
      `BUDGET BREAKDOWN`,
      `Flights/Travel: ₹${formatIndianNumber(result.breakdown.flights)}`,
      `Accommodation: ₹${formatIndianNumber(result.breakdown.accommodation)}`,
      `Food: ₹${formatIndianNumber(result.breakdown.food)}`,
      `Local Transport: ₹${formatIndianNumber(result.breakdown.transport)}`,
      `Activities: ₹${formatIndianNumber(result.breakdown.activities)}`,
      `Shopping: ₹${formatIndianNumber(result.breakdown.shopping)}`,
      `Miscellaneous: ₹${formatIndianNumber(result.breakdown.misc)}`,
      ``,
      `SUMMARY`,
      `Total Budget: ₹${formatIndianNumber(result.totalBudget)}`,
      `Per Person: ₹${formatIndianNumber(result.perPersonBudget)}`,
      `Per Day: ₹${formatIndianNumber(result.perDayBudget)}`,
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Trip_${destination}_${days}days.csv`
    link.click()
  }

  const exportToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Trip Budget - ${destination}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #0ea5e9; font-size: 24px; margin-bottom: 5px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .highlight { background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .highlight-label { font-size: 11px; color: #0ea5e9; text-transform: uppercase; letter-spacing: 1px; }
          .highlight-value { font-size: 36px; font-weight: bold; color: #0f172a; }
          .breakdown { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
          .breakdown-item { background: #f8fafc; padding: 15px; border-radius: 8px; }
          .breakdown-label { font-size: 11px; color: #64748b; }
          .breakdown-value { font-size: 18px; font-weight: 600; color: #0f172a; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <h1>Trip Budget: ${destination}</h1>
        <p class="subtitle">${travelers} travelers • ${days} days • ${tripType} trip</p>

        <div class="highlight">
          <div class="highlight-label">Total Budget</div>
          <div class="highlight-value">₹${formatIndianNumber(result.totalBudget)}</div>
          <p style="font-size: 12px; color: #0ea5e9; margin-top: 5px;">
            ₹${formatIndianNumber(result.perPersonBudget)}/person • ₹${formatIndianNumber(result.perDayBudget)}/day
          </p>
        </div>

        <h2 style="font-size: 16px; color: #475569; margin-top: 25px;">Budget Breakdown</h2>
        <div class="breakdown">
          <div class="breakdown-item">
            <div class="breakdown-label">Flights/Travel</div>
            <div class="breakdown-value">₹${formatIndianNumber(result.breakdown.flights)}</div>
          </div>
          <div class="breakdown-item">
            <div class="breakdown-label">Accommodation</div>
            <div class="breakdown-value">₹${formatIndianNumber(result.breakdown.accommodation)}</div>
          </div>
          <div class="breakdown-item">
            <div class="breakdown-label">Food & Dining</div>
            <div class="breakdown-value">₹${formatIndianNumber(result.breakdown.food)}</div>
          </div>
          <div class="breakdown-item">
            <div class="breakdown-label">Local Transport</div>
            <div class="breakdown-value">₹${formatIndianNumber(result.breakdown.transport)}</div>
          </div>
          <div class="breakdown-item">
            <div class="breakdown-label">Activities & Tours</div>
            <div class="breakdown-value">₹${formatIndianNumber(result.breakdown.activities)}</div>
          </div>
          <div class="breakdown-item">
            <div class="breakdown-label">Shopping</div>
            <div class="breakdown-value">₹${formatIndianNumber(result.breakdown.shopping)}</div>
          </div>
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
        <title>Trip Budget - ${destination}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #0ea5e9; }
          .highlight { background: #e0f2fe; padding: 20px; border-radius: 12px; text-align: center; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <h1>Trip Budget: ${destination}</h1>
        <div class="highlight">
          <h2>Total: ₹${formatIndianNumber(result.totalBudget)}</h2>
          <p>${travelers} travelers • ${days} days</p>
        </div>
        <div class="footer">Generated by AnyCalc</div>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Trip_${destination}.html`
    link.click()
  }

  useImperativeHandle(ref, () => ({
    exportToPDF,
    exportToHTML,
    exportToExcel,
    handleClear,
  }))

  const breakdownItems = [
    { label: 'Flights/Travel', value: result.breakdown.flights, color: 'bg-sky-500' },
    { label: 'Accommodation', value: result.breakdown.accommodation, color: 'bg-violet-500' },
    { label: 'Food & Dining', value: result.breakdown.food, color: 'bg-orange-500' },
    { label: 'Local Transport', value: result.breakdown.transport, color: 'bg-green-500' },
    { label: 'Activities', value: result.breakdown.activities, color: 'bg-pink-500' },
    { label: 'Shopping', value: result.breakdown.shopping, color: 'bg-amber-500' },
    { label: 'Miscellaneous', value: result.breakdown.misc, color: 'bg-slate-400' },
  ]

  return (
    <div className="space-y-4" ref={calculatorRef}>
      {/* Main Calculator Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid md:grid-cols-2">
          {/* Inputs */}
          <div className="p-5 space-y-4 border-r border-slate-100">
            {/* Destination */}
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-2">Destination</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="e.g., Goa, Bali, Thailand"
              />
            </div>

            {/* Trip Type */}
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-2">Trip Type</label>
              <div className="flex gap-2">
                {(['budget', 'standard', 'luxury'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTripType(type)}
                    className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors capitalize ${
                      tripType === type
                        ? 'bg-sky-50 border-sky-300 text-sky-700 font-medium'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Travelers & Days */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <label className="text-sm font-medium text-slate-600">Travelers</label>
                  <span className="font-mono text-sm font-semibold text-slate-900">{travelers}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={travelers}
                  onChange={(e) => setTravelers(Number(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-sky-600"
                />
              </div>
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <label className="text-sm font-medium text-slate-600">Days</label>
                  <span className="font-mono text-sm font-semibold text-slate-900">{days}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-sky-600"
                />
              </div>
            </div>

            {/* Flights */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Flights/Travel (Total)</label>
                <span className="font-mono text-sm font-semibold text-slate-900">₹{formatIndianNumber(flights)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={500000}
                step={1000}
                value={flights}
                onChange={(e) => setFlights(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-sky-600"
              />
            </div>

            {/* Accommodation */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-medium text-slate-600">Accommodation (Total)</label>
                <span className="font-mono text-sm font-semibold text-slate-900">₹{formatIndianNumber(accommodation)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={500000}
                step={1000}
                value={accommodation}
                onChange={(e) => setAccommodation(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-sky-600"
              />
            </div>
          </div>

          {/* Results */}
          <div className="p-5 bg-slate-50">
            {/* Total Budget */}
            <div className="bg-sky-50 rounded-lg p-4 text-center mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-600 mb-1">
                Total Trip Budget
              </div>
              <div className="font-mono text-3xl font-bold text-slate-900">
                ₹{formatIndianNumber(result.totalBudget)}
              </div>
              <div className="flex justify-center gap-4 mt-2 text-xs text-sky-600">
                <span>₹{formatIndianNumber(result.perPersonBudget)}/person</span>
                <span>•</span>
                <span>₹{formatIndianNumber(result.perDayBudget)}/day</span>
              </div>
            </div>

            {/* Breakdown Chart */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <div className="text-xs font-semibold text-slate-700 mb-3">Budget Breakdown</div>
              <div className="space-y-2">
                {breakdownItems.map((item) => {
                  const percent = result.totalBudget > 0 ? (item.value / result.totalBudget) * 100 : 0
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600">{item.label}</span>
                        <span className="font-mono">{formatCompact(item.value)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Trip Summary */}
            <div className="bg-white rounded-lg p-3 text-xs">
              <div className="font-semibold text-slate-700 mb-2">Trip Summary</div>
              <div className="text-slate-600">
                {travelers} {travelers === 1 ? 'traveler' : 'travelers'} • {days} {days === 1 ? 'day' : 'days'} • {tripType} trip to {destination}
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
                  ? 'text-sky-600 bg-sky-50 hover:bg-sky-100'
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
                className="w-full h-16 p-2 text-xs text-slate-600 bg-white border border-slate-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* About Section */}
      <details className="bg-white border border-slate-200 rounded-xl">
        <summary className="px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
          About Trip Planner
        </summary>
        <div className="px-4 pb-4 text-sm text-slate-600 space-y-3">
          <p>
            Plan your trip budget with estimates for various expenses based on your travel style.
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li><strong>Budget:</strong> Hostels, street food, public transport</li>
            <li><strong>Standard:</strong> 3-star hotels, restaurants, mix of transport</li>
            <li><strong>Luxury:</strong> 5-star hotels, fine dining, private transport</li>
          </ul>
          <p className="text-slate-500">
            <strong>Tip:</strong> Add 10-20% buffer for unexpected expenses!
          </p>
        </div>
      </details>
    </div>
  )
})

export default TripCalculator
