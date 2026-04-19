import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useCreateTodo } from './useCreateTodo.js';

// Mock the API client
vi.mock('../lib/api.js', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useCreateTodo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a todo successfully', async () => {
    const mockTodo = {
      id: 'todo-new',
      description: 'New todo',
      completed: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const { api } = await import('../lib/api.js');
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockTodo);

    const { result } = renderHook(() => useCreateTodo(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ description: 'New todo' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.post).toHaveBeenCalledWith('/api/todos', {
      description: 'New todo',
    });
  });

  it('handles error from API', async () => {
    const { api } = await import('../lib/api.js');
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Validation error'),
    );

    const { result } = renderHook(() => useCreateTodo(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ description: 'Bad todo' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Validation error');
  });
});
