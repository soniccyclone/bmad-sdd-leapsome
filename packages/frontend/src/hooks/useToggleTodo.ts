import { useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@todo/api-spec/client';
import type { components } from '@todo/api-spec/types';
import type { TodoListResponse } from './useTodos.js';

type Todo = components['schemas']['Todo'];

interface ToggleTodoVars {
  id: string;
  completed: boolean;
}

interface ToggleTodoContext {
  previousData: [readonly ['todos', { page: number; limit: number }], TodoListResponse | undefined][];
}

/**
 * Toggles a todo's completed status with optimistic update.
 */
export function useToggleTodo() {
  const queryClient = useQueryClient();

  return useMutation<Todo, Error, ToggleTodoVars, ToggleTodoContext>({
    mutationFn: async ({ id, completed }) => {
      const { data, error } = await client.PATCH('/api/todos/{id}', {
        params: { path: { id } },
        body: { completed },
      });
      if (error) {
        const err = new Error(error?.error?.message ?? 'An unexpected error occurred');
        (err as Error & { code?: string }).code = error?.error?.code;
        throw err;
      }
      return data;
    },

    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      const todoQueries = queryClient.getQueriesData<TodoListResponse>({
        queryKey: ['todos'],
      });
      const previousData = todoQueries as ToggleTodoContext['previousData'];

      // Optimistically update the todo in all cached pages
      for (const [key, data] of previousData) {
        if (data) {
          queryClient.setQueryData<TodoListResponse>(key, {
            ...data,
            data: data.data.map((todo) =>
              todo.id === id
                ? { ...todo, completed, updatedAt: new Date().toISOString() }
                : todo,
            ),
          });
        }
      }

      return { previousData };
    },

    onError: (_error, _vars, context) => {
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          queryClient.setQueryData(key, data);
        }
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}
