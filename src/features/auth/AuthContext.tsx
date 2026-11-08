import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

/**
 * DEMO ONLY — this is not real authentication.
 * The credentials below are public mock values shown on the login screen.
 * Only a non-sensitive session marker is kept in sessionStorage; no password is ever stored.
 */
export const DEMO_CREDENTIALS = { username: 'coe.demo', password: 'Coe@Demo2026' } as const

const SESSION_KEY = 'coe.demo.session'

interface Session {
  username: string
  signedInAt: string
}

interface AuthValue {
  session: Session | null
  signIn: (username: string, password: string) => boolean
  signOut: () => void
}

const Ctx = createContext<AuthValue | null>(null)

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Session
    return s && s.username ? s : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession)

  const signIn = useCallback((username: string, password: string) => {
    const ok =
      username.trim() === DEMO_CREDENTIALS.username && password === DEMO_CREDENTIALS.password
    if (!ok) return false
    const s: Session = { username: DEMO_CREDENTIALS.username, signedInAt: new Date().toISOString() }
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(s))
    } catch {
      /* ignore */
    }
    setSession(s)
    return true
  }, [])

  const signOut = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
    setSession(null)
  }, [])

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
