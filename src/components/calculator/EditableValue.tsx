'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { useNumberFormat } from '@/contexts/NumberFormatContext'

interface EditableValueProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  prefix?: string
  suffix?: string
  allowDecimal?: boolean
  className?: string
}

// Slider value that can also be typed. Shows the formatted number until focused,
// then the raw number for editing; clamps to min/max on blur.
export function EditableValue({
  value,
  onChange,
  min,
  max,
  prefix,
  suffix,
  allowDecimal = false,
  className,
}: EditableValueProps) {
  const { formatNumber } = useNumberFormat()
  const [draft, setDraft] = useState<string | null>(null)

  const display = allowDecimal ? String(value) : formatNumber(value)
  const text = draft ?? display

  const parse = (raw: string) => {
    const num = parseFloat(raw.replace(/,/g, ''))
    if (isNaN(num)) return null
    return allowDecimal ? num : Math.round(num)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(allowDecimal ? /[^\d.]/g : /[^\d]/g, '')
    setDraft(raw)
    const num = parse(raw)
    // Only push in-range values while typing; out-of-range is clamped on blur
    if (num !== null && num >= min && num <= max) onChange(num)
  }

  const handleBlur = () => {
    const num = draft === null ? null : parse(draft)
    if (num !== null) onChange(Math.min(Math.max(num, min), max))
    setDraft(null)
  }

  return (
    <span className={cn('inline-flex items-baseline font-mono text-base font-semibold text-slate-900', className)}>
      {prefix && <span>{prefix}</span>}
      <input
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        value={text}
        onChange={handleChange}
        onFocus={(e) => {
          setDraft(String(value))
          e.target.select()
        }}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        style={{ width: `${Math.max(text.length, 1) + 1}ch` }}
        className="min-w-0 p-0 text-right bg-transparent text-inherit font-inherit border-0 border-b border-dashed border-slate-300 rounded-none focus:border-blue-500 focus:outline-none focus:ring-0"
      />
      {suffix && <span className="ml-1">{suffix}</span>}
    </span>
  )
}
