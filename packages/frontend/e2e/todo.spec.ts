import { test, expect } from '@playwright/test';
import { createTodo, getTodoItems, clearAllTodos, createTodoViaApi } from './helpers.js';

test.describe('Todo App', () => {
  test.beforeEach(async ({ page }) => {
    await clearAllTodos(page);
    // Verify the clear actually worked
    const verify = await page.request.get('/api/todos?page=1&limit=1');
    const body = await verify.json();
    if (body.pagination.total !== 0) {
      // Retry the clear
      await clearAllTodos(page);
    }
    await page.goto('/');
    // Wait for the app to finish loading
    await page.getByLabel('New todo description').waitFor({ state: 'visible', timeout: 15000 });
  });

  test('should create a todo and persist it after refresh', async ({ page }) => {
    await createTodo(page, 'Buy groceries');

    // Verify the todo appears in the list
    const items = getTodoItems(page);
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('Buy groceries');

    // Verify the input was cleared after submission
    const input = page.getByLabel('New todo description');
    await expect(input).toHaveValue('');

    // Refresh and verify persistence
    await page.reload();
    await page.getByLabel('New todo description').waitFor({ state: 'visible' });
    const itemsAfterReload = getTodoItems(page);
    await expect(itemsAfterReload).toHaveCount(1);
    await expect(itemsAfterReload.first()).toContainText('Buy groceries');
  });

  test('should complete a todo and persist the state after refresh', async ({ page }) => {
    await createTodoViaApi(page, 'Task to complete');
    await page.reload();
    await page.getByLabel('New todo description').waitFor({ state: 'visible' });

    // Find the checkbox and click it to mark complete
    const checkbox = page.getByLabel(/Mark "Task to complete" as complete/);
    await checkbox.click();

    // After toggling, the aria-label changes to "incomplete" — re-query with the new label
    const checkedCheckbox = page.getByLabel(/Mark "Task to complete" as incomplete/);
    await expect(checkedCheckbox).toHaveAttribute('data-state', 'checked');

    // Verify completed styling (the description span should have the completed class)
    const description = page.getByText('Task to complete');
    await expect(description).toHaveCSS('text-decoration-line', 'line-through');

    // Refresh and verify persistence
    await page.reload();
    await page.getByLabel('New todo description').waitFor({ state: 'visible' });
    const checkboxAfterReload = page.getByLabel(/Mark "Task to complete" as incomplete/);
    await expect(checkboxAfterReload).toHaveAttribute('data-state', 'checked');
  });

  test('should delete a todo and persist after refresh', async ({ page }) => {
    await createTodoViaApi(page, 'Task to delete');
    await page.reload();
    await page.getByLabel('New todo description').waitFor({ state: 'visible' });

    // Verify the todo exists
    await expect(getTodoItems(page)).toHaveCount(1);

    // Click the delete button
    const deleteButton = page.getByLabel(/Delete "Task to delete"/);
    await deleteButton.click();

    // Wait for the item to be removed
    await expect(getTodoItems(page)).toHaveCount(0);

    // Refresh and verify it stays deleted
    await page.reload();
    await page.getByLabel('New todo description').waitFor({ state: 'visible' });
    await expect(page.getByText('No todos yet')).toBeVisible();
  });

  test('should show empty state when there are no todos', async ({ page }) => {
    // beforeEach already cleared all todos
    await expect(page.getByText('No todos yet')).toBeVisible();

    // Pagination should not be visible when there are no todos
    await expect(page.getByRole('navigation', { name: 'Pagination' })).not.toBeVisible();
  });

  test('should paginate when there are more than 10 todos', async ({ page }) => {
    // Create 15 todos via API
    for (let i = 1; i <= 15; i++) {
      await createTodoViaApi(page, `Paginated todo ${i}`);
    }

    await page.reload();
    await page.getByLabel('New todo description').waitFor({ state: 'visible' });

    // Wait for list items to render after reload
    await page.getByRole('listitem').first().waitFor({ state: 'visible', timeout: 10000 });

    // Page 1 should show 10 items
    const items = getTodoItems(page);
    await expect(items).toHaveCount(10);

    // Pagination should be visible
    const pagination = page.getByRole('navigation', { name: 'Pagination' });
    await expect(pagination).toBeVisible();

    // Click page 2
    await page.getByLabel('Go to page 2').click();

    // Page 2 should show the remaining 5 items
    await expect(getTodoItems(page)).toHaveCount(5);
  });

  test('should edit a todo description and persist after refresh', async ({ page }) => {
    await createTodoViaApi(page, 'Original description');
    await page.reload();
    await page.getByLabel('New todo description').waitFor({ state: 'visible' });

    // Wait for the todo to render
    await page.getByText('Original description').waitFor({ state: 'visible', timeout: 10000 });

    // Click the description text to enter edit mode
    const descriptionSpan = page.getByText('Original description');
    await descriptionSpan.click();

    // The edit input should appear — find it by its aria-label
    const editInput = page.getByLabel(/Edit description for/);
    await expect(editInput).toBeVisible();

    // Clear and type a new description
    await editInput.fill('Updated description');
    await editInput.press('Enter');

    // Verify the updated text is shown
    await expect(page.getByText('Updated description')).toBeVisible();
    await expect(page.getByText('Original description')).not.toBeVisible();

    // Refresh and verify persistence
    await page.reload();
    await page.getByLabel('New todo description').waitFor({ state: 'visible' });
    await expect(page.getByText('Updated description')).toBeVisible();
  });

  test('should change the per-page limit and update the displayed list', async ({ page }) => {
    // Create 15 todos via API and verify they exist
    for (let i = 1; i <= 15; i++) {
      await createTodoViaApi(page, `Limit test todo ${i}`);
    }

    // Verify via API that all 15 exist before loading the UI
    const verifyResponse = await page.request.get('/api/todos?page=1&limit=50');
    const verifyBody = await verifyResponse.json();
    if (!verifyBody.pagination || verifyBody.pagination.total < 15) {
      throw new Error(`Expected 15 todos but API reports ${JSON.stringify(verifyBody).slice(0, 200)}`);
    }

    await page.goto('/');
    await page.getByLabel('New todo description').waitFor({ state: 'visible' });

    // Wait for list items to render
    await page.getByRole('listitem').first().waitFor({ state: 'visible', timeout: 10000 });

    // Default limit is 10, so page 1 should show 10 items
    await expect(getTodoItems(page)).toHaveCount(10);

    // Open the limit dropdown (Radix Select trigger)
    const limitTrigger = page.getByRole('combobox', { name: /per page/i });
    await limitTrigger.click();

    // Select 20 from the dropdown
    await page.getByRole('option', { name: '20' }).click();

    // Now all 15 items should be visible on a single page
    await expect(getTodoItems(page)).toHaveCount(15);

    // Page buttons should disappear but per-page dropdown remains
    await expect(page.getByRole('button', { name: /go to page/i })).not.toBeVisible();
    await expect(page.getByRole('combobox', { name: /per page/i })).toBeVisible();
  });
});
