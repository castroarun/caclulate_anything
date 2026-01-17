'use client'

import Link from 'next/link'

const POPULAR_CALCULATORS = [
  { id: 'emi', name: 'EMI Calculator', icon: '🏠', tagline: 'Plan your loan repayments' },
  { id: 'sip', name: 'SIP Calculator', icon: '📈', tagline: 'Grow wealth systematically' },
  { id: 'fd', name: 'FD Calculator', icon: '🏦', tagline: 'Maximize fixed returns' },
  { id: 'lumpsum', name: 'Lumpsum', icon: '💰', tagline: 'One-time investment growth' },
  { id: 'tax', name: 'Tax Planner', icon: '🧮', tagline: 'Optimize your tax savings' },
  { id: 'col', name: 'Cost of Living', icon: '🌍', tagline: 'Compare city expenses' },
  { id: 'clock', name: 'World Clock', icon: '⏰', tagline: 'Track global time zones' },
  { id: 'compound', name: 'Compound Interest', icon: '📊', tagline: 'See the power of compounding' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-14">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                C
              </div>
              <span className="font-display font-bold text-slate-900">AnyCalc</span>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="#features"
                className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-50 transition-colors"
              >
                Features
              </Link>
              <Link
                href="#about"
                className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-50 transition-colors"
              >
                About
              </Link>
              <Link
                href="/workspace"
                className="ml-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 sm:py-32 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-display text-5xl sm:text-6xl font-bold text-slate-900 tracking-tight leading-[1.1] mb-6">
            Calculate everything,
            <br />
            <span className="text-blue-600">plan anything.</span>
          </h1>
          <p className="font-display text-2xl sm:text-3xl font-semibold mb-10">
            <span className="text-slate-900">Beautifully</span> <span className="text-blue-600">simple.</span>
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/workspace"
              className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Open Workspace
              <span>→</span>
            </Link>
            <Link
              href="#calculators"
              className="px-6 py-3 text-base font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Popular Calculators */}
      <section id="calculators" className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-semibold tracking-widest uppercase text-slate-400">
              Popular Calculators
            </h2>
            <Link
              href="/workspace"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {POPULAR_CALCULATORS.map((calc) => (
              <Link
                key={calc.id}
                href={`/workspace?calc=${calc.id}`}
                className="flex flex-col p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-xl group-hover:bg-blue-100 transition-colors">
                    {calc.icon}
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{calc.name}</span>
                </div>
                <p className="text-xs text-slate-500 pl-[52px]">{calc.tagline}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-200 mt-12">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm text-slate-500">
            AnyCalc — Calculate everything. Plan anything.
          </p>
        </div>
      </footer>
    </div>
  )
}
