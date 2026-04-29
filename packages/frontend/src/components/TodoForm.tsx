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
  const createMutation = useCreateTodo();

  const trimmed = description.trim();
  const isDisabled = isBackendDown || createMutation.isPending || !trimmed;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isDisabled) return;

    createMutation.mutate(
      { description: trimmed },
      {
        onSuccess: () => {
          setDescription('');
        },
      },
    );
  }

  function handleButtonClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (isDisabled) {
      e.preventDefault();
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        id="new-todo"
        name="new-todo"
        className={styles.input}
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={isBackendDown ? 'Backend unavailable...' : 'What needs to be done?'}
        disabled={isBackendDown}
        maxLength={2000}
        aria-label="New todo description"
      />
      <button
        type="submit"
        className={styles.submitButton}
        aria-disabled={isDisabled}
        onClick={handleButtonClick}
        aria-label="Add todo"
      >
        {createMutation.isPending ? 'Adding...' : 'Add'}
      </button>
    </form>
  );
}
