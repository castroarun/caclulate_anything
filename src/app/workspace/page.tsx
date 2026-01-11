'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import EMICalculator from '@/components/calculators/EMICalculator'
import SIPCalculator from '@/components/calculators/SIPCalculator'
import FDCalculator from '@/components/calculators/FDCalculator'
import LumpsumCalculator from '@/components/calculators/LumpsumCalculator'
import CompoundCalculator from '@/components/calculators/CompoundCalculator'
import PPFCalculator from '@/components/calculators/PPFCalculator'
import RDCalculator from '@/components/calculators/RDCalculator'
import CAGRCalculator from '@/components/calculators/CAGRCalculator'
import GratuityCalculator from '@/components/calculators/GratuityCalculator'
import HRACalculator from '@/components/calculators/HRACalculator'
import GSTCalculator from '@/components/calculators/GSTCalculator'
import TaxCalculator from '@/components/calculators/TaxCalculator'
import SalaryCalculator from '@/components/calculators/SalaryCalculator'
import GoalCalculator from '@/components/calculators/GoalCalculator'
import WorldClock from '@/components/calculators/WorldClock'
import COLCalculator from '@/components/calculators/COLCalculator'
import TripCalculator from '@/components/calculators/TripCalculator'
import CurrencyConverter from '@/components/calculators/CurrencyConverter'

// Calculator definitions with accent colors
const CALCULATOR_GROUPS = [
  {
    name: 'Financial',
    items: [
      { id: 'emi', name: 'EMI Calculator', icon: '🏠', accent: 'blue', accentBg: 'bg-blue-50', accentText: 'text-blue-600', accentBorder: 'border-blue-200' },
      { id: 'sip', name: 'SIP Calculator', icon: '📈', accent: 'emerald', accentBg: 'bg-emerald-50', accentText: 'text-emerald-600', accentBorder: 'border-emerald-200' },
      { id: 'fd', name: 'FD Calculator', icon: '🏦', accent: 'amber', accentBg: 'bg-amber-50', accentText: 'text-amber-600', accentBorder: 'border-amber-200' },
      { id: 'lumpsum', name: 'Lumpsum', icon: '💰', accent: 'violet', accentBg: 'bg-violet-50', accentText: 'text-violet-600', accentBorder: 'border-violet-200' },
      { id: 'compound', name: 'Compound Interest', icon: '📊', accent: 'rose', accentBg: 'bg-rose-50', accentText: 'text-rose-600', accentBorder: 'border-rose-200' },
      { id: 'ppf', name: 'PPF Calculator', icon: '🏛️', accent: 'indigo', accentBg: 'bg-indigo-50', accentText: 'text-indigo-600', accentBorder: 'border-indigo-200' },
      { id: 'rd', name: 'RD Calculator', icon: '📅', accent: 'purple', accentBg: 'bg-purple-50', accentText: 'text-purple-600', accentBorder: 'border-purple-200' },
      { id: 'cagr', name: 'CAGR Calculator', icon: '📉', accent: 'lime', accentBg: 'bg-lime-50', accentText: 'text-lime-600', accentBorder: 'border-lime-200' },
      { id: 'gratuity', name: 'Gratuity', icon: '🎁', accent: 'fuchsia', accentBg: 'bg-fuchsia-50', accentText: 'text-fuchsia-600', accentBorder: 'border-fuchsia-200' },
      { id: 'hra', name: 'HRA Exemption', icon: '🏘️', accent: 'yellow', accentBg: 'bg-yellow-50', accentText: 'text-yellow-600', accentBorder: 'border-yellow-200' },
      { id: 'gst', name: 'GST Calculator', icon: '🧾', accent: 'red', accentBg: 'bg-red-50', accentText: 'text-red-600', accentBorder: 'border-red-200' },
    ],
  },
  {
    name: 'Tax & Planning',
    items: [
      { id: 'tax', name: 'Tax Planner', icon: '🧮', accent: 'cyan', accentBg: 'bg-cyan-50', accentText: 'text-cyan-600', accentBorder: 'border-cyan-200' },
      { id: 'salary', name: 'Salary Breakdown', icon: '💼', accent: 'orange', accentBg: 'bg-orange-50', accentText: 'text-orange-600', accentBorder: 'border-orange-200' },
      { id: 'goal', name: 'Goal Planner', icon: '🎯', accent: 'pink', accentBg: 'bg-pink-50', accentText: 'text-pink-600', accentBorder: 'border-pink-200' },
    ],
  },
  {
    name: 'Time & Utility',
    items: [
      { id: 'clock', name: 'World Clock', icon: '⏰', accent: 'indigo', accentBg: 'bg-indigo-50', accentText: 'text-indigo-600', accentBorder: 'border-indigo-200' },
      { id: 'col', name: 'Cost of Living', icon: '🌍', accent: 'teal', accentBg: 'bg-teal-50', accentText: 'text-teal-600', accentBorder: 'border-teal-200' },
      { id: 'trip', name: 'Trip Planner', icon: '✈️', accent: 'sky', accentBg: 'bg-sky-50', accentText: 'text-sky-600', accentBorder: 'border-sky-200' },
      { id: 'currency', name: 'Currency Converter', icon: '💱', accent: 'cyan', accentBg: 'bg-cyan-50', accentText: 'text-cyan-600', accentBorder: 'border-cyan-200' },
    ],
  },
]

