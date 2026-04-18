import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { Pagination } from './Pagination.js';

describe('Pagination', () => {
  const defaultProps = {
    page: 1,
    totalPages: 3,
    limit: 10,
    onPageChange: vi.fn(),
    onLimitChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page number buttons', () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByRole('button', { name: /go to page 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go to page 2/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go to page 3/i })).toBeInTheDocument();
  });

  it('highlights the current page with aria-current', () => {
    render(<Pagination {...defaultProps} page={2} />);
    const page2Button = screen.getByRole('button', { name: /go to page 2/i });
    expect(page2Button).toHaveAttribute('aria-current', 'page');

    const page1Button = screen.getByRole('button', { name: /go to page 1/i });
    expect(page1Button).not.toHaveAttribute('aria-current');
  });

  it('calls onPageChange when a page button is clicked', () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: /go to page 3/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('returns null when totalPages <= 1', () => {
    const { container } = render(<Pagination {...defaultProps} totalPages={1} />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when totalPages is 0', () => {
    const { container } = render(<Pagination {...defaultProps} totalPages={0} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders pagination navigation with aria-label', () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
  });
});
