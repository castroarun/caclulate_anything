'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type NumberFormat = 'indian' | 'international'

interface NumberFormatContextType {
  format: NumberFormat
  setFormat: (format: NumberFormat) => void
  formatNumber: (num: number) => string
  formatCompact: (num: number) => string
  formatCurrency: (num: number) => string
  formatCurrencyCompact: (num: number) => string
}

const NumberFormatContext = createContext<NumberFormatContextType | undefined>(undefined)

// Indian format: 1,00,00,000
function formatIndian(num: number): string {
  const isNegative = num < 0
  const absNum = Math.abs(Math.round(num))
  const str = absNum.toString()
  let result = ''
  let count = 0
  for (let i = str.length - 1; i >= 0; i--) {
    if (count === 3 || (count > 3 && (count - 3) % 2 === 0)) {
      result = ',' + result
    }
    result = str[i] + result
    count++
  }
  return isNegative ? '-' + result : result
}

// International format: 10,000,000
function formatInternational(num: number): string {
  const isNegative = num < 0
  const absNum = Math.abs(Math.round(num))
  return (isNegative ? '-' : '') + absNum.toLocaleString('en-US')
}

// Compact format for Indian
function formatCompactIndian(num: number): string {
  const isNegative = num < 0
  const absNum = Math.abs(num)
  let result = ''
  if (absNum >= 10000000) result = `${(absNum / 10000000).toFixed(2)}Cr`
  else if (absNum >= 100000) result = `${(absNum / 100000).toFixed(2)}L`
  else if (absNum >= 1000) result = `${(absNum / 1000).toFixed(1)}K`
  else result = `${Math.round(absNum)}`
  return isNegative ? '-' + result : result
}

// Compact format for International
function formatCompactInternational(num: number): string {
  const isNegative = num < 0
  const absNum = Math.abs(num)
  let result = ''
  if (absNum >= 1000000000) result = `${(absNum / 1000000000).toFixed(2)}B`
  else if (absNum >= 1000000) result = `${(absNum / 1000000).toFixed(2)}M`
  else if (absNum >= 1000) result = `${(absNum / 1000).toFixed(1)}K`
  else result = `${Math.round(absNum)}`
  return isNegative ? '-' + result : result
}

export function NumberFormatProvider({ children }: { children: ReactNode }) {
  const [format, setFormatState] = useState<NumberFormat>('indian')
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('calci_number_format')
    if (saved === 'indian' || saved === 'international') {
      setFormatState(saved)
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage
  const setFormat = (newFormat: NumberFormat) => {
    setFormatState(newFormat)
    localStorage.setItem('calci_number_format', newFormat)
  }

  const formatNumber = (num: number): string => {
    return format === 'indian' ? formatIndian(num) : formatInternational(num)
  }

  const formatCompact = (num: number): string => {
    return format === 'indian' ? formatCompactIndian(num) : formatCompactInternational(num)
  }

  const formatCurrency = (num: number): string => {
    return '₹' + formatNumber(num)
  }

  const formatCurrencyCompact = (num: number): string => {
    return '₹' + formatCompact(num)
  }

  // Prevent hydration mismatch by not rendering until loaded
  if (!isLoaded) {
    return <>{children}</>
  }

  return (
    <NumberFormatContext.Provider value={{ format, setFormat, formatNumber, formatCompact, formatCurrency, formatCurrencyCompact }}>
      {children}
    </NumberFormatContext.Provider>
  )
}

export function useNumberFormat() {
  const context = useContext(NumberFormatContext)
  if (context === undefined) {
    // Fallback for components that might not be wrapped in provider
    return {
      format: 'indian' as NumberFormat,
      setFormat: () => {},
      formatNumber: formatIndian,
      formatCompact: formatCompactIndian,
      formatCurrency: (num: number) => '₹' + formatIndian(num),
      formatCurrencyCompact: (num: number) => '₹' + formatCompactIndian(num),
    }
  }
  return context
}
