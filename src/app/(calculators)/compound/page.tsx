'use client'

import { useState, useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import { CalculatorCard, NumberInput, ResultDisplay, ChartDisplay } from '@/components/calculator'
import { calculateCompound, compareInterest } from '@/lib/calculations/compound'
import { CompoundInput } from '@/types'
import { formatCurrency } from '@/lib/utils/formatters'

const DEFAULT_VALUES: CompoundInput = {
  principal: 100000,
  rate: 8,
  tenure: 5,
  compoundingFrequency: 'yearly',
}

export default function CompoundCalculatorPage() {
  const [input, setInput] = useState<CompoundInput>(DEFAULT_VALUES)

  const result = useMemo(() => calculateCompound(input), [input])
  const comparison = useMemo(
    () => compareInterest(input.principal, input.rate, input.tenure, input.compoundingFrequency),
    [input]
  )

  const handleChange = (field: keyof CompoundInput, value: number | string) => {
    setInput((prev) => ({ ...prev, [field]: value }))
  }

  const handleShare = () => {
    const params = new URLSearchParams({
      principal: input.principal.toString(),
      rate: input.rate.toString(),
      tenure: input.tenure.toString(),
      frequency: input.compoundingFrequency,
    })
    const url = `${window.location.origin}/compound?${params.toString()}`
    navigator.clipboard.writeText(url)
    alert('Link copied to clipboard!')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <CalculatorCard
          title="Compound Interest Calculator"
          description="See the power of compounding with different frequencies"
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
            hint="Initial investment amount"
          />

          {/* Interest Rate */}
          <NumberInput
            label="Interest Rate (Annual)"
            value={input.rate}
            onChange={(v) => handleChange('rate', v)}
            min={1}
            max={30}
            step={0.1}
            sliderStep={0.5}
            suffix="% p.a."
            showSlider={true}
          />

          {/* Time Period */}
          <NumberInput
            label="Time Period"
            value={input.tenure}
            onChange={(v) => handleChange('tenure', v)}
            min={1}
            max={50}
            step={1}
            suffix="years"
            showSlider={true}
          />

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

        {/* Compound vs Simple Interest Comparison */}
        <div className="mt-8 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Compound vs Simple Interest
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Compound Interest</p>
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {formatCurrency(comparison.compound)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Simple Interest</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(comparison.simple)}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Extra Earnings</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(comparison.difference)}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                +{comparison.differencePercent.toFixed(1)}% more
              </p>
            </div>
          </div>
        </div>

        {/* The Power of Compounding */}
        <div className="mt-8 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 rounded-2xl border border-teal-200 dark:border-teal-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            The Magic of Compound Interest
          </h2>
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
            <p>
              <strong className="text-gray-900 dark:text-white">Einstein&apos;s Quote:</strong> "Compound interest is the eighth wonder of the world. He who understands it, earns it; he who doesn&apos;t, pays it."
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Key Factors</h3>
                <ul className="space-y-1">
                  <li>• <strong>Time:</strong> Longer duration = exponential growth</li>
                  <li>• <strong>Rate:</strong> Higher rate = faster compounding</li>
                  <li>• <strong>Frequency:</strong> More frequent = better returns</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Rule of 72</h3>
                <p>
                  To estimate how long it takes to double your money: <br />
                  <strong>Years to double = 72 ÷ Interest Rate</strong><br />
                  At {input.rate}% rate, your money doubles in ~{(72 / input.rate).toFixed(1)} years.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
