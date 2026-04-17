import { useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@todo/api-spec/client';
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
export function useCreateTodo(page: number, limit: number) {
  const queryClient = useQueryClient();

  return useMutation<Todo, Error, CreateTodoVars, CreateTodoContext>({
    mutationFn: async ({ description }) => {
      const { data, error } = await client.POST('/api/todos', {
        body: { description },
      });
      if (error) {
        const err = new Error(error.error.message);
        (err as Error & { code?: string }).code = error.error.code;
        throw err;
      }
      return data;
    },

    onMutate: async ({ description }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      // Snapshot all current todo queries
      const todoQueries = queryClient.getQueriesData<TodoListResponse>({
        queryKey: ['todos'],
      });
      const previousData = todoQueries as CreateTodoContext['previousData'];

      // Find the current page data
      const queryKey = ['todos', { page, limit }] as const;
      const currentData = queryClient.getQueryData<TodoListResponse>(queryKey);

      if (currentData) {
        const { pagination } = currentData;
        const isLastPage = pagination.page >= pagination.totalPages || pagination.totalPages === 0;

        if (isLastPage && currentData.data.length < limit) {
          // Optimistically add to current page
          const optimisticTodo: Todo = {
            id: `optimistic-${Date.now()}`,
            description,
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          queryClient.setQueryData<TodoListResponse>(queryKey, {
            data: [...currentData.data, optimisticTodo],
            pagination: {
              ...pagination,
              total: pagination.total + 1,
            },
          });
        }
      }

      return { previousData };
    },

    onError: (_error, _vars, context) => {
      // Rollback to snapshots
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
