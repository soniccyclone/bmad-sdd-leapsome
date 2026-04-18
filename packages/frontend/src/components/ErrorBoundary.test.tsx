import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary.js';

// A component that throws an error on render
function ThrowingComponent({ message }: { message: string }) {
  throw new Error(message);
}

// Suppress React error boundary console noise during tests
const originalConsoleError = console.error;

describe('ErrorBoundary', () => {
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Hello, world!</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });

  it('renders fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent message="Test error" />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/unexpected error occurred/i)).toBeInTheDocument();
  });

  it('renders a reload button in the error fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent message="Test error" />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
  });
});
