import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useUpdateDescription } from './useUpdateDescription.js';

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

describe('useUpdateDescription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates a todo description successfully', async () => {
    const mockTodo = {
      id: 'todo-1',
      description: 'Updated description',
      completed: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    };

    const { client } = await import('@todo/api-spec/client');
    (client.PATCH as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockTodo,
      error: undefined,
    });

    const { result } = renderHook(() => useUpdateDescription(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'todo-1', description: 'Updated description' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(client.PATCH).toHaveBeenCalledWith('/api/todos/{id}', {
      params: { path: { id: 'todo-1' } },
      body: { description: 'Updated description' },
    });
  });

  it('handles error from API', async () => {
    const { client } = await import('@todo/api-spec/client');
    (client.PATCH as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: undefined,
      error: { error: { message: 'Description too long', code: 'VALIDATION_ERROR' } },
    });

    const { result } = renderHook(() => useUpdateDescription(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 'todo-1', description: 'x'.repeat(1000) });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Description too long');
  });
});
