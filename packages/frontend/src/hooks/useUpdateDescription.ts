import { useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@todo/api-spec/client';
import type { components } from '@todo/api-spec/types';
import type { TodoListResponse } from './useTodos.js';

type Todo = components['schemas']['Todo'];

interface UpdateDescriptionVars {
  id: string;
  description: string;
}

interface UpdateDescriptionContext {
  previousData: [readonly ['todos', { page: number; limit: number }], TodoListResponse | undefined][];
}

/**
 * Updates a todo's description with optimistic update.
 */
export function useUpdateDescription() {
  const queryClient = useQueryClient();

  return useMutation<Todo, Error, UpdateDescriptionVars, UpdateDescriptionContext>({
    mutationFn: async ({ id, description }) => {
      const { data, error } = await client.PATCH('/api/todos/{id}', {
        params: { path: { id } },
        body: { description },
      });
      if (error) {
        const err = new Error(error.error.message);
        (err as Error & { code?: string }).code = error.error.code;
        throw err;
      }
      return data;
    },

    onMutate: async ({ id, description }) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      const todoQueries = queryClient.getQueriesData<TodoListResponse>({
        queryKey: ['todos'],
      });
      const previousData = todoQueries as UpdateDescriptionContext['previousData'];

      // Optimistically update the description in all cached pages
      for (const [key, data] of previousData) {
        if (data) {
          queryClient.setQueryData<TodoListResponse>(key, {
            ...data,
            data: data.data.map((todo) =>
              todo.id === id
                ? { ...todo, description, updatedAt: new Date().toISOString() }
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
