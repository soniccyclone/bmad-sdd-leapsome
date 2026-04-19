/**
 * Typed API client generated from OpenAPI spec.
 * Uses openapi-fetch for type-safe HTTP requests.
 *
 * Usage:
 *   import { client } from '@todo/api-spec/client';
 *   const { data, error } = await client.GET('/api/todos', { params: { query: { page: 1, limit: 10 } } });
 */
import createClient from 'openapi-fetch';
import type { paths } from '../generated/types.js';

export function createApiClient(baseUrl?: string) {
  return createClient<paths>({
    baseUrl: baseUrl ?? '',
  });
}

// Default client instance — uses relative URLs (works with Vite proxy in dev)
export const client = createApiClient();
