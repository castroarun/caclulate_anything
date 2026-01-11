'use client'

import { useState, useMemo } from 'react'
import { Landmark } from 'lucide-react'
import { CalculatorCard, NumberInput, ResultDisplay, ChartDisplay } from '@/components/calculator'
import { calculateFD } from '@/lib/calculations/fd'
import { FDInput } from '@/types'

const DEFAULT_VALUES: FDInput = {
  principal: 100000,
  rate: 7.5,
  tenure: 12,
  tenureUnit: 'months',
  compoundingFrequency: 'quarterly',
}

export default function FDCalculatorPage() {
  const [input, setInput] = useState<FDInput>(DEFAULT_VALUES)

  const result = useMemo(() => calculateFD(input), [input])

  const handleChange = (field: keyof FDInput, value: number | string) => {
    setInput((prev) => ({ ...prev, [field]: value }))
  }

  const handleShare = () => {
    const params = new URLSearchParams({
      principal: input.principal.toString(),
      rate: input.rate.toString(),
      tenure: input.tenure.toString(),
      unit: input.tenureUnit,
      frequency: input.compoundingFrequency,
    })
    const url = `${window.location.origin}/fd?${params.toString()}`
    navigator.clipboard.writeText(url)
    alert('Link copied to clipboard!')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <CalculatorCard
          title="FD Calculator"
          description="Calculate Fixed Deposit maturity amount and interest earned"
          icon={<Landmark className="w-5 h-5" />}
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
                Principal vs Interest
              </h3>
              <ChartDisplay data={result.chartData} type="donut" />
            </div>
          }
        >
          {/* Principal Amount */}
          <NumberInput
            label="Principal Amount"
            value={input.principal}
            onChange={(v) => handleChange('principal', v)}
            min={1000}
            max={100000000}
            step={1000}
            sliderStep={10000}
            prefix="₹"
            hint="Initial deposit amount"
          />

          {/* Interest Rate */}
          <NumberInput
            label="Interest Rate (Annual)"
            value={input.rate}
            onChange={(v) => handleChange('rate', v)}
            min={1}
            max={15}
            step={0.1}
            sliderStep={0.25}
            suffix="% p.a."
            showSlider={true}
          />

          {/* Tenure */}
          <div className="space-y-2">
            <NumberInput
              label="Tenure"
              value={input.tenure}
              onChange={(v) => handleChange('tenure', v)}
              min={1}
              max={input.tenureUnit === 'years' ? 20 : input.tenureUnit === 'months' ? 120 : 365}
              step={1}
              suffix={input.tenureUnit}
            />
            <div className="flex gap-2">
              {(['months', 'years', 'days'] as const).map((unit) => (
                <button
                  key={unit}
                  onClick={() => handleChange('tenureUnit', unit)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                    input.tenureUnit === unit
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {unit.charAt(0).toUpperCase() + unit.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Compounding Frequency */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Compounding Frequency
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'monthly', label: 'Monthly' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'halfYearly', label: 'Half-Yearly' },
                { value: 'yearly', label: 'Yearly' },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleChange('compoundingFrequency', option.value)}
                  className={`py-2 text-sm font-medium rounded-lg transition-colors ${
                    input.compoundingFrequency === option.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </CalculatorCard>

        {/* FD Info Section */}
        <div className="mt-8 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            About Fixed Deposits
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Key Features</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• Guaranteed returns with fixed interest rate</li>
                <li>• DICGC insurance up to ₹5 lakh per bank</li>
                <li>• Premature withdrawal with penalty</li>
                <li>• Senior citizens get 0.25-0.5% extra interest</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Tax Implications</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• Interest income is taxable as per slab</li>
                <li>• TDS @10% if interest exceeds ₹40,000/year</li>
                <li>• Tax-saving FDs have 5-year lock-in (80C)</li>
                <li>• Form 15G/15H to avoid TDS if eligible</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
