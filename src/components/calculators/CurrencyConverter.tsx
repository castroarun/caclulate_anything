'use client'

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

interface ExchangeRates {
  [key: string]: number
}

// Static exchange rates (base: USD) - Updated Jan 2025
const EXCHANGE_RATES: ExchangeRates = {
  USD: 1,
  INR: 83.12,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 148.50,
  AUD: 1.53,
  CAD: 1.35,
  CHF: 0.88,
  CNY: 7.24,
  SGD: 1.34,
  AED: 3.67,
  HKD: 7.82,
  NZD: 1.64,
  KRW: 1320.50,
  MXN: 17.15,
  BRL: 4.97,
  ZAR: 18.65,
  THB: 35.20,
  MYR: 4.72,
  PHP: 55.80,
  IDR: 15750,
  SAR: 3.75,
  RUB: 89.50,
  TRY: 30.25,
}

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', flag: '🇨🇭' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
]

const POPULAR_PAIRS = [
  { from: 'USD', to: 'INR' },
  { from: 'EUR', to: 'USD' },
  { from: 'GBP', to: 'USD' },
  { from: 'USD', to: 'JPY' },
  { from: 'EUR', to: 'INR' },
  { from: 'AED', to: 'INR' },
]

export interface CurrencyConverterRef {
  exportToPDF: () => void
  exportToHTML: () => void
  exportToExcel: () => void
  handleClear: () => void
}

