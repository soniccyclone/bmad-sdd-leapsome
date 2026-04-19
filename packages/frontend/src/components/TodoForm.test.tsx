import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppContextProvider, type AppContextValue } from '../context/AppContext.js';
import { TodoForm } from './TodoForm.js';
import { createContext } from 'react';

// Track the mutate mock so we can inspect calls and trigger callbacks
const mutateMock = vi.fn();

vi.mock('../hooks/useCreateTodo.js', () => ({
  useCreateTodo: () => ({
    mutate: mutateMock,
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    isSuccess: false,
    isIdle: true,
    status: 'idle' as const,
    reset: vi.fn(),
    variables: undefined,
    data: undefined,
    context: undefined,
    failureCount: 0,
    failureReason: null,
    submittedAt: 0,
    isPaused: false,
  }),
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AppContextProvider>{ui}</AppContextProvider>
    </QueryClientProvider>,
  );
}

describe('TodoForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders input and submit button', () => {
    renderWithProviders(<TodoForm page={1} limit={10} />);
    expect(screen.getByLabelText(/new todo description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add todo/i })).toBeInTheDocument();
  });

  it('renders input with placeholder text', () => {
    renderWithProviders(<TodoForm page={1} limit={10} />);
    expect(screen.getByPlaceholderText(/what needs to be done/i)).toBeInTheDocument();
  });

  it('does not call mutate when submitting empty input', () => {
    renderWithProviders(<TodoForm page={1} limit={10} />);
    const form = screen.getByRole('button', { name: /add todo/i }).closest('form')!;
    fireEvent.submit(form);
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it('does not call mutate when submitting whitespace-only input', () => {
    renderWithProviders(<TodoForm page={1} limit={10} />);
    const input = screen.getByLabelText(/new todo description/i);
    fireEvent.change(input, { target: { value: '   ' } });
    const form = screen.getByRole('button', { name: /add todo/i }).closest('form')!;
    fireEvent.submit(form);
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it('calls mutate with trimmed description on submit', () => {
    renderWithProviders(<TodoForm page={1} limit={10} />);
    const input = screen.getByLabelText(/new todo description/i);
    fireEvent.change(input, { target: { value: '  Buy groceries  ' } });
    const form = screen.getByRole('button', { name: /add todo/i }).closest('form')!;
    fireEvent.submit(form);
    expect(mutateMock).toHaveBeenCalledTimes(1);
    expect(mutateMock).toHaveBeenCalledWith(
      { description: 'Buy groceries' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('clears input after successful submission via onSuccess callback', () => {
    // When mutate is called, immediately invoke the onSuccess callback
    mutateMock.mockImplementation((_vars: unknown, options: { onSuccess?: () => void }) => {
      options?.onSuccess?.();
    });

    renderWithProviders(<TodoForm page={1} limit={10} />);
    const input = screen.getByLabelText(/new todo description/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Buy groceries' } });
    const form = screen.getByRole('button', { name: /add todo/i }).closest('form')!;
    fireEvent.submit(form);
    expect(input.value).toBe('');
  });

  it('submit button is aria-disabled when input is empty', () => {
    renderWithProviders(<TodoForm page={1} limit={10} />);
    const button = screen.getByRole('button', { name: /add todo/i });
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });
});

describe('TodoForm with backend down', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // To test isBackendDown=true, we need to mock useAppContext directly
  // since AppContextProvider always starts with isBackendDown=false
  it('disables input and button when backend is down', async () => {
    // We re-mock useAppContext for this specific test
    const { useAppContext: originalUseAppContext } = await import('../context/AppContext.js');

    // Use vi.spyOn to temporarily override
    const appContextModule = await import('../context/AppContext.js');
    const spy = vi.spyOn(appContextModule, 'useAppContext').mockReturnValue({
      isBackendDown: true,
      setIsBackendDown: vi.fn(),
    });

    const queryClient = createQueryClient();
    // Don't wrap in AppContextProvider since we're mocking useAppContext
    render(
      <QueryClientProvider client={queryClient}>
        <TodoForm page={1} limit={10} />
      </QueryClientProvider>,
    );

    const input = screen.getByLabelText(/new todo description/i);
    expect(input).toBeDisabled();

    const button = screen.getByRole('button', { name: /add todo/i });
    expect(button).toHaveAttribute('aria-disabled', 'true');

    expect(screen.getByPlaceholderText(/backend unavailable/i)).toBeInTheDocument();

    spy.mockRestore();
  });
});
