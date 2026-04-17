import { useState, type FormEvent } from 'react';
import { useAppContext } from '../context/AppContext.js';
import { useCreateTodo } from '../hooks/useCreateTodo.js';
import styles from './TodoForm.module.css';

interface TodoFormProps {
  page: number;
  limit: number;
}

export function TodoForm({ page, limit }: TodoFormProps) {
  const [description, setDescription] = useState('');
  const { isBackendDown } = useAppContext();
  const createMutation = useCreateTodo(page, limit);

  const trimmed = description.trim();
  const isDisabled = isBackendDown || createMutation.isPending || !trimmed;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!trimmed) return;

    createMutation.mutate(
      { description: trimmed },
      {
        onSuccess: () => {
          setDescription('');
        },
      },
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.input}
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={isBackendDown ? 'Backend unavailable...' : 'What needs to be done?'}
        disabled={isBackendDown}
        aria-label="New todo description"
      />
      <button
        type="submit"
        className={styles.submitButton}
        disabled={isDisabled}
        aria-label="Add todo"
      >
        {createMutation.isPending ? 'Adding...' : 'Add'}
      </button>
    </form>
  );
}
