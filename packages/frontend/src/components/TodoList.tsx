import type { components } from '@todo/api-spec/types';
import { TodoItem } from './TodoItem.js';
import styles from './TodoList.module.css';

type Todo = components['schemas']['Todo'];

interface TodoListProps {
  todos: Todo[];
  total: number;
}

function EmptyState() {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon} aria-hidden="true">
        &#9744;
      </div>
      <h2 className={styles.emptyTitle}>No todos yet</h2>
      <p className={styles.emptyDescription}>
        Add your first todo using the form above.
      </p>
    </div>
  );
}

export function TodoList({ todos, total }: TodoListProps) {
  if (todos.length === 0 && total === 0) {
    return <EmptyState />;
  }

  return (
    <div className={styles.list} role="list" aria-label="Todo list">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </div>
  );
}
