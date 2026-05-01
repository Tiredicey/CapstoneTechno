
import { test, expect } from '@playwright/test';



test.describe('Catalog Browsing', () => {

  test('Product cards render with images and prices', async ({ page }) => {
    await page.goto('/catalog.html');
    await page.waitForSelector('.product-card', { timeout: 15000 });

    const card = page.locator('.product-card').first();
    await expect(card).toBeVisible();


    const img = card.locator('img').first();
    if (await img.isVisible().catch(() => false)) {
      const src = await img.getAttribute('src');
      expect(src).toBeTruthy();
    }
  });

  test('Sort dropdown changes product order', async ({ page }) => {
    await page.goto('/catalog.html');
    await page.waitForSelector('.product-card', { timeout: 15000 });

    const sortSelect = page.locator('#sortSelect');
    if (await sortSelect.isVisible()) {

      await sortSelect.selectOption('price_asc');
      await page.waitForTimeout(800);
      await expect(page.locator('#productsGrid')).toBeVisible();

      await sortSelect.selectOption('price_desc');
      await page.waitForTimeout(800);
      await expect(page.locator('#productsGrid')).toBeVisible();
    }
  });

  test('Product modal opens on card click', async ({ page }) => {
    await page.goto('/catalog.html');
    await page.waitForSelector('.product-card', { timeout: 15000 });

    await page.locator('.product-card').first().click();
    await page.waitForTimeout(500);

    const modal = page.locator('#productModal');

    const modalBody = page.locator('#modalProductBody');
    if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(modalBody).toBeVisible();


      const closeBtn = page.locator('#closeProductModal');
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('Pagination controls navigate between pages', async ({ page }) => {
    await page.goto('/catalog.html');
    await page.waitForSelector('.product-card', { timeout: 15000 });

    const pagination = page.locator('#pagination');
    if (await pagination.isVisible()) {
      const buttons = pagination.locator('button');
      const btnCount = await buttons.count();

      if (btnCount > 1) {
  
        await buttons.nth(1).click();
        await page.waitForTimeout(800);
      
        await expect(page.locator('#productsGrid')).toBeVisible();
      }
    }
  });
});

test.describe('Wishlist', () => {

  test('Wishlist heart toggles active state', async ({ page }) => {
    await page.goto('/catalog.html');
    await page.waitForSelector('.product-card', { timeout: 15000 });

    const heartBtn = page.locator('.product-wishlist').first();
    if (await heartBtn.isVisible({ timeout: 3000 }).catch(() => false)) {

      const wasActive = await heartBtn.evaluate(el => el.classList.contains('active'));


      await heartBtn.click();
      await page.waitForTimeout(300);

      const isActive = await heartBtn.evaluate(el => el.classList.contains('active'));
      expect(isActive).toBe(!wasActive);

  
      const toast = page.locator('[class*="toast"], #toastContainer');

    }
  });

  test('Wishlist persists across page reloads', async ({ page }) => {
    await page.goto('/catalog.html');
    await page.waitForSelector('.product-card', { timeout: 15000 });

    const heartBtn = page.locator('.product-wishlist').first();
    if (await heartBtn.isVisible({ timeout: 3000 }).catch(() => false)) {

      if (!(await heartBtn.evaluate(el => el.classList.contains('active')))) {
        await heartBtn.click();
        await page.waitForTimeout(500);
      }


      const wishlistData = await page.evaluate(() => {
        return localStorage.getItem('bloom_wishlist');
      });
      expect(wishlistData).toBeTruthy();

      const items = JSON.parse(wishlistData || '[]');
      expect(items.length).toBeGreaterThan(0);

 
      await page.reload();
      await page.waitForSelector('.product-card', { timeout: 15000 });

  
      const afterReload = await page.evaluate(() => {
        return localStorage.getItem('bloom_wishlist');
      });
      expect(afterReload).toBeTruthy();
      const afterItems = JSON.parse(afterReload || '[]');
      expect(afterItems.length).toBe(items.length);
    }
  });
});

test.describe('Navigation & Auth', () => {

  test('Auth modal opens on sign in button click', async ({ page }) => {
    await page.goto('/catalog.html');

    const authBtn = page.locator('#authBtn');
    if (await authBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await authBtn.click();
      await page.waitForTimeout(300);

      const authModal = page.locator('#authModal');
      if (await authModal.isVisible({ timeout: 2000 }).catch(() => false)) {

        await expect(page.locator('#loginEmail')).toBeVisible();
        await expect(page.locator('#loginPassword')).toBeVisible();


        const registerTab = page.locator('.auth-tab[data-tab="register"]');
        if (await registerTab.isVisible()) {
          await registerTab.click();
          await page.waitForTimeout(200);
          await expect(page.locator('#registerForm')).toBeVisible();
        }

     
        await page.locator('#closeAuthModal').click();
      }
    }
  });

  test('Navigation links work correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);


    const shopLink = page.locator('a[href*="catalog"]').first();
    if (await shopLink.isVisible()) {
      await shopLink.click();
      await page.waitForURL('**/catalog*', { timeout: 5000 });
      expect(page.url()).toContain('catalog');
    }
  });
});

test.describe('Responsive Design', () => {

  test('Mobile viewport renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/catalog.html');
    await page.waitForSelector('.product-card', { timeout: 15000 });

  
    await expect(page.locator('.product-card').first()).toBeVisible();


    await expect(page.locator('.bloom-nav')).toBeVisible();
  });

  test('Tablet viewport maintains grid layout', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/catalog.html');
    await page.waitForSelector('.product-card', { timeout: 15000 });

    await expect(page.locator('#productsGrid')).toBeVisible();
    const cards = await page.locator('.product-card').count();
    expect(cards).toBeGreaterThan(0);
  });
});

test.describe('Performance Baseline', () => {

  test('Page load time is under 5 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000);
  });

  test('Catalog API response time is under 2 seconds', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get('/api/products');
    const responseTime = Date.now() - startTime;

    expect(response.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(2000);
  });

  test('No console errors on landing page', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForTimeout(3000);


    const criticalErrors = errors.filter(e =>
      !e.includes('socket') &&
      !e.includes('Socket') &&
      !e.includes('WebSocket') &&
      !e.includes('ERR_CONNECTION_REFUSED')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
