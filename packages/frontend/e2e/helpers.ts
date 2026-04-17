import type { Page, Locator } from '@playwright/test';

/**
 * Types a description into the todo form and submits it.
 */
export async function createTodo(page: Page, description: string): Promise<void> {
  const input = page.getByLabel('New todo description');
  await input.fill(description);
  await page.getByLabel('Add todo').click();
  // Wait for the network request to complete and the new item to appear
  await page.getByRole('button', { name: 'Add todo' }).waitFor({ state: 'visible' });
}

/**
 * Returns a locator for all todo items in the list.
 */
export function getTodoItems(page: Page): Locator {
  return page.getByRole('listitem');
}

/**
 * Deletes all todos via the API for test isolation.
 * Fetches the full list then DELETEs each one.
 */
export async function clearAllTodos(page: Page): Promise<void> {
  // Fetch all todos (use a high limit to get them all in one request)
  const response = await page.request.get('/api/todos?page=1&limit=50');
  const body = await response.json();
  const todos: { id: string }[] = body.data ?? [];

  // Delete each todo
  await Promise.all(
    todos.map((todo) => page.request.delete(`/api/todos/${todo.id}`)),
  );
}

/**
 * Creates a todo directly via the API (faster than going through the UI).
 * Returns the created todo object.
 */
export async function createTodoViaApi(
  page: Page,
  description: string,
): Promise<{ id: string; description: string; completed: boolean }> {
  const response = await page.request.post('/api/todos', {
    data: { description },
  });
  return response.json();
}
