'use client'

import Link from 'next/link'

const POPULAR_CALCULATORS = [
  { id: 'emi', name: 'EMI Calculator', icon: '🏠' },
  { id: 'sip', name: 'SIP Calculator', icon: '📈' },
  { id: 'fd', name: 'FD Calculator', icon: '🏦' },
  { id: 'lumpsum', name: 'Lumpsum', icon: '💰' },
  { id: 'tax', name: 'Tax Planner', icon: '🧮' },
  { id: 'col', name: 'Cost of Living', icon: '🌍' },
  { id: 'clock', name: 'World Clock', icon: '⏰' },
  { id: 'compound', name: 'Compound Interest', icon: '📊' },
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
              <span className="font-display font-bold text-slate-900">Calci</span>
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
          <p className="font-display text-2xl sm:text-3xl font-semibold text-blue-600 italic mb-10">
            Beautifully simple.
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {POPULAR_CALCULATORS.map((calc) => (
              <Link
                key={calc.id}
                href={`/workspace?calc=${calc.id}`}
                className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-sm transition-all group"
              >
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center text-lg group-hover:bg-blue-100 transition-colors">
                  {calc.icon}
                </div>
                <span className="text-sm font-semibold text-slate-900">{calc.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-200 mt-12">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm text-slate-500">
            Calci — Calculate everything. Plan anything.
          </p>
        </div>
      </footer>
    </div>
  )
}
