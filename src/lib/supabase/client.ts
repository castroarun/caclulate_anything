import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Cached client instance
let cachedClient: SupabaseClient | null = null

export function createClient(): SupabaseClient | null {
  // Return null if Supabase is not configured
  if (!isSupabaseConfigured()) {
    return null
  }

  // Return cached client if available
  if (cachedClient) {
    return cachedClient
  }

  cachedClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return cachedClient
}
