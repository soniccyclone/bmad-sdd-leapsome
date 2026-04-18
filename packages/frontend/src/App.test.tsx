import { render, screen } from '@testing-library/react';
import { App } from './App.js';

// Mock useTodos to return loading state by default
vi.mock('./hooks/useTodos.js', () => ({
  useTodos: () => ({
    data: undefined,
    isLoading: true,
    isError: false,
    error: null,
  }),
  todosQueryKey: (page: number, limit: number) =>
    ['todos', { page, limit }] as const,
}));

// Mock useCreateTodo (used by TodoForm)
vi.mock('./hooks/useCreateTodo.js', () => ({
  useCreateTodo: () => ({
    mutate: vi.fn(),
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

// Mock useHealthCheck (used by ErrorBanner)
vi.mock('./hooks/useHealthCheck.js', () => ({
  useHealthCheck: () => ({
    isBackendDown: false,
    isRecovering: false,
  }),
}));

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText('Todo App')).toBeInTheDocument();
  });

  it('shows loading message when data is loading', () => {
    render(<App />);
    expect(screen.getByText(/loading todos/i)).toBeInTheDocument();
  });
});

describe('App with data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders todo list when data is loaded', async () => {
    // Re-mock useTodos for this test with data
    const useTodosModule = await import('./hooks/useTodos.js');
    vi.spyOn(useTodosModule, 'useTodos').mockReturnValue({
      data: {
        data: [
          {
            id: 'todo-1',
            description: 'Test todo',
            completed: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useTodosModule.useTodos>);

    // Need to mock TodoItem hooks since TodoList renders TodoItem
    render(<App />);
    expect(screen.getByText('Test todo')).toBeInTheDocument();
  });

  it('shows error message when fetch fails', async () => {
    const useTodosModule = await import('./hooks/useTodos.js');
    vi.spyOn(useTodosModule, 'useTodos').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
    } as ReturnType<typeof useTodosModule.useTodos>);

    render(<App />);
    expect(screen.getByText(/failed to load todos/i)).toBeInTheDocument();
  });
});
