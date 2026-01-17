'use client'

import { NumberFormatProvider } from '@/contexts/NumberFormatContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <NumberFormatProvider>
        {children}
      </NumberFormatProvider>
    </AuthProvider>
  )
}
