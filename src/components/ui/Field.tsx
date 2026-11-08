import {
  cloneElement,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { ChevronDown } from 'lucide-react'
import { cx } from '../../lib/utils'

export const controlClass =
  'block w-full h-10 rounded-ctl border bg-white px-3 text-sm text-ink placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-muted'

interface FieldProps {
  label: string
  required?: boolean
  hint?: ReactNode
  error?: string
  className?: string
  /** A single form control; id / aria attributes are injected. */
  children: ReactElement<Record<string, unknown>>
}

export function Field({ label, required, hint, error, className, children }: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errId = `${id}-err`
  const describedBy = [hint ? hintId : '', error ? errId : ''].filter(Boolean).join(' ') || undefined

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        'aria-required': required ? true : undefined,
        invalid: !!error,
      })
    : children

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink">
        {label}
        {required && (
          <span className="ml-0.5 text-red-700" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {control}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="mt-1 flex items-start gap-1 text-xs font-medium text-red-800" role="alert">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}

type WithInvalid<T> = T & { invalid?: boolean }

export function TextInput({ invalid, className, ...rest }: WithInvalid<InputHTMLAttributes<HTMLInputElement>>) {
  return <input className={cx(controlClass, invalid ? 'border-red-600' : 'border-slate-300', className)} {...rest} />
}

export function SelectInput({
  invalid,
  className,
  children,
  ...rest
}: WithInvalid<SelectHTMLAttributes<HTMLSelectElement>>) {
  return (
    <div className="relative">
      <select
        className={cx(controlClass, 'appearance-none pr-9', invalid ? 'border-red-600' : 'border-slate-300', className)}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
    </div>
  )
}

export function TextArea({ invalid, className, ...rest }: WithInvalid<TextareaHTMLAttributes<HTMLTextAreaElement>>) {
  return (
    <textarea
      className={cx(
        'block min-h-24 w-full rounded-ctl border bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400',
        invalid ? 'border-red-600' : 'border-slate-300',
        className,
      )}
      {...rest}
    />
  )
}
