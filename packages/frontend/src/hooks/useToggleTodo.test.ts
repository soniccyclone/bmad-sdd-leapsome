import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useToggleTodo } from './useToggleTodo.js';

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

describe('useToggleTodo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggles a todo to completed', async () => {
    const mockTodo = {
      id: 'todo-1',
      description: 'Test',
      completed: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const { api } = await import('../lib/api.js');
    (api.patch as ReturnType<typeof vi.fn>).mockResolvedValue(mockTodo);

    const { result } = renderHook(() => useToggleTodo(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'todo-1', completed: true });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.patch).toHaveBeenCalledWith(
      '/api/todos/:id',
      { completed: true },
      { params: { id: 'todo-1' } },
    );
  });

  it('handles error from API', async () => {
    const { api } = await import('../lib/api.js');
    (api.patch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Rate limit'),
    );

    const { result } = renderHook(() => useToggleTodo(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'todo-1', completed: true });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Rate limit');
  });
});
