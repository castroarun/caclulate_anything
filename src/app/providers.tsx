'use client'

import { NumberFormatProvider } from '@/contexts/NumberFormatContext'
import { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <NumberFormatProvider>
      {children}
    </NumberFormatProvider>
  )
}
