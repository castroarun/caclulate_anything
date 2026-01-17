'use client'

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

interface CityTime {
  id: string
  city: string
  country: string
  timezone: string
  offset: number
  time: string
  date: string
  isDaytime: boolean
}

const CITIES = [
  { city: 'Mumbai', country: 'India', timezone: 'Asia/Kolkata', offset: 5.5 },
  { city: 'New Delhi', country: 'India', timezone: 'Asia/Kolkata', offset: 5.5 },
  { city: 'Bangalore', country: 'India', timezone: 'Asia/Kolkata', offset: 5.5 },
  { city: 'New York', country: 'USA', timezone: 'America/New_York', offset: -5 },
  { city: 'Los Angeles', country: 'USA', timezone: 'America/Los_Angeles', offset: -8 },
  { city: 'Chicago', country: 'USA', timezone: 'America/Chicago', offset: -6 },
  { city: 'London', country: 'UK', timezone: 'Europe/London', offset: 0 },
  { city: 'Paris', country: 'France', timezone: 'Europe/Paris', offset: 1 },
  { city: 'Berlin', country: 'Germany', timezone: 'Europe/Berlin', offset: 1 },
  { city: 'Dubai', country: 'UAE', timezone: 'Asia/Dubai', offset: 4 },
  { city: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore', offset: 8 },
  { city: 'Hong Kong', country: 'China', timezone: 'Asia/Hong_Kong', offset: 8 },
  { city: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo', offset: 9 },
  { city: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney', offset: 11 },
  { city: 'Auckland', country: 'New Zealand', timezone: 'Pacific/Auckland', offset: 13 },
  { city: 'Toronto', country: 'Canada', timezone: 'America/Toronto', offset: -5 },
  { city: 'São Paulo', country: 'Brazil', timezone: 'America/Sao_Paulo', offset: -3 },
  { city: 'Moscow', country: 'Russia', timezone: 'Europe/Moscow', offset: 3 },
]

function getTimeInTimezone(timezone: string): { time: string; date: string; hour: number } {
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }
  const dateOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }
  const hourOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  }

  const time = now.toLocaleString('en-US', options)
  const date = now.toLocaleString('en-US', dateOptions)
  const hour = parseInt(now.toLocaleString('en-US', hourOptions))

  return { time, date, hour }
}

export interface WorldClockRef {
  exportToPDF: () => void
  exportToHTML: () => void
  exportToExcel: () => void
  handleClear: () => void
}

