import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useCreateTodo } from './useCreateTodo.js';

// Mock the API client
vi.mock('@todo/api-spec/client', () => ({
  client: {
    GET: vi.fn(),
    POST: vi.fn(),
    PATCH: vi.fn(),
    DELETE: vi.fn(),
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

    const { client } = await import('@todo/api-spec/client');
    (client.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockTodo,
      error: undefined,
    });

    const { result } = renderHook(() => useCreateTodo(1, 10), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ description: 'New todo' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(client.POST).toHaveBeenCalledWith('/api/todos', {
      body: { description: 'New todo' },
    });
  });

  it('handles error from API', async () => {
    const { client } = await import('@todo/api-spec/client');
    (client.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: undefined,
      error: { error: { message: 'Validation error', code: 'VALIDATION_ERROR' } },
    });

    const { result } = renderHook(() => useCreateTodo(1, 10), {
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
