import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Optional replacement for the default fallback. Must not render raw error data. */
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Root error boundary.
 *
 * Deliberately domain-neutral: it knows nothing about the application's
 * features and renders a fixed, generic fallback. Caught error values are
 * never surfaced in the UI, because messages and stacks can carry request
 * payloads, tokens, identifiers, or other data that must not reach a user.
 * Diagnostics go to the developer console during development only.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('Unhandled error caught by root ErrorBoundary:', error, errorInfo.componentStack)
    }
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    if (this.props.fallback !== undefined) {
      return this.props.fallback
    }

    return (
      <div
        role="alert"
        className="min-h-screen flex items-center justify-center bg-gray-50 p-6"
      >
        <div className="max-w-md w-full rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">Something went wrong</h1>
          <p className="mt-2 text-sm text-gray-600">
            The page could not be displayed. No changes were saved. You can reload and try
            again, and report the problem if it keeps happening.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-4 inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Reload page
          </button>
        </div>
      </div>
    )
  }
}