const CurrencyConverter = forwardRef<CurrencyConverterRef>(function CurrencyConverter(props, ref) {
  const [amount, setAmount] = useState(1000)
  const [fromCurrency, setFromCurrency] = useState('USD')
  const [toCurrency, setToCurrency] = useState('INR')
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const calculatorRef = useRef<HTMLDivElement>(null)

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calc_currency')
    if (saved) {
      const data = JSON.parse(saved)
      setAmount(data.amount || 1000)
      setFromCurrency(data.fromCurrency || 'USD')
      setToCurrency(data.toCurrency || 'INR')
      setNotes(data.notes || '')
    }
    setIsLoaded(true)
  }, [])

  // Auto-save to localStorage
  useEffect(() => {
    if (!isLoaded) return
    const data = { amount, fromCurrency, toCurrency, notes }
    localStorage.setItem('calc_currency', JSON.stringify(data))
    setLastSaved(new Date().toLocaleTimeString())
  }, [amount, fromCurrency, toCurrency, notes, isLoaded])

  const handleClear = () => {
    setAmount(1000)
    setFromCurrency('USD')
    setToCurrency('INR')
    setNotes('')
    localStorage.removeItem('calc_currency')
  }

  // Conversion calculation
  const convert = (amt: number, from: string, to: string): number => {
    const fromRate = EXCHANGE_RATES[from] || 1
    const toRate = EXCHANGE_RATES[to] || 1
    const usdAmount = amt / fromRate
    return usdAmount * toRate
  }

  const convertedAmount = convert(amount, fromCurrency, toCurrency)
  const exchangeRate = convert(1, fromCurrency, toCurrency)
  const inverseRate = convert(1, toCurrency, fromCurrency)

  const swapCurrencies = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
  }

  const fromCurrencyData = CURRENCIES.find(c => c.code === fromCurrency)
  const toCurrencyData = CURRENCIES.find(c => c.code === toCurrency)

  const formatNumber = (num: number, currency: string): string => {
    const decimals = ['JPY', 'KRW', 'IDR'].includes(currency) ? 0 : 2
    return num.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  }

  // Export functions
  const exportToExcel = () => {
    const csvContent = [
      `Currency Conversion`,
      `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`,
      ``,
      `From Currency,${fromCurrency}`,
      `To Currency,${toCurrency}`,
      `Amount,${amount}`,
      `Converted Amount,${formatNumber(convertedAmount, toCurrency)}`,
      `Exchange Rate,1 ${fromCurrency} = ${formatNumber(exchangeRate, toCurrency)} ${toCurrency}`,
      `Inverse Rate,1 ${toCurrency} = ${formatNumber(inverseRate, fromCurrency)} ${fromCurrency}`,
      ``,
      `All Exchange Rates (Base: USD)`,
      `Currency,Rate`,
      ...Object.entries(EXCHANGE_RATES).map(([code, rate]) => `${code},${rate}`),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Currency_Conversion_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const exportToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Currency Conversion</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 800px; margin: 0 auto; }
          h1 { color: #0ea5e9; font-size: 24px; margin-bottom: 5px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .conversion-box { background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); padding: 25px; border-radius: 16px; color: white; text-align: center; margin: 20px 0; }
          .amount { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
          .rate-info { font-size: 13px; opacity: 0.9; }
          .details { background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; }
          .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
          .row:last-child { border-bottom: none; }
          .label { color: #64748b; }
          .value { font-weight: 600; color: #1e293b; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <h1>Currency Conversion</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>

        <div class="conversion-box">
          <div class="amount">${fromCurrencyData?.symbol}${formatNumber(amount, fromCurrency)} ${fromCurrency}</div>
          <div style="font-size: 20px; margin: 10px 0;">=</div>
          <div class="amount">${toCurrencyData?.symbol}${formatNumber(convertedAmount, toCurrency)} ${toCurrency}</div>
          <div class="rate-info">1 ${fromCurrency} = ${formatNumber(exchangeRate, toCurrency)} ${toCurrency}</div>
        </div>

        <div class="details">
          <div class="row"><span class="label">From Currency</span><span class="value">${fromCurrencyData?.flag} ${fromCurrencyData?.name} (${fromCurrency})</span></div>
          <div class="row"><span class="label">To Currency</span><span class="value">${toCurrencyData?.flag} ${toCurrencyData?.name} (${toCurrency})</span></div>
          <div class="row"><span class="label">Exchange Rate</span><span class="value">1 ${fromCurrency} = ${formatNumber(exchangeRate, toCurrency)} ${toCurrency}</span></div>
          <div class="row"><span class="label">Inverse Rate</span><span class="value">1 ${toCurrency} = ${formatNumber(inverseRate, fromCurrency)} ${fromCurrency}</span></div>
        </div>

        <div class="footer">Generated by AnyCalc | Rates are indicative only</div>
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
        <title>Currency Conversion</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 800px; margin: 0 auto; }
          h1 { color: #0ea5e9; }
          .conversion-box { background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); padding: 25px; border-radius: 16px; color: white; text-align: center; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <h1>Currency Conversion</h1>
        <div class="conversion-box">
          <h2>${fromCurrencyData?.symbol}${formatNumber(amount, fromCurrency)} ${fromCurrency} = ${toCurrencyData?.symbol}${formatNumber(convertedAmount, toCurrency)} ${toCurrency}</h2>
          <p>1 ${fromCurrency} = ${formatNumber(exchangeRate, toCurrency)} ${toCurrency}</p>
        </div>
        <div class="footer">Generated by AnyCalc</div>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Currency_Conversion.html`
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
      {/* Main Conversion Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 space-y-4">
          {/* Amount Input */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className="w-full px-4 py-3 text-2xl font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="Enter amount"
            />
          </div>

          {/* Currency Selectors */}
          <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center">
            {/* From Currency */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">From</label>
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 appearance-none cursor-pointer"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <button
              onClick={swapCurrencies}
              className="mt-5 w-10 h-10 flex items-center justify-center bg-sky-100 hover:bg-sky-200 text-sky-600 rounded-full transition-colors"
              title="Swap currencies"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>

            {/* To Currency */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">To</label>
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 appearance-none cursor-pointer"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="bg-gradient-to-r from-sky-500 to-indigo-600 p-6 text-white">
          <div className="text-center">
            <div className="text-sm opacity-80 mb-1">
              {fromCurrencyData?.flag} {formatNumber(amount, fromCurrency)} {fromCurrency} =
            </div>
            <div className="text-4xl font-bold mb-2">
              {toCurrencyData?.flag} {toCurrencyData?.symbol}{formatNumber(convertedAmount, toCurrency)}
            </div>
            <div className="text-xs opacity-70">
              {toCurrencyData?.name}
            </div>
          </div>

          {/* Exchange Rate Info */}
          <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4 text-center text-sm">
            <div>
              <div className="opacity-70">Exchange Rate</div>
              <div className="font-semibold">1 {fromCurrency} = {formatNumber(exchangeRate, toCurrency)} {toCurrency}</div>
            </div>
            <div>
              <div className="opacity-70">Inverse Rate</div>
              <div className="font-semibold">1 {toCurrency} = {formatNumber(inverseRate, fromCurrency)} {fromCurrency}</div>
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

      {/* Popular Currency Pairs */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="text-sm font-semibold text-slate-700 mb-3">Popular Conversions</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {POPULAR_PAIRS.map((pair, idx) => {
            const rate = convert(1, pair.from, pair.to)
            const fromData = CURRENCIES.find(c => c.code === pair.from)
            const toData = CURRENCIES.find(c => c.code === pair.to)
            return (
              <button
                key={idx}
                onClick={() => {
                  setFromCurrency(pair.from)
                  setToCurrency(pair.to)
                }}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  fromCurrency === pair.from && toCurrency === pair.to
                    ? 'bg-sky-50 border-sky-200'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs text-slate-500 mb-1">
                  {fromData?.flag} {pair.from} → {toData?.flag} {pair.to}
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {formatNumber(rate, pair.to)}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Quick Amount Buttons */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="text-sm font-semibold text-slate-700 mb-3">Quick Amounts ({fromCurrency})</div>
        <div className="flex flex-wrap gap-2">
          {[100, 500, 1000, 5000, 10000, 50000, 100000].map((amt) => (
            <button
              key={amt}
              onClick={() => setAmount(amt)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                amount === amt
                  ? 'bg-sky-50 border-sky-300 text-sky-700 font-medium'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {amt.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* Info Note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex gap-3">
          <span className="text-amber-500">ℹ️</span>
          <div className="text-xs text-amber-800">
            <div className="font-semibold mb-1">Exchange Rate Disclaimer</div>
            <p>These rates are indicative and for reference only. Actual rates may vary based on your bank, payment method, and market conditions. Last updated: Jan 2025.</p>
          </div>
        </div>
      </div>
    </div>
  )
})

export default CurrencyConverter
