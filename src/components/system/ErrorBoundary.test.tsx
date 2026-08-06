import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

/** Stands in for any component that fails at render time. */
const LEAKY_MESSAGE = 'token-abc123 from an internal request payload'

function Boom(): never {
  throw new Error(LEAKY_MESSAGE)
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React and the boundary both report caught errors to the console.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>normal content</p>
      </ErrorBoundary>,
    )

    expect(screen.getByText('normal content')).toBeInTheDocument()
  })

  it('renders a generic fallback when a child throws', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument()
  })

  it('does not expose the raw error details to the user', () => {
    const { container } = render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )

    expect(container.textContent).not.toContain(LEAKY_MESSAGE)
    expect(container.textContent).not.toContain('token-abc123')
  })

  it('renders a caller-supplied fallback instead of the default one', () => {
    render(
      <ErrorBoundary fallback={<p>custom fallback</p>}>
        <Boom />
      </ErrorBoundary>,
    )

    expect(screen.getByText('custom fallback')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /something went wrong/i })).not.toBeInTheDocument()
  })
})
