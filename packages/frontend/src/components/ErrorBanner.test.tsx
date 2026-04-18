import { render, screen } from '@testing-library/react';
import { ErrorBanner } from './ErrorBanner.js';

// Default mocks: backend is up
const mockUseAppContext = vi.fn().mockReturnValue({
  isBackendDown: false,
  setIsBackendDown: vi.fn(),
});

const mockUseHealthCheck = vi.fn().mockReturnValue({
  isBackendDown: false,
  isRecovering: false,
});

vi.mock('../context/AppContext.js', () => ({
  useAppContext: (...args: unknown[]) => mockUseAppContext(...args),
}));

vi.mock('../hooks/useHealthCheck.js', () => ({
  useHealthCheck: (...args: unknown[]) => mockUseHealthCheck(...args),
}));

describe('ErrorBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to defaults
    mockUseAppContext.mockReturnValue({
      isBackendDown: false,
      setIsBackendDown: vi.fn(),
    });
    mockUseHealthCheck.mockReturnValue({
      isBackendDown: false,
      isRecovering: false,
    });
  });

  it('renders nothing when backend is up', () => {
    const { container } = render(<ErrorBanner />);
    expect(container.innerHTML).toBe('');
  });

  it('renders error banner when backend is down', () => {
    mockUseAppContext.mockReturnValue({
      isBackendDown: true,
      setIsBackendDown: vi.fn(),
    });
    mockUseHealthCheck.mockReturnValue({
      isBackendDown: true,
      isRecovering: false,
    });

    render(<ErrorBanner />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText(/our site is experiencing problems/i),
    ).toBeInTheDocument();
  });

  it('renders recovering message when backend is down and recovering', () => {
    mockUseAppContext.mockReturnValue({
      isBackendDown: true,
      setIsBackendDown: vi.fn(),
    });
    mockUseHealthCheck.mockReturnValue({
      isBackendDown: true,
      isRecovering: true,
    });

    render(<ErrorBanner />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/reconnecting to server/i)).toBeInTheDocument();
  });
});
