import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const DEFAULT_PATH = '/workspace'

// Only allow paths on this site, so `next` can't send people to another website.
function safeRedirectPath(next: string | null): string {
  if (!next) return DEFAULT_PATH

  const placeholderOrigin = 'https://placeholder.invalid'
  try {
    const target = new URL(next, placeholderOrigin)
    if (target.origin !== placeholderOrigin || !next.startsWith('/')) return DEFAULT_PATH
    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return DEFAULT_PATH
  }
}

// Redirect by path rather than full URL. On Netlify, request.url can name a
// different host from the one the visitor is on, which would lose the sign-in
// cookie. A path keeps the browser on its current address on any host.
function redirectToPath(path: string) {
  return new NextResponse(null, { status: 307, headers: { Location: path } })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeRedirectPath(searchParams.get('next'))

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return redirectToPath(next)
    }
  }

  // Return to workspace on error
  return redirectToPath(DEFAULT_PATH)
}
