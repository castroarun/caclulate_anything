'use client'

import { useState, useMemo } from 'react'
import { Calculator } from 'lucide-react'
import { CalculatorCard, NumberInput, ResultDisplay, ChartDisplay } from '@/components/calculator'
import { calculateEMI } from '@/lib/calculations/emi'
import { EMIInput } from '@/types'

const DEFAULT_VALUES: EMIInput = {
  principal: 1000000,
  rate: 8.5,
  tenure: 60,
  tenureUnit: 'months',
}

export default function EMICalculatorPage() {
  const [input, setInput] = useState<EMIInput>(DEFAULT_VALUES)

  const result = useMemo(() => calculateEMI(input), [input])

  const handleChange = (field: keyof EMIInput, value: number | string) => {
    setInput((prev) => ({ ...prev, [field]: value }))
  }

  const handleShare = () => {
    const params = new URLSearchParams({
      principal: input.principal.toString(),
      rate: input.rate.toString(),
      tenure: input.tenure.toString(),
      unit: input.tenureUnit,
    })
    const url = `${window.location.origin}/emi?${params.toString()}`
    navigator.clipboard.writeText(url)
    alert('Link copied to clipboard!')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <CalculatorCard
          title="EMI Calculator"
          description="Calculate your Equated Monthly Installment for loans"
          icon={<Calculator className="w-5 h-5" />}
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
                Payment Breakdown
              </h3>
              <ChartDisplay data={result.chartData} type="donut" />
            </div>
          }
        >
          {/* Loan Amount */}
          <NumberInput
            label="Loan Amount"
            value={input.principal}
            onChange={(v) => handleChange('principal', v)}
            min={10000}
            max={100000000}
            step={10000}
            sliderStep={100000}
            prefix="₹"
            hint="Enter the total loan amount"
          />

          {/* Interest Rate */}
          <NumberInput
            label="Interest Rate (Annual)"
            value={input.rate}
            onChange={(v) => handleChange('rate', v)}
            min={0.1}
            max={30}
            step={0.1}
            sliderStep={0.5}
            suffix="% p.a."
            showSlider={true}
          />

          {/* Tenure */}
          <div className="space-y-2">
            <NumberInput
              label="Loan Tenure"
              value={input.tenure}
              onChange={(v) => handleChange('tenure', v)}
              min={input.tenureUnit === 'years' ? 1 : 1}
              max={input.tenureUnit === 'years' ? 30 : 360}
              step={1}
              suffix={input.tenureUnit}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (input.tenureUnit === 'years') {
                    setInput((prev) => ({
                      ...prev,
                      tenureUnit: 'months',
                      tenure: prev.tenure * 12,
                    }))
                  }
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  input.tenureUnit === 'months'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Months
              </button>
              <button
                onClick={() => {
                  if (input.tenureUnit === 'months') {
                    setInput((prev) => ({
                      ...prev,
                      tenureUnit: 'years',
                      tenure: Math.round(prev.tenure / 12),
                    }))
                  }
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  input.tenureUnit === 'years'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Years
              </button>
            </div>
          </div>
        </CalculatorCard>

        {/* Amortization Schedule Preview */}
        <div className="mt-8 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Amortization Schedule
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Month-by-month breakdown of your payments
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Month
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    EMI
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Principal
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Interest
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {result.breakdown.slice(0, 12).map((row) => (
                  <tr
                    key={row.month}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {row.month}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-900 dark:text-white">
                      ₹{row.emi.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-primary-600 dark:text-primary-400">
                      ₹{row.principal.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-amber-600 dark:text-amber-400">
                      ₹{row.interest.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-500 dark:text-gray-400">
                      ₹{row.balance.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.breakdown.length > 12 && (
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing first 12 months of {result.breakdown.length} total months
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
