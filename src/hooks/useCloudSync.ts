'use client'

import { useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { saveCalculatorToCloud, savePreferencesToCloud } from '@/lib/supabase/sync'

// Debounce delay in milliseconds
const SYNC_DEBOUNCE_MS = 2000

/**
 * Hook for syncing calculator data to cloud when user is logged in
 * Provides debounced save functions that only trigger when authenticated
 */
export function useCloudSync() {
  const { user } = useAuth()
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())

  /**
   * Save calculator data to cloud (debounced)
   * Only saves if user is logged in
   */
  const syncCalculator = useCallback((calculatorId: string, data: unknown) => {
    if (!user) return

    // Clear existing timer for this calculator
    const existingTimer = debounceTimers.current.get(calculatorId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new debounced timer
    const timer = setTimeout(async () => {
      await saveCalculatorToCloud(user.id, calculatorId, data)
      debounceTimers.current.delete(calculatorId)
    }, SYNC_DEBOUNCE_MS)

    debounceTimers.current.set(calculatorId, timer)
  }, [user])

  /**
   * Save preferences to cloud (debounced)
   * Only saves if user is logged in
   */
  const syncPreferences = useCallback((preferences: { numberFormat?: string; favorites?: string[] }) => {
    if (!user) return

    // Clear existing timer for preferences
    const existingTimer = debounceTimers.current.get('_preferences')
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new debounced timer
    const timer = setTimeout(async () => {
      await savePreferencesToCloud(user.id, preferences)
      debounceTimers.current.delete('_preferences')
    }, SYNC_DEBOUNCE_MS)

    debounceTimers.current.set('_preferences', timer)
  }, [user])

  /**
   * Force immediate sync (bypasses debounce)
   */
  const syncCalculatorNow = useCallback(async (calculatorId: string, data: unknown) => {
    if (!user) return false

    // Clear any pending debounced save
    const existingTimer = debounceTimers.current.get(calculatorId)
    if (existingTimer) {
      clearTimeout(existingTimer)
      debounceTimers.current.delete(calculatorId)
    }

    return await saveCalculatorToCloud(user.id, calculatorId, data)
  }, [user])

  return {
    syncCalculator,
    syncPreferences,
    syncCalculatorNow,
    isAuthenticated: !!user,
    userId: user?.id
  }
}
