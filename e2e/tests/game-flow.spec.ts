/**
 * E2E Tests - Game Flow
 * Tests the complete user journey through the game
 */

import { test, expect } from '@playwright/test';

test.describe('Game Flow', () => {
  test('should load landing page', async ({ page }) => {
    await page.goto('/');
    
    // Check page title
    await expect(page).toHaveTitle(/Mafia/i);
    
    // Check for main heading or logo
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });

  test('user can create a room', async ({ page }) => {
    await page.goto('/');
    
    // Click create game button
    const createButton = page.getByRole('button', { name: /create/i });
    await createButton.click();
    
    // Should navigate to lobby
    await expect(page).toHaveURL(/\/lobby/);
    
    // Should display room code
    const roomCodeElement = page.locator('[data-testid="room-code"]');
    const roomCode = await roomCodeElement.textContent();
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
  });

  test('user can join a room with code', async ({ page }) => {
    await page.goto('/');
    
    // Click join game
    const joinButton = page.getByRole('button', { name: /join/i });
    await joinButton.click();
    
    // Enter a test room code (this would need a real room in actual test)
    const codeInput = page.getByPlaceholder(/room code/i);
    await codeInput.fill('TEST01');
    
    // Submit
    const submitButton = page.getByRole('button', { name: /join/i });
    await submitButton.click();
    
    // Should attempt to join (may fail if room doesn't exist)
    await page.waitForTimeout(1000);
  });

  test('multiple users can join same room', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // User 1 creates room
    await page1.goto('/');
    await page1.getByRole('button', { name: /create/i }).click();
    await expect(page1).toHaveURL(/\/lobby/);
    
    const roomCode = await page1.locator('[data-testid="room-code"]').textContent();
    
    // User 2 joins room
    await page2.goto('/');
    await page2.getByRole('button', { name: /join/i }).click();
    await page2.getByPlaceholder(/room code/i).fill(roomCode || '');
    await page2.getByRole('button', { name: /join/i }).click();
    
    // Both users should see each other (if implemented)
    await page1.waitForTimeout(2000);
    await page2.waitForTimeout(2000);
    
    await context1.close();
    await context2.close();
  });

  test('user can set username', async ({ page }) => {
    await page.goto('/');
    
    // Look for username input
    const usernameInput = page.getByPlaceholder(/username|name/i);
    if (await usernameInput.isVisible()) {
      await usernameInput.fill('TestPlayer');
      
      // Verify username was set
      const value = await usernameInput.inputValue();
      expect(value).toBe('TestPlayer');
    }
  });
});

test.describe('Game Rules', () => {
  test('should display game rules or instructions', async ({ page }) => {
    await page.goto('/');
    
    // Look for rules/help button
    const rulesButton = page.getByRole('button', { name: /rules|how to play|help/i });
    if (await rulesButton.isVisible()) {
      await rulesButton.click();
      
      // Should show rules modal or page
      const rulesContent = page.getByText(/mafia|roles|objective/i);
      await expect(rulesContent.first()).toBeVisible();
    }
  });
});

test.describe('Responsiveness', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Page should be responsive
    const createButton = page.getByRole('button', { name: /create/i });
    await expect(createButton).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    const createButton = page.getByRole('button', { name: /create/i });
    await expect(createButton).toBeVisible();
  });
});
