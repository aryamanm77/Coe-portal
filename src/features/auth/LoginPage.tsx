import { useState, type FormEvent } from 'react'
import { AlertTriangle, Eye, EyeOff, GraduationCap, KeyRound, ShieldAlert } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Field, TextInput } from '../../components/ui/Field'
import { useApp } from '../../store/AppStore'
import { DEMO_CREDENTIALS, useAuth } from './AuthContext'

export function LoginPage() {
  const { session, signIn } = useAuth()
  const { log } = useApp()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({})
  const [formError, setFormError] = useState('')

  if (session) return <Navigate to="/dashboard" replace />

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!username.trim()) next.username = 'Enter your username.'
    if (!password) next.password = 'Enter your password.'
    setErrors(next)
    setFormError('')
    if (Object.keys(next).length) return

    if (signIn(username, password)) {
      log('Session', 'Signed in (demo session — not real authentication)')
      navigate('/dashboard', { replace: true })
    } else {
      setFormError(
        'Those credentials do not match the demo account. Use the credentials shown below, or press "Use Demo Credentials".',
      )
    }
  }

  const useDemo = () => {
    setUsername(DEMO_CREDENTIALS.username)
    setPassword(DEMO_CREDENTIALS.password)
    setErrors({})
    setFormError('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-card bg-navy text-white shadow-card">
            <GraduationCap className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-muted">[College Name]</p>
          <h1 className="mt-0.5 text-2xl font-semibold text-navy">COE Portal</h1>
          <p className="mt-1 text-sm text-muted">Controller of Examinations — sign in to continue</p>
        </div>

        <div className="rounded-card border border-line bg-white p-6 shadow-card">
          <form onSubmit={submit} noValidate className="space-y-4" aria-label="COE sign in">
            {formError && (
              <div
                role="alert"
                className="flex gap-2 rounded-ctl border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-900"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>{formError}</p>
              </div>
            )}

            <Field label="Username" required error={errors.username}>
              <TextInput
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. coe.demo"
              />
            </Field>

            <Field label="Password" required error={errors.password}>
              <PasswordInput value={password} onChange={setPassword} show={show} onToggle={() => setShow((s) => !s)} />
            </Field>

            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>

          <div className="mt-5 rounded-ctl border border-line bg-slate-50 p-4">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-navy">
              <KeyRound className="h-4 w-4" aria-hidden="true" /> Demo credentials
            </p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
              <dt className="text-muted">Username</dt>
              <dd className="font-mono text-ink">{DEMO_CREDENTIALS.username}</dd>
              <dt className="text-muted">Password</dt>
              <dd className="font-mono text-ink">{DEMO_CREDENTIALS.password}</dd>
            </dl>
            <Button variant="secondary" size="sm" className="mt-3" onClick={useDemo}>
              Use Demo Credentials
            </Button>
          </div>
        </div>

        <div className="mt-4 flex gap-2 rounded-ctl border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-950">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <span className="font-semibold">Frontend demonstration only.</span> This sign-in is simulated in your
            browser. No password is stored and no real authentication or server security is involved.
          </p>
        </div>
      </div>
    </div>
  )
}

function PasswordInput({
  value,
  onChange,
  show,
  onToggle,
  ...aria
}: {
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  id?: string
  invalid?: boolean
}) {
  return (
    <div className="relative">
      <TextInput
        {...aria}
        type={show ? 'text' : 'password'}
        autoComplete="current-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-11"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted hover:bg-navsel hover:text-navy"
      >
        {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  )
}
