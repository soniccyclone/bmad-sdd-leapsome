import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState.js';

describe('EmptyState', () => {
  it('renders "No todos yet" heading', () => {
    render(<EmptyState />);
    expect(screen.getByRole('heading', { name: /no todos yet/i })).toBeInTheDocument();
  });

  it('renders prompt to create a todo', () => {
    render(<EmptyState />);
    expect(screen.getByText(/add your first todo above to get started/i)).toBeInTheDocument();
  });

  it('has a status role for accessibility', () => {
    render(<EmptyState />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