const WorldClock = forwardRef<WorldClockRef>(function WorldClock(props, ref) {
  const [selectedCities, setSelectedCities] = useState<string[]>(['Asia/Kolkata', 'America/New_York', 'Europe/London', 'Asia/Tokyo'])
  const [cityTimes, setCityTimes] = useState<CityTime[]>([])
  const [localTime, setLocalTime] = useState<string>('')
  const [localDate, setLocalDate] = useState<string>('')
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const calculatorRef = useRef<HTMLDivElement>(null)

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calc_clock')
    if (saved) {
      const data = JSON.parse(saved)
      setSelectedCities(data.selectedCities || ['Asia/Kolkata', 'America/New_York', 'Europe/London', 'Asia/Tokyo'])
      setNotes(data.notes || '')
    }
    setIsLoaded(true)
  }, [])

  // Auto-save to localStorage
  useEffect(() => {
    if (!isLoaded) return
    const data = { selectedCities, notes }
    localStorage.setItem('calc_clock', JSON.stringify(data))
    setLastSaved(new Date().toLocaleTimeString())
  }, [selectedCities, notes, isLoaded])

  // Update times every second
  useEffect(() => {
    const updateTimes = () => {
      // Local time
      const now = new Date()
      setLocalTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }))
      setLocalDate(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))

      // Selected cities
      const times: CityTime[] = CITIES
        .filter(c => selectedCities.includes(c.timezone))
        .map(city => {
          const { time, date, hour } = getTimeInTimezone(city.timezone)
          return {
            id: city.timezone,
            city: city.city,
            country: city.country,
            timezone: city.timezone,
            offset: city.offset,
            time,
            date,
            isDaytime: hour >= 6 && hour < 18,
          }
        })
      setCityTimes(times)
    }

    updateTimes()
    const interval = setInterval(updateTimes, 1000)
    return () => clearInterval(interval)
  }, [selectedCities])

  const handleClear = () => {
    setSelectedCities(['Asia/Kolkata', 'America/New_York', 'Europe/London', 'Asia/Tokyo'])
    setNotes('')
    localStorage.removeItem('calc_clock')
  }

  const toggleCity = (timezone: string) => {
    if (selectedCities.includes(timezone)) {
      setSelectedCities(selectedCities.filter(c => c !== timezone))
    } else {
      setSelectedCities([...selectedCities, timezone])
    }
  }

  // Export functions
  const exportToExcel = () => {
    const csvContent = [
      `World Clock`,
      `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`,
      ``,
      `City,Country,Time,Date,UTC Offset`,
      ...cityTimes.map(c => `${c.city},${c.country},${c.time},${c.date},UTC${c.offset >= 0 ? '+' : ''}${c.offset}`),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `World_Clock_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const exportToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>World Clock</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #6366f1; font-size: 24px; margin-bottom: 5px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .time-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
          .time-card { background: #f8fafc; padding: 15px; border-radius: 12px; text-align: center; }
          .city-name { font-size: 16px; font-weight: 600; color: #1e293b; }
          .country { font-size: 11px; color: #64748b; }
          .time { font-size: 24px; font-weight: bold; color: #6366f1; margin: 10px 0; font-family: monospace; }
          .date { font-size: 11px; color: #64748b; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <h1>World Clock</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>
        <div class="time-grid">
          ${cityTimes.map(c => `
            <div class="time-card">
              <div class="city-name">${c.city}</div>
              <div class="country">${c.country}</div>
              <div class="time">${c.time}</div>
              <div class="date">${c.date}</div>
            </div>
          `).join('')}
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
        <title>World Clock</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 900px; margin: 0 auto; }
          h1 { color: #6366f1; }
          .time-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
          .time-card { background: #f8fafc; padding: 15px; border-radius: 12px; text-align: center; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <h1>World Clock</h1>
        <div class="time-grid">
          ${cityTimes.map(c => `
            <div class="time-card">
              <h3>${c.city}</h3>
              <p style="font-size: 20px; font-family: monospace;">${c.time}</p>
              <p>${c.date}</p>
            </div>
          `).join('')}
        </div>
        <div class="footer">Generated by AnyCalc</div>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `World_Clock.html`
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
      {/* Local Time */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white text-center">
        <div className="text-xs uppercase tracking-wider opacity-80 mb-1">Your Local Time</div>
        <div className="font-mono text-4xl font-bold">{localTime}</div>
        <div className="text-sm opacity-80 mt-1">{localDate}</div>
      </div>

      {/* Selected Cities */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">World Times</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-px bg-slate-100">
          {cityTimes.map((city) => (
            <div key={city.id} className="bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{city.city}</div>
                  <div className="text-xs text-slate-500">{city.country}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xl font-bold text-indigo-600">{city.time}</div>
                  <div className="text-xs text-slate-500">{city.date}</div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${city.isDaytime ? 'bg-yellow-400' : 'bg-slate-400'}`} />
                <span className="text-[10px] text-slate-400">
                  {city.isDaytime ? 'Daytime' : 'Nighttime'} • UTC{city.offset >= 0 ? '+' : ''}{city.offset}
                </span>
              </div>
            </div>
          ))}
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
                  ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
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
                className="w-full h-16 p-2 text-xs text-slate-600 bg-white border border-slate-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* City Selection */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="text-sm font-semibold text-slate-700 mb-3">Select Cities</div>
        <div className="flex flex-wrap gap-2">
          {CITIES.map((city) => (
            <button
              key={city.timezone + city.city}
              onClick={() => toggleCity(city.timezone)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                selectedCities.includes(city.timezone)
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {city.city}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
})

export default WorldClock
