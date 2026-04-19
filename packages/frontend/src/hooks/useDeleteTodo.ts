import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import type { TodoListResponse } from './useTodos.js';


interface DeleteTodoVars {
  id: string;
}

interface DeleteTodoContext {
  previousData: [readonly ['todos', { page: number; limit: number }], TodoListResponse | undefined][];
}

/**
 * Deletes a todo with optimistic removal from the cache.
 */
export function useDeleteTodo() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteTodoVars, DeleteTodoContext>({
    mutationFn: async ({ id }) => {
      await api.delete('/api/todos/:id', undefined, { params: { id } });
    },

    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      const todoQueries = queryClient.getQueriesData<TodoListResponse>({
        queryKey: ['todos'],
      });
      const previousData = todoQueries as DeleteTodoContext['previousData'];

      for (const [key, data] of previousData) {
        if (data) {
          queryClient.setQueryData<TodoListResponse>(key, {
            ...data,
            data: data.data.filter((todo) => todo.id !== id),
            pagination: {
              ...data.pagination,
              total: Math.max(0, data.pagination.total - 1),
            },
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
