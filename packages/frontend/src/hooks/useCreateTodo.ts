import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import type { components } from '@todo/api-spec/types';
import type { TodoListResponse } from './useTodos.js';

type Todo = components['schemas']['Todo'];


interface CreateTodoVars {
  description: string;
}

interface CreateTodoContext {
  previousData: [readonly ['todos', { page: number; limit: number }], TodoListResponse | undefined][];
}

/**
 * Creates a new todo with optimistic update.
 * Only appends to the cache if the user is on the last page.
 */
export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation<Todo, Error, CreateTodoVars, CreateTodoContext>({
    mutationFn: async ({ description }) => {
      return await api.post('/api/todos', { description });
    },

    onMutate: async ({ description }) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      const todoQueries = queryClient.getQueriesData<TodoListResponse>({
        queryKey: ['todos'],
      });
      const previousData = todoQueries as CreateTodoContext['previousData'];

      for (const [key, data] of previousData) {
        if (!data) continue;
        const { pagination } = data;
        const isLastPage = pagination.page >= pagination.totalPages || pagination.totalPages === 0;

        if (isLastPage && data.data.length < pagination.limit) {
          const optimisticTodo: Todo = {
            id: `optimistic-${Date.now()}`,
            description,
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          queryClient.setQueryData<TodoListResponse>(key, {
            data: [...data.data, optimisticTodo],
            pagination: {
              ...pagination,
              total: pagination.total + 1,
            },
          });
          break;
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
