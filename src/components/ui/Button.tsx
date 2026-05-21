import { type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  loading?: boolean
}

const variantClasses = {
  primary:   'bg-blue-600 text-white hover:bg-blue-700 border border-transparent',
  secondary: 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300',
  danger:    'bg-red-600 text-white hover:bg-red-700 border border-transparent',
  ghost:     'bg-transparent text-gray-600 hover:bg-gray-100 border border-transparent',
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-1.5 font-medium rounded-md transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading && <Loader2 className="h-3 w-3 animate-spin" />}
      {children}
    </button>
  )
}
