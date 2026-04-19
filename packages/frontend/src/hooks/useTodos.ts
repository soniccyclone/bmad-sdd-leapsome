import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import type { components } from '@todo/api-spec/types';

export type Todo = components['schemas']['Todo'];
export type TodoListResponse = components['schemas']['TodoListResponse'];


export const todosQueryKey = (page: number, limit: number) =>
  ['todos', { page, limit }] as const;

/**
 * Fetches a paginated list of todos.
 */
export function useTodos(page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: todosQueryKey(page, limit),
    queryFn: async (): Promise<TodoListResponse> => {
      return await api.get('/api/todos', { queries: { page, limit } });
    },
  });
}
