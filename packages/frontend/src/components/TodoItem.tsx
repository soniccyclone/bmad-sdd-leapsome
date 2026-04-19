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
  const [dismissedError, setDismissedError] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);

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

  const errorMessage = dismissedError ? null : getErrorMessage(mutationError);

  // Fix 8: Reset savingRef on unmount in case queueMicrotask hasn't run yet
  useEffect(() => {
    return () => {
      savingRef.current = false;
    };
  }, []);

  // Fix 4: Sync editValue when todo.description changes from parent while not editing
  useEffect(() => {
    if (!isEditing) setEditValue(todo.description);
  }, [todo.description, isEditing]);

  // F16: Auto-dismiss mutation errors after 5 seconds
  useEffect(() => {
    if (!mutationError) {
      setDismissedError(false);
      return;
    }
    const timer = setTimeout(() => {
      setDismissedError(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [mutationError]);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  function handleToggle(checked: boolean | 'indeterminate') {
    if (checked === 'indeterminate') return;
    if (toggleMutation.isPending) return;
    toggleMutation.mutate({ id: todo.id, completed: checked });
  }

  function handleDelete() {
    if (deleteMutation.isPending) return;
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

  // F4: Use savingRef to prevent double-fire from Enter + onBlur
  function saveEdit() {
    if (savingRef.current) return;
    savingRef.current = true;
    const trimmed = editValue.trim();
    if (!trimmed) {
      // Empty input: cancel edit and revert to original description
      setEditValue(todo.description);
      setIsEditing(false);
      queueMicrotask(() => {
        savingRef.current = false;
      });
      return;
    }
    if (trimmed !== todo.description) {
      updateDescriptionMutation.mutate({ id: todo.id, description: trimmed });
    }
    setIsEditing(false);
    // Reset the flag asynchronously so subsequent edits work
    queueMicrotask(() => {
      savingRef.current = false;
    });
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
            maxLength={2000}
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
