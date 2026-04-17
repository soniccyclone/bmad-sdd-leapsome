import { useState, useRef, useEffect } from 'react';
import * as Checkbox from '@radix-ui/react-checkbox';
import type { components } from '@todo/api-spec/types';
import { useToggleTodo } from '../hooks/useToggleTodo.js';
import { useDeleteTodo } from '../hooks/useDeleteTodo.js';
import { useUpdateDescription } from '../hooks/useUpdateDescription.js';
import styles from './TodoItem.module.css';

type Todo = components['schemas']['Todo'];

interface TodoItemProps {
  todo: Todo;
}

function getErrorMessage(error: Error | null): string | null {
  if (!error) return null;
  const code = (error as Error & { code?: string }).code;
  if (code === 'RATE_LIMIT_EXCEEDED' || error.message.includes('429')) {
    return 'Too many requests. Please wait a moment.';
  }
  return 'Something went wrong. Please try again.';
}

export function TodoItem({ todo }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(todo.description);
  const editInputRef = useRef<HTMLInputElement>(null);

  const toggleMutation = useToggleTodo();
  const deleteMutation = useDeleteTodo();
  const updateDescriptionMutation = useUpdateDescription();

  const isPending =
    toggleMutation.isPending ||
    deleteMutation.isPending ||
    updateDescriptionMutation.isPending;

  const mutationError =
    toggleMutation.error ||
    deleteMutation.error ||
    updateDescriptionMutation.error;

  const errorMessage = getErrorMessage(mutationError);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  function handleToggle(checked: boolean | 'indeterminate') {
    if (checked === 'indeterminate') return;
    toggleMutation.mutate({ id: todo.id, completed: checked });
  }

  function handleDelete() {
    deleteMutation.mutate({ id: todo.id });
  }

  function handleDescriptionClick() {
    setEditValue(todo.description);
    setIsEditing(true);
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }

  function saveEdit() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== todo.description) {
      updateDescriptionMutation.mutate({ id: todo.id, description: trimmed });
    }
    setIsEditing(false);
  }

  function cancelEdit() {
    setEditValue(todo.description);
    setIsEditing(false);
  }

  const itemClassName = [
    styles.item,
    isPending ? styles.pending : '',
    errorMessage ? styles.errorState : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div>
      <div className={itemClassName} role="listitem">
        <Checkbox.Root
          className={styles.checkbox}
          checked={todo.completed}
          onCheckedChange={handleToggle}
          aria-label={`Mark "${todo.description}" as ${todo.completed ? 'incomplete' : 'complete'}`}
        >
          <span className={styles.checkboxIndicator}>
            <Checkbox.Indicator className={styles.checkmark}>
              &#10003;
            </Checkbox.Indicator>
          </span>
        </Checkbox.Root>

        {isEditing ? (
          <input
            ref={editInputRef}
            className={styles.editInput}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={saveEdit}
            aria-label={`Edit description for "${todo.description}"`}
          />
        ) : (
          <span
            className={`${styles.description} ${todo.completed ? styles.completed : ''}`}
            onClick={handleDescriptionClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleDescriptionClick();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Edit "${todo.description}"`}
          >
            {todo.description}
          </span>
        )}

        {isPending && <span className={styles.loadingDot} aria-hidden="true" />}

        <button
          type="button"
          className={styles.deleteButton}
          onClick={handleDelete}
          aria-label={`Delete "${todo.description}"`}
        >
          &#10005;
        </button>
      </div>

      {errorMessage && (
        <p className={styles.errorMessage} role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
