'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { useNumberFormat } from '@/contexts/NumberFormatContext'
import { EditableValue } from './EditableValue'

export interface AmountRange {
  label: string
  intlLabel: string
  min: number
  max: number
  step: number
  minLabel: string
  maxLabel: string
}

// Each range gets its own step so the slider stays easy to land on a round number
export const AMOUNT_RANGES: AmountRange[] = [
  { label: 'Thousands', intlLabel: '1K–100K', min: 1000, max: 100000, step: 1000, minLabel: '₹1K', maxLabel: '₹1L' },
  { label: 'Lakhs', intlLabel: '100K–10M', min: 100000, max: 10000000, step: 25000, minLabel: '₹1L', maxLabel: '₹1Cr' },
  { label: 'Crores', intlLabel: '10M–100M', min: 10000000, max: 100000000, step: 500000, minLabel: '₹1Cr', maxLabel: '₹10Cr' },
]

export const AMOUNT_RANGES_FROM_LAKH = AMOUNT_RANGES.slice(1)

interface AmountSliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  ranges?: AmountRange[]
  accentClass?: string
  activeChipClass?: string
  valueClassName?: string
}

function rangeIndexFor(value: number, ranges: AmountRange[]) {
  const idx = ranges.findIndex((r) => value <= r.max)
  return idx === -1 ? ranges.length - 1 : idx
}

export function AmountSlider({
  label,
  value,
  onChange,
  ranges = AMOUNT_RANGES,
  accentClass = 'accent-green-600',
  activeChipClass = 'bg-green-50 border-green-300 text-green-700',
  valueClassName,
}: AmountSliderProps) {
  const { format } = useNumberFormat()
  const [rangeIdx, setRangeIdx] = useState(() => rangeIndexFor(value, ranges))
  const range = ranges[Math.min(rangeIdx, ranges.length - 1)]

  // Follow the value when it is typed or loaded outside the current range
  useEffect(() => {
    if (value < range.min || value > range.max) {
      setRangeIdx(rangeIndexFor(value, ranges))
    }
  }, [value, range, ranges])

  const selectRange = (idx: number) => {
    const next = ranges[idx]
    setRangeIdx(idx)
    if (value < next.min || value > next.max) {
      onChange(Math.min(Math.max(value, next.min), next.max))
    }
  }

  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <label className="text-sm font-medium text-slate-600">{label}</label>
        <EditableValue
          value={value}
          onChange={onChange}
          min={ranges[0].min}
          max={ranges[ranges.length - 1].max}
          prefix="₹"
          className={valueClassName}
        />
      </div>
      <div className="flex gap-1.5 mb-3">
        {ranges.map((r, idx) => (
          <button
            key={r.label}
            type="button"
            onClick={() => selectRange(idx)}
            className={cn(
              'flex-1 px-2 py-1.5 text-[11px] font-medium rounded-full border transition-colors',
              idx === rangeIdx ? activeChipClass : 'border-slate-200 text-slate-500 hover:border-slate-300'
            )}
          >
            {format === 'indian' ? r.label : r.intlLabel}
          </button>
        ))}
      </div>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn('w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer', accentClass)}
      />
      <div className="flex justify-between mt-1 text-[10px] text-slate-400">
        <span>{range.minLabel}</span>
        <span>{range.maxLabel}</span>
      </div>
    </div>
  )
}
