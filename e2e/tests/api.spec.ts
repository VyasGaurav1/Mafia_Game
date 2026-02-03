/**
 * E2E Tests - API Health Check
 */

import { test, expect } from '@playwright/test';

test.describe('API Health', () => {
  test('health endpoint should return OK', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/health');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('uptime');
  });

  test('API should handle CORS correctly', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/health', {
      headers: {
        'Origin': 'http://localhost'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const headers = response.headers();
    expect(headers).toHaveProperty('access-control-allow-origin');
  });
});
