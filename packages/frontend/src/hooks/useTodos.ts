import { useQuery } from '@tanstack/react-query';
import { client } from '@todo/api-spec/client';
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
      const { data, error } = await client.GET('/api/todos', {
        params: { query: { page, limit } },
      });
      if (error) {
        throw new Error(error.error.message);
      }
      return data;
    },
  });
}
