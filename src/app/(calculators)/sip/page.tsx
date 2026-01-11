'use client'

import { useState, useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import { CalculatorCard, NumberInput, ResultDisplay, ChartDisplay } from '@/components/calculator'
import { calculateSIP } from '@/lib/calculations/sip'
import { SIPInput } from '@/types'

const DEFAULT_VALUES: SIPInput = {
  monthlyAmount: 10000,
  rate: 12,
  tenure: 10,
  stepUp: 0,
}

export default function SIPCalculatorPage() {
  const [input, setInput] = useState<SIPInput>(DEFAULT_VALUES)

  const result = useMemo(() => calculateSIP(input), [input])

  const handleChange = (field: keyof SIPInput, value: number) => {
    setInput((prev) => ({ ...prev, [field]: value }))
  }

  const handleShare = () => {
    const params = new URLSearchParams({
      amount: input.monthlyAmount.toString(),
      rate: input.rate.toString(),
      tenure: input.tenure.toString(),
      stepUp: (input.stepUp ?? 0).toString(),
    })
    const url = `${window.location.origin}/sip?${params.toString()}`
    navigator.clipboard.writeText(url)
    alert('Link copied to clipboard!')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <CalculatorCard
          title="SIP Calculator"
          description="Calculate Systematic Investment Plan returns with step-up option"
          icon={<TrendingUp className="w-5 h-5" />}
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
                Investment vs Returns
              </h3>
              <ChartDisplay data={result.chartData} type="donut" />
            </div>
          }
        >
          {/* Monthly Investment */}
          <NumberInput
            label="Monthly Investment"
            value={input.monthlyAmount}
            onChange={(v) => handleChange('monthlyAmount', v)}
            min={500}
            max={1000000}
            step={500}
            sliderStep={1000}
            prefix="₹"
            hint="Amount you invest every month"
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

          {/* Step-Up Percentage */}
          <NumberInput
            label="Annual Step-Up"
            value={input.stepUp ?? 0}
            onChange={(v) => handleChange('stepUp', v)}
            min={0}
            max={25}
            step={1}
            suffix="% yearly"
            showSlider={true}
            hint="Increase SIP amount annually by this percentage"
          />
        </CalculatorCard>

        {/* Yearly Breakdown */}
        <div className="mt-8 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Yearly Breakdown
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Year-by-year growth of your investment
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
      </div>
    </div>
  )
}
