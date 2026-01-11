'use client'

import { useState, useMemo } from 'react'
import { Wallet } from 'lucide-react'
import { CalculatorCard, NumberInput, ResultDisplay, ChartDisplay } from '@/components/calculator'
import { calculateLumpsum } from '@/lib/calculations/lumpsum'
import { LumpsumInput } from '@/types'

const DEFAULT_VALUES: LumpsumInput = {
  principal: 500000,
  rate: 12,
  tenure: 10,
}

export default function LumpsumCalculatorPage() {
  const [input, setInput] = useState<LumpsumInput>(DEFAULT_VALUES)

  const result = useMemo(() => calculateLumpsum(input), [input])

  const handleChange = (field: keyof LumpsumInput, value: number) => {
    setInput((prev) => ({ ...prev, [field]: value }))
  }

  const handleShare = () => {
    const params = new URLSearchParams({
      principal: input.principal.toString(),
      rate: input.rate.toString(),
      tenure: input.tenure.toString(),
    })
    const url = `${window.location.origin}/lumpsum?${params.toString()}`
    navigator.clipboard.writeText(url)
    alert('Link copied to clipboard!')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <CalculatorCard
          title="Lumpsum Calculator"
          description="Calculate returns on one-time mutual fund investment"
          icon={<Wallet className="w-5 h-5" />}
          onShare={handleShare}
          resultSlot={
            <ResultDisplay
              primary={result.primary}
              secondary={result.secondary}
            />
          }
          chartSlot={
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Principal vs Returns
              </h3>
              <ChartDisplay data={result.chartData} type="donut" />
            </div>
          }
        >
          {/* Investment Amount */}
          <NumberInput
            label="Investment Amount"
            value={input.principal}
            onChange={(v) => handleChange('principal', v)}
            min={5000}
            max={100000000}
            step={5000}
            sliderStep={50000}
            prefix="₹"
            hint="One-time lumpsum investment"
          />

          {/* Expected Return Rate */}
          <NumberInput
            label="Expected Return Rate"
            value={input.rate}
            onChange={(v) => handleChange('rate', v)}
            min={1}
            max={30}
            step={0.5}
            sliderStep={1}
            suffix="% p.a."
            showSlider={true}
            hint="Expected annual return rate (CAGR)"
          />

          {/* Investment Period */}
          <NumberInput
            label="Investment Period"
            value={input.tenure}
            onChange={(v) => handleChange('tenure', v)}
            min={1}
            max={40}
            step={1}
            suffix="years"
            showSlider={true}
          />
        </CalculatorCard>

        {/* Yearly Growth */}
        <div className="mt-8 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Year-by-Year Growth
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              How your investment grows over time
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Year
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Invested
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Returns
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {result.breakdown.map((row) => (
                  <tr
                    key={row.year}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      Year {row.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-primary-600 dark:text-primary-400">
                      ₹{row.invested.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-green-600 dark:text-green-400">
                      ₹{row.returns.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-900 dark:text-white font-medium">
                      ₹{row.total.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Comparison Note */}
        <div className="mt-8 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            SIP vs Lumpsum
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            A lumpsum investment can generate higher returns if invested at the right time (market low),
            but carries higher timing risk. SIP offers rupee cost averaging which reduces timing risk.
            Consider your risk tolerance and market conditions when choosing between the two.
          </p>
        </div>
      </div>
    </div>
  )
}
