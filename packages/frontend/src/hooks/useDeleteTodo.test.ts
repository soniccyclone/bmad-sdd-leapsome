import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useDeleteTodo } from './useDeleteTodo.js';

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

describe('useDeleteTodo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes a todo successfully', async () => {
    const { client } = await import('@todo/api-spec/client');
    (client.DELETE as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: undefined,
      error: undefined,
    });

    const { result } = renderHook(() => useDeleteTodo(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'todo-1' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(client.DELETE).toHaveBeenCalledWith('/api/todos/{id}', {
      params: { path: { id: 'todo-1' } },
    });
  });

  it('handles error from API', async () => {
    const { client } = await import('@todo/api-spec/client');
    (client.DELETE as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: undefined,
      error: { error: { message: 'Not found', code: 'NOT_FOUND' } },
    });

    const { result } = renderHook(() => useDeleteTodo(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'nonexistent' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Not found');
  });
});