// Get all calculators flat
const ALL_CALCULATORS = CALCULATOR_GROUPS.flatMap((g) => g.items)

function WorkspaceContent() {
  const searchParams = useSearchParams()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [activeCalc, setActiveCalc] = useState('emi')
  const [savedData, setSavedData] = useState<Record<string, boolean>>({})
  const [favorites, setFavorites] = useState<string[]>([])
  const calculatorRef = useRef<{ exportToPDF?: () => void; exportToHTML?: () => void; exportToExcel?: () => void; handleClear?: () => void } | null>(null)

  // Set active calculator from URL params
  useEffect(() => {
    const calc = searchParams.get('calc')
    if (calc && ALL_CALCULATORS.find((c) => c.id === calc)) {
      setActiveCalc(calc)
    }
  }, [searchParams])

  // Load saved data indicators and favorites from localStorage
  useEffect(() => {
    const saved: Record<string, boolean> = {}
    ALL_CALCULATORS.forEach((calc) => {
      const data = localStorage.getItem(`calc_${calc.id}`)
      if (data) saved[calc.id] = true
    })
    setSavedData(saved)

    // Load favorites
    const savedFavorites = localStorage.getItem('calc_favorites')
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites))
    }
  }, [])

  const handleClearAll = () => {
    if (confirm('Clear all saved calculator data?')) {
      ALL_CALCULATORS.forEach((calc) => {
        localStorage.removeItem(`calc_${calc.id}`)
      })
      setSavedData({})
    }
  }

  const toggleFavorite = (calcId: string) => {
    const newFavorites = favorites.includes(calcId)
      ? favorites.filter((id) => id !== calcId)
      : [...favorites, calcId]
    setFavorites(newFavorites)
    localStorage.setItem('calc_favorites', JSON.stringify(newFavorites))
  }

  const handleShareURL = () => {
    const url = `${window.location.origin}/workspace?calc=${activeCalc}`
    navigator.clipboard.writeText(url)
    alert('Calculator URL copied to clipboard!')
  }

  const handleDownloadReport = () => {
    if (calculatorRef.current?.exportToPDF) {
      calculatorRef.current.exportToPDF()
    }
  }

  const handleClearCalculator = () => {
    if (calculatorRef.current?.handleClear) {
      calculatorRef.current.handleClear()
    }
  }

  const activeCalculator = ALL_CALCULATORS.find((c) => c.id === activeCalc)
  const favoriteCalculators = ALL_CALCULATORS.filter((c) => favorites.includes(c.id))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Auth Strip */}
      <header className="fixed top-0 left-0 right-0 h-[52px] bg-white border-b border-slate-200 z-50 flex items-center justify-between px-3 md:px-4">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {mobileSidebarOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
              C
            </div>
            <span className="font-display font-bold text-slate-900 text-sm">Calci</span>
          </Link>
          <span className="text-slate-400 text-sm border-l border-slate-200 pl-4 hidden sm:inline">
            Workspace
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={handleClearAll}
            className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors hidden sm:block"
          >
            Clear All
          </button>
          <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer">
            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-semibold text-blue-600">
              G
            </div>
            <span className="text-sm font-medium text-slate-700 hidden sm:inline">Guest</span>
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <div className="flex pt-[52px]">
        {/* Sidebar */}
        <aside
          className={`fixed top-[52px] left-0 bottom-0 bg-white border-r border-slate-200 transition-all duration-200 z-40
            ${sidebarCollapsed ? 'w-10' : 'w-[260px]'}
            ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          {/* Toggle Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-3 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 text-xs z-50 transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>

          {sidebarCollapsed ? (
            /* Collapsed State - Vertical Text */
            <div
              className="h-full flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setSidebarCollapsed(false)}
            >
              <span
                className="text-xs text-slate-400 font-medium tracking-wide"
                style={{
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed',
                  transform: 'rotate(180deg)',
                }}
              >
                Click for calculators
              </span>
            </div>
          ) : (
            /* Expanded State */
            <>
              {/* Search */}
              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Search calculators..."
                    className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Calculator Groups */}
              <div className="overflow-y-auto h-[calc(100%-56px)]">
                {/* Favorites Group - Only show if there are favorites */}
                {favoriteCalculators.length > 0 && (
                  <div className="py-2 border-b border-slate-100">
                    <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase text-amber-500 flex items-center gap-1">
                      <span>★</span> Favorites
                    </div>
                    <ul>
                      {favoriteCalculators.map((calc) => (
                        <li
                          key={`fav-${calc.id}`}
                          onClick={() => setActiveCalc(calc.id)}
                          className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-l-2 transition-all group ${
                            activeCalc === calc.id
                              ? `${calc.accentBg} ${calc.accentText} border-current font-medium`
                              : 'text-slate-600 border-transparent hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-base w-5 text-center">{calc.icon}</span>
                          <span className="flex-1 truncate">{calc.name}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(calc.id) }}
                            className="text-amber-400 hover:text-amber-500 opacity-70 group-hover:opacity-100"
                            title="Remove from favorites"
                          >
                            ★
                          </button>
                          {savedData[calc.id] && (
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Regular Calculator Groups */}
                {CALCULATOR_GROUPS.map((group) => (
                  <div key={group.name} className="py-2">
                    <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase text-slate-400">
                      {group.name}
                    </div>
                    <ul>
                      {group.items.map((calc) => (
                        <li
                          key={calc.id}
                          onClick={() => setActiveCalc(calc.id)}
                          className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-l-2 transition-all group ${
                            activeCalc === calc.id
                              ? `${calc.accentBg} ${calc.accentText} border-current font-medium`
                              : 'text-slate-600 border-transparent hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-base w-5 text-center">{calc.icon}</span>
                          <span className="flex-1 truncate">{calc.name}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(calc.id) }}
                            className={`transition-all ${
                              favorites.includes(calc.id)
                                ? 'text-amber-400 hover:text-amber-500'
                                : 'text-slate-300 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                            }`}
                            title={favorites.includes(calc.id) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            {favorites.includes(calc.id) ? '★' : '☆'}
                          </button>
                          {savedData[calc.id] && (
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>

        {/* Main Content */}
        <main
          className={`flex-1 transition-all duration-200 ${
            sidebarCollapsed ? 'ml-10' : 'ml-[260px]'
          }`}
        >
          <div className="max-w-4xl mx-auto p-6">
            {/* Calculator Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${activeCalculator?.accentBg || 'bg-blue-50'} rounded-xl flex items-center justify-center text-xl`}>
                  {activeCalculator?.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold text-slate-900">
                      {activeCalculator?.name}
                    </h1>
                    <button
                      onClick={() => toggleFavorite(activeCalc)}
                      className={`text-lg ${favorites.includes(activeCalc) ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}`}
                      title={favorites.includes(activeCalc) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {favorites.includes(activeCalc) ? '★' : '☆'}
                    </button>
                  </div>
                  <p className="text-sm text-slate-500">
                    {activeCalc === 'emi' && 'Calculate your monthly loan payment'}
                    {activeCalc === 'sip' && 'Plan your systematic investments'}
                    {activeCalc === 'fd' && 'Calculate fixed deposit returns'}
                    {activeCalc === 'lumpsum' && 'Calculate one-time investment growth'}
                    {activeCalc === 'compound' && 'See the power of compound interest'}
                    {activeCalc === 'ppf' && 'Calculate PPF returns with tax benefits'}
                    {activeCalc === 'rd' && 'Plan your recurring deposits'}
                    {activeCalc === 'cagr' && 'Find your compound annual growth rate'}
                    {activeCalc === 'gratuity' && 'Estimate your gratuity payout'}
                    {activeCalc === 'hra' && 'Calculate HRA tax exemption'}
                    {activeCalc === 'gst' && 'Add or remove GST from prices'}
                    {activeCalc === 'tax' && 'Compare old vs new tax regime'}
                    {activeCalc === 'salary' && 'See your CTC to take-home breakdown'}
                    {activeCalc === 'goal' && 'Plan your financial goals'}
                    {activeCalc === 'clock' && 'Track time across the world'}
                    {activeCalc === 'col' && 'Compare cost of living between cities'}
                    {activeCalc === 'trip' && 'Plan your travel budget'}
                    {activeCalc === 'currency' && 'Convert between 24+ currencies'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Export dropdown for all calculators */}
                <div className="flex items-center gap-1 mr-2">
                  <span className="text-[10px] text-slate-400">Export:</span>
                  <button
                    onClick={() => calculatorRef.current?.exportToPDF?.()}
                    className="px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Export as PDF"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => calculatorRef.current?.exportToHTML?.()}
                    className="px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Export as HTML"
                  >
                    HTML
                  </button>
                  <button
                    onClick={() => calculatorRef.current?.exportToExcel?.()}
                    className="px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                    title="Export as CSV/Excel"
                  >
                    CSV
                  </button>
                </div>
                <button
                  onClick={handleClearCalculator}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-red-500 bg-white border border-slate-200 rounded-md hover:border-red-200 hover:bg-red-50 transition-colors"
                  title="Clear calculator data"
                >
                  Clear
                </button>
                <button
                  onClick={handleShareURL}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 bg-white border border-slate-200 rounded-md hover:border-blue-200 hover:bg-blue-50 transition-colors"
                  title="Copy share URL"
                >
                  ↗
                </button>
                <button
                  onClick={handleDownloadReport}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-green-600 bg-white border border-slate-200 rounded-md hover:border-green-200 hover:bg-green-50 transition-colors"
                  title="Download PDF report"
                >
                  ⬇
                </button>
              </div>
            </div>

            {/* Calculator Component */}
            {activeCalc === 'emi' && <EMICalculator ref={calculatorRef as React.RefObject<{ exportToPDF: () => void; exportToHTML: () => void; exportToExcel: () => void; handleClear: () => void }>} />}
            {activeCalc === 'sip' && <SIPCalculator ref={calculatorRef as React.RefObject<{ exportToPDF: () => void; exportToHTML: () => void; exportToExcel: () => void; handleClear: () => void }>} />}
            {activeCalc === 'fd' && <FDCalculator ref={calculatorRef as React.RefObject<{ exportToPDF: () => void; exportToHTML: () => void; exportToExcel: () => void; handleClear: () => void }>} />}
            {activeCalc === 'lumpsum' && <LumpsumCalculator ref={calculatorRef as React.RefObject<{ exportToPDF: () => void; exportToHTML: () => void; exportToExcel: () => void; handleClear: () => void }>} />}
            {activeCalc === 'compound' && <CompoundCalculator ref={calculatorRef as React.RefObject<{ exportToPDF: () => void; exportToHTML: () => void; exportToExcel: () => void; handleClear: () => void }>} />}
            {activeCalc === 'ppf' && <PPFCalculator ref={calculatorRef as React.RefObject<{ exportToPDF: () => void; exportToHTML: () => void; exportToExcel: () => void; handleClear: () => void }>} />}
            {activeCalc === 'rd' && <RDCalculator ref={calculatorRef as React.RefObject<{ exportToPDF: () => void; exportToHTML: () => void; exportToExcel: () => void; handleClear: () => void }>} />}
            {activeCalc === 'cagr' && <CAGRCalculator ref={calculatorRef as React.RefObject<{ exportToPDF: () => void; exportToHTML: () => void; exportToExcel: () => void; handleClear: () => void }>} />}
            {activeCalc === 'gratuity' && <GratuityCalculator ref={calculatorRef as React.RefObject<{ exportToPDF: () => void; exportToHTML: () => void; exportToExcel: () => void; handleClear: () => void }>} />}
            {activeCalc === 'hra' && <HRACalculator ref={calculatorRef as React.RefObject<{ exportToPDF: () => void; exportToHTML: () => void; exportToExcel: () => void; handleClear: () => void }>} />}
            {activeCalc === 'gst' && <GSTCalculator ref={calculatorRef as React.RefObject<{ exportToPDF: () => void; exportToHTML: () => void; exportToExcel: () => void; handleClear: () => void }>} />}
            {activeCalc === 'tax' && <TaxCalculator ref={calculatorRef as React.RefObject<{ exportToPDF: () => void; exportToHTML: () => void; exportToExcel: () => void; handleClear: () => void }>} />}
            {activeCalc === 'salary' && <SalaryCalculator ref={calculatorRef as React.RefObject<{ exportToPDF: () => void; exportToHTML: () => void; exportToExcel: () => void; handleClear: () => void }>} />}
            {activeCalc === 'goal' && <GoalCalculator ref={calculatorRef as React.RefObject<{ exportToPDF: () => void; exportToHTML: () => void; exportToExcel: () => void; handleClear: () => void }>} />}
            {activeCalc === 'clock' && <WorldClock ref={calculatorRef as React.RefObject<{ exportToPDF: () => void; exportToHTML: () => void; exportToExcel: () => void; handleClear: () => void }>} />}
            {activeCalc === 'col' && <COLCalculator ref={calculatorRef as React.RefObject<{ exportToPDF: () => void; exportToHTML: () => void; exportToExcel: () => void; handleClear: () => void }>} />}
            {activeCalc === 'trip' && <TripCalculator ref={calculatorRef as React.RefObject<{ exportToPDF: () => void; exportToHTML: () => void; exportToExcel: () => void; handleClear: () => void }>} />}
            {activeCalc === 'currency' && <CurrencyConverter ref={calculatorRef as React.RefObject<{ exportToPDF: () => void; exportToHTML: () => void; exportToExcel: () => void; handleClear: () => void }>} />}

            {/* About & Sources - Collapsible */}
            <AboutSources />

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400">
                Calci — Calculate everything. Plan anything.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// About & Sources Component
function AboutSources() {
  const [isOpen, setIsOpen] = useState(false)

  const DATA_SOURCES = [
    {
      category: 'Government Rates',
      items: [
        { name: 'PPF Interest Rate', value: '7.1% p.a.', source: 'Ministry of Finance, Q4 FY25', url: 'https://www.nsiindia.gov.in' },
        { name: 'Income Tax Slabs', value: 'FY 2024-25', source: 'Income Tax Department', url: 'https://incometaxindia.gov.in' },
        { name: 'GST Rates', value: '0%, 5%, 12%, 18%, 28%', source: 'GST Council', url: 'https://gstcouncil.gov.in' },
        { name: 'Gratuity Tax Exemption', value: '₹20 Lakhs', source: 'Payment of Gratuity Act', url: null },
        { name: 'Section 80C Limit', value: '₹1.5 Lakhs', source: 'Income Tax Act', url: null },
        { name: 'Section 80D Limit', value: '₹25K / ₹50K (Senior)', source: 'Income Tax Act', url: null },
      ],
    },
    {
      category: 'Market Rates (Indicative)',
      items: [
        { name: 'Currency Exchange Rates', value: '24 currencies', source: 'Static rates, Jan 2025', url: null, note: 'For reference only. Actual rates vary.' },
        { name: 'FD Interest Rates', value: '6-7% typical', source: 'Bank averages', url: null },
        { name: 'Expected Returns (SIP/Lumpsum)', value: 'User input', source: 'Historical Nifty ~12%', url: null },
      ],
    },
    {
      category: 'Reference Data',
      items: [
        { name: 'Cost of Living Index', value: '28 Indian cities', source: 'Numbeo, Mercer COL surveys', url: 'https://www.numbeo.com', note: 'Base: Mumbai = 100' },
        { name: 'HRA Exemption Rules', value: 'Metro 50%, Non-Metro 40%', source: 'Income Tax Act Sec 10(13A)', url: null },
        { name: 'EPF Contribution', value: '12% of Basic', source: 'EPFO Guidelines', url: 'https://www.epfindia.gov.in' },
        { name: 'Professional Tax', value: '₹2,400/year (max)', source: 'State-wise limits', url: null },
      ],
    },
    {
      category: 'Calculation Methods',
      items: [
        { name: 'EMI Formula', value: 'P × r × (1+r)^n / ((1+r)^n - 1)', source: 'Standard amortization', url: null },
        { name: 'Compound Interest', value: 'A = P(1 + r/n)^(nt)', source: 'Standard formula', url: null },
        { name: 'CAGR', value: '(Final/Initial)^(1/years) - 1', source: 'Standard formula', url: null },
        { name: 'Gratuity', value: '(15 × Salary × Years) / 26', source: 'Gratuity Act formula', url: null },
        { name: 'PPF Compounding', value: 'Annual, on min balance', source: 'PPF Scheme rules', url: null },
        { name: 'RD Compounding', value: 'Quarterly', source: 'Bank RD rules', url: null },
      ],
    },
  ]

  return (
    <div className="mt-8 border border-slate-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-slate-400">ℹ️</span>
          <span className="text-sm font-medium text-slate-700">About & Data Sources</span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <div className="pt-4 space-y-6">
            {/* Disclaimer */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex gap-2">
                <span className="text-amber-500 text-sm">⚠️</span>
                <div className="text-xs text-amber-800">
                  <strong>Disclaimer:</strong> All calculations are for informational purposes only.
                  Rates and data are static snapshots and may not reflect current values.
                  Please verify with official sources before making financial decisions.
                </div>
              </div>
            </div>

            {/* Data Sources by Category */}
            {DATA_SOURCES.map((category) => (
              <div key={category.category}>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {category.category}
                </h4>
                <div className="space-y-1">
                  {category.items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-slate-700">{item.name}</span>
                          <span className="px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded">
                            {item.value}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {item.url ? (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              {item.source} ↗
                            </a>
                          ) : (
                            item.source
                          )}
                          {item.note && <span className="text-slate-400"> — {item.note}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Last Updated */}
            <div className="pt-3 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400">
                Data last reviewed: January 2025 • Built with Next.js & Tailwind CSS
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>}>
      <WorkspaceContent />
    </Suspense>
  )
}
