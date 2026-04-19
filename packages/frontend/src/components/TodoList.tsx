import type { components } from '@todo/api-spec/types';
import { TodoItem } from './TodoItem.js';
import { EmptyState } from './EmptyState.js';
import styles from './TodoList.module.css';

type Todo = components['schemas']['Todo'];

interface TodoListProps {
  todos: Todo[];
  total: number;
  isLoading?: boolean;
}

export function TodoList({ todos, total, isLoading = false }: TodoListProps) {
  if (todos.length === 0 && total === 0) {
    return <EmptyState />;
  }

  return (
    <div className={styles.list} role="list" aria-label="Todo list" aria-busy={isLoading}>
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </div>
  );
}
