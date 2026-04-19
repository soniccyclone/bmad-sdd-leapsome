import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
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
      return await api.patch('/api/todos/:id', { description }, { params: { id } });
    },

    onMutate: async ({ id, description }) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      const todoQueries = queryClient.getQueriesData<TodoListResponse>({
        queryKey: ['todos'],
      });
      const previousData = todoQueries as UpdateDescriptionContext['previousData'];

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
