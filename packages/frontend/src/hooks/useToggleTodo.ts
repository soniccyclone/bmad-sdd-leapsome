import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
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
      return await api.patch('/api/todos/:id', { completed }, { params: { id } });
    },

    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      const todoQueries = queryClient.getQueriesData<TodoListResponse>({
        queryKey: ['todos'],
      });
      const previousData = todoQueries as ToggleTodoContext['previousData'];

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
