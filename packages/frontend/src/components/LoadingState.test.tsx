import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { LoadingState } from './LoadingState.js';

describe('LoadingState', () => {
  it('shows loading message when not in error state', () => {
    render(<LoadingState isError={false} onRetry={vi.fn()} />);
    expect(screen.getByText(/loading your todos/i)).toBeInTheDocument();
  });

  it('shows spinner element when loading', () => {
    const { container } = render(<LoadingState isError={false} onRetry={vi.fn()} />);
    // The spinner div has aria-hidden="true"
    const spinner = container.querySelector('[aria-hidden="true"]');
    expect(spinner).toBeInTheDocument();
  });

  it('shows "Service unavailable" when isError is true', () => {
    render(<LoadingState isError={true} onRetry={vi.fn()} />);
    expect(screen.getByText(/service unavailable/i)).toBeInTheDocument();
  });

  it('shows retry button when isError is true', () => {
    render(<LoadingState isError={true} onRetry={vi.fn()} />);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<LoadingState isError={true} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show retry button when not in error state', () => {
    render(<LoadingState isError={false} onRetry={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });
});
