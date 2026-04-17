import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { clearAllTodos, createTodoViaApi } from './helpers.js';

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await clearAllTodos(page);
  });

  test('should have no critical accessibility violations on the main page', async ({ page }) => {
    // Create a few todos so the page has meaningful content to audit
    await createTodoViaApi(page, 'First todo for a11y test');
    await createTodoViaApi(page, 'Second todo for a11y test');
    await createTodoViaApi(page, 'Third todo for a11y test');

    await page.goto('/');
    await page.getByLabel('New todo description').waitFor({ state: 'visible' });

    // Wait for todos to render
    await expect(page.getByRole('listitem')).toHaveCount(3);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Filter to only critical and serious violations
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    expect(criticalViolations, `Found ${criticalViolations.length} critical/serious a11y violation(s):\n${
      criticalViolations.map((v) => `  - ${v.id}: ${v.description} (${v.impact})`).join('\n')
    }`).toHaveLength(0);
  });
});
