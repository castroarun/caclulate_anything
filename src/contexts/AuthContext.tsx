'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { syncOnLogin } from '@/lib/supabase/sync'

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  isSyncing: boolean
  isAuthEnabled: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isAuthEnabled, setIsAuthEnabled] = useState(false)
  const hasSyncedRef = useRef<string | null>(null)

  useEffect(() => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured - auth disabled')
      setIsLoading(false)
      setIsAuthEnabled(false)
      return
    }

    setIsAuthEnabled(true)
    const supabase = createClient()

    // If client creation failed, disable auth
    if (!supabase) {
      console.log('Supabase client creation failed - auth disabled')
      setIsLoading(false)
      setIsAuthEnabled(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Sync data when user logs in
  useEffect(() => {
    if (user && !isLoading && hasSyncedRef.current !== user.id) {
      hasSyncedRef.current = user.id
      setIsSyncing(true)

      syncOnLogin(user.id)
        .then((result) => {
          if (result.success) {
            console.log(`Synced ${result.syncedCalculators} calculators from cloud`)
          } else {
            console.error('Sync failed:', result.error)
          }
        })
        .catch((error) => {
          console.error('Sync error:', error)
        })
        .finally(() => {
          setIsSyncing(false)
        })
    }

    // Reset sync flag on logout
    if (!user) {
      hasSyncedRef.current = null
    }
  }, [user, isLoading])

  const signInWithGoogle = async () => {
    const supabase = createClient()
    if (!supabase) {
      console.error('Supabase not configured - cannot sign in')
      return
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      console.error('Error signing in with Google:', error.message)
    }
  }

  const signOut = async () => {
    const supabase = createClient()
    if (!supabase) {
      console.error('Supabase not configured - cannot sign out')
      return
    }
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error.message)
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isSyncing, isAuthEnabled, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
