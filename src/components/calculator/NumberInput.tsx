'use client'

import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils/cn'
import { formatIndianNumber, parseIndianNumber } from '@/lib/utils/formatters'

interface NumberInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  prefix?: string
  suffix?: string
  showSlider?: boolean
  sliderStep?: number
  hint?: string
  error?: string
  className?: string
}

export function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  prefix,
  suffix,
  showSlider = true,
  sliderStep,
  hint,
  error,
  className,
}: NumberInputProps) {
  const [inputValue, setInputValue] = useState(formatIndianNumber(value))
  const [isFocused, setIsFocused] = useState(false)

  // Sync input value when value prop changes (and not focused)
  useEffect(() => {
    if (!isFocused) {
      setInputValue(formatIndianNumber(value))
    }
  }, [value, isFocused])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/,/g, '')
      setInputValue(raw)

      const parsed = parseFloat(raw)
      if (!isNaN(parsed)) {
        const clamped = Math.min(Math.max(parsed, min), max)
        onChange(clamped)
      }
    },
    [onChange, min, max]
  )

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value)
      onChange(val)
      setInputValue(formatIndianNumber(val))
    },
    [onChange]
  )

  const handleFocus = useCallback(() => {
    setIsFocused(true)
    // Show raw number on focus for easy editing
    setInputValue(value.toString())
  }, [value])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    // Format on blur
    setInputValue(formatIndianNumber(value))
  }, [value])

  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
        {label}
      </label>

      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
            {prefix}
          </span>
        )}
        <input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            'w-full py-3 rounded-lg border bg-white dark:bg-gray-800',
            'text-gray-900 dark:text-white font-mono text-lg',
            'focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'transition-all duration-200',
            prefix ? 'pl-10' : 'pl-4',
            suffix ? 'pr-16' : 'pr-4',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600'
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
            {suffix}
          </span>
        )}
      </div>

      {showSlider && (
        <div className="pt-1">
          <input
            type="range"
            min={min}
            max={max}
            step={sliderStep || step}
            value={value}
            onChange={handleSliderChange}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>
              {prefix}
              {formatIndianNumber(min)}
            </span>
            <span>
              {prefix}
              {formatIndianNumber(max)}
            </span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
      {hint && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{hint}</p>
      )}
    </div>
  )
}
