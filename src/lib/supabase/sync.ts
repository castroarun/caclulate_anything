import { createClient } from './client'

// All calculator localStorage keys
const CALCULATOR_KEYS = [
  'calc_emi', 'calc_sip', 'calc_fd', 'calc_rd', 'calc_ppf', 'calc_epf',
  'calc_nps', 'calc_ssf', 'calc_lumpsum', 'calc_compound', 'calc_simple_interest',
  'calc_inflation', 'calc_gratuity', 'calc_hra', 'calc_retirement',
  'calc_goal', 'calc_cagr', 'calc_gst', 'calc_margin', 'calc_discount',
  'calc_percentage', 'calc_tax', 'calc_salary', 'calc_real_estate', 'calc_currency'
]

const FAVORITES_KEY = 'calc_favorites'
const FORMAT_KEY = 'calci_number_format'

interface SyncResult {
  success: boolean
  error?: string
  syncedCalculators?: number
}

/**
 * Push all localStorage calculator data to Supabase
 */
export async function pushToCloud(userId: string): Promise<SyncResult> {
  const supabase = createClient()
  let syncedCount = 0

  try {
    // Push calculator data
    for (const key of CALCULATOR_KEYS) {
      const data = localStorage.getItem(key)
      if (data) {
        const calculatorId = key.replace('calc_', '')
        const { error } = await supabase
          .from('user_calculator_data')
          .upsert({
            user_id: userId,
            calculator_id: calculatorId,
            data: JSON.parse(data),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,calculator_id'
          })

        if (error) {
          console.error(`Error syncing ${key}:`, error)
        } else {
          syncedCount++
        }
      }
    }

    // Push preferences
    const favorites = localStorage.getItem(FAVORITES_KEY)
    const format = localStorage.getItem(FORMAT_KEY)

    const { error: prefError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        number_format: format || 'IN',
        favorites: favorites ? JSON.parse(favorites) : [],
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (prefError) {
      console.error('Error syncing preferences:', prefError)
    }

    return { success: true, syncedCalculators: syncedCount }
  } catch (error) {
    console.error('Push to cloud failed:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Pull all calculator data from Supabase to localStorage
 */
export async function pullFromCloud(userId: string): Promise<SyncResult> {
  const supabase = createClient()
  let syncedCount = 0

  try {
    // Pull calculator data
    const { data: calculatorData, error: calcError } = await supabase
      .from('user_calculator_data')
      .select('calculator_id, data')
      .eq('user_id', userId)

    if (calcError) {
      console.error('Error fetching calculator data:', calcError)
    } else if (calculatorData) {
      for (const item of calculatorData) {
        const key = `calc_${item.calculator_id}`
        localStorage.setItem(key, JSON.stringify(item.data))
        syncedCount++
      }
    }

    // Pull preferences
    const { data: prefData, error: prefError } = await supabase
      .from('user_preferences')
      .select('number_format, favorites')
      .eq('user_id', userId)
      .single()

    if (prefError && prefError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching preferences:', prefError)
    } else if (prefData) {
      if (prefData.number_format) {
        localStorage.setItem(FORMAT_KEY, prefData.number_format)
      }
      if (prefData.favorites) {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(prefData.favorites))
      }
    }

    return { success: true, syncedCalculators: syncedCount }
  } catch (error) {
    console.error('Pull from cloud failed:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Sync on login: Pull cloud data (cloud wins on conflicts)
 * Then push any local-only data to cloud
 */
export async function syncOnLogin(userId: string): Promise<SyncResult> {
  try {
    // First, push local data to cloud (ensures nothing is lost)
    await pushToCloud(userId)

    // Then pull cloud data (cloud wins, overwrites local)
    const result = await pullFromCloud(userId)

    // Dispatch event so UI can refresh
    window.dispatchEvent(new CustomEvent('calculator-sync-complete'))

    return result
  } catch (error) {
    console.error('Sync on login failed:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Save a single calculator's data to cloud (debounced call from calculators)
 */
export async function saveCalculatorToCloud(
  userId: string,
  calculatorId: string,
  data: unknown
): Promise<boolean> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('user_calculator_data')
      .upsert({
        user_id: userId,
        calculator_id: calculatorId,
        data: data,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,calculator_id'
      })

    if (error) {
      console.error(`Error saving ${calculatorId} to cloud:`, error)
      return false
    }

    return true
  } catch (error) {
    console.error(`Error saving ${calculatorId} to cloud:`, error)
    return false
  }
}

/**
 * Save preferences to cloud
 */
export async function savePreferencesToCloud(
  userId: string,
  preferences: { numberFormat?: string; favorites?: string[] }
): Promise<boolean> {
  const supabase = createClient()

  try {
    const updateData: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString()
    }

    if (preferences.numberFormat !== undefined) {
      updateData.number_format = preferences.numberFormat
    }
    if (preferences.favorites !== undefined) {
      updateData.favorites = preferences.favorites
    }

    const { error } = await supabase
      .from('user_preferences')
      .upsert(updateData, {
        onConflict: 'user_id'
      })

    if (error) {
      console.error('Error saving preferences to cloud:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error saving preferences to cloud:', error)
    return false
  }
}

/**
 * Clear local data on logout (optional - can be called if user wants fresh start)
 */
export function clearLocalData(): void {
  for (const key of CALCULATOR_KEYS) {
    localStorage.removeItem(key)
  }
  localStorage.removeItem(FAVORITES_KEY)
  // Note: Keep format preference as it's a UI preference
}
