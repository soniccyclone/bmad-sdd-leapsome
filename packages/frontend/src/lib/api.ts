import { createApiClient } from '@todo/api-spec/schemas';

/**
 * Shared Zodios API client instance.
 * Uses relative base URL — works with Vite's proxy in dev.
 * In production, the frontend is served by nginx which proxies /api to the backend.
 */
export const api = createApiClient('/');
