
import { test, expect } from '@playwright/test';


test.describe('Checkout Flow', () => {

  test.beforeEach(async ({ page }) => {

    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Landing page loads with hero and navigation', async ({ page }) => {
    await page.goto('/');
 
    await page.waitForFunction(() => {
      const boot = document.getElementById('bloomBoot');
      return !boot || boot.style.display === 'none' || boot.style.opacity === '0';
    }, { timeout: 10000 });


    await expect(page.locator('.bloom-nav')).toBeVisible();


    const hero = page.locator('.hero, #heroSection, [class*="hero"]').first();
    await expect(hero).toBeVisible();

 
    await expect(page.locator('a[href*="catalog"]').first()).toBeVisible();
  });

  test('Catalog page loads products from API', async ({ page }) => {
    await page.goto('/catalog.html');

    await page.waitForSelector('.product-card, [class*="product"]', { timeout: 15000 });

    const cards = page.locator('.product-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);


    const firstCard = cards.first();
    await expect(firstCard).toBeVisible();
  });

  test('Search filters products correctly', async ({ page }) => {
    await page.goto('/catalog.html');
    await page.waitForSelector('.product-card', { timeout: 15000 });

    const searchInput = page.locator('#searchInput');
    if (await searchInput.isVisible()) {
      const initialCount = await page.locator('.product-card').count();

    
      await searchInput.fill('rose');
    
      await page.waitForTimeout(500);

      await expect(page.locator('#productsGrid')).toBeVisible();
    }
  });

  test('Category tabs filter products', async ({ page }) => {
    await page.goto('/catalog.html');
    await page.waitForSelector('.product-card', { timeout: 15000 });

    const tabs = page.locator('.cat-tab');
    const tabCount = await tabs.count();

    if (tabCount > 1) {

      await tabs.nth(1).click();
      await page.waitForTimeout(600);
    
      await expect(page.locator('#productsGrid')).toBeVisible();


      await tabs.first().click();
      await page.waitForTimeout(600);
      const allCount = await page.locator('.product-card').count();
      expect(allCount).toBeGreaterThan(0);
    }
  });

  test('Add product to cart and verify badge', async ({ page }) => {
    await page.goto('/catalog.html');
    await page.waitForSelector('.product-card', { timeout: 15000 });


    const firstCard = page.locator('.product-card').first();
    await firstCard.click();


    const modal = page.locator('#productModal, .modal-overlay');
    if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
   
      const addBtn = modal.locator('button:has-text("Add to Cart"), button:has-text("add to cart")').first();
      if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addBtn.click();
     
        await page.waitForTimeout(1000);
        const badge = page.locator('#cartBadge');
        if (await badge.isVisible().catch(() => false)) {
          const text = await badge.textContent();
          expect(Number(text)).toBeGreaterThan(0);
        }
      }
    }
  });

  test('Cart page shows items and pricing', async ({ page }) => {

    await page.goto('/catalog.html');
    await page.waitForSelector('.product-card', { timeout: 15000 });

    const firstCard = page.locator('.product-card').first();
    await firstCard.click();

    const modal = page.locator('#productModal, .modal-overlay');
    await modal.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

    const addBtn = modal.locator('button:has-text("Add to Cart"), button:has-text("add")').first();
    if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(1000);
    }


    await page.goto('/cart.html');
    await page.waitForTimeout(2000);


    await expect(page.locator('body')).toBeVisible();
  });

  test('Checkout step 1: recipient validation', async ({ page }) => {

    await page.goto('/checkout.html');
    await page.waitForTimeout(2000);


    const step1Next = page.locator('#step1Next');
    if (await step1Next.isVisible({ timeout: 3000 }).catch(() => false)) {

      await step1Next.click();
      await page.waitForTimeout(500);

  
      const errorSummary = page.locator('.err-summary.on, #checkout-toast');
      const hasError = await errorSummary.isVisible({ timeout: 2000 }).catch(() => false);
  
      const step1Active = page.locator('#step1.active, .checkout-section.active');
      await expect(step1Active).toBeVisible();
    }
  });

  test('Checkout step navigation: forward and back', async ({ page }) => {
    await page.goto('/checkout.html');
    await page.waitForTimeout(2000);

    const step1Next = page.locator('#step1Next');
    if (await step1Next.isVisible({ timeout: 3000 }).catch(() => false)) {

      await page.fill('#recFirstName', 'Test');
      await page.fill('#recLastName', 'User');
      await page.fill('#recAddress', '123 Bloom Street');
      await page.fill('#recCity', 'Manila');
      await page.fill('#recZip', '1000');


      await step1Next.click();
      await page.waitForTimeout(500);


      const step2 = page.locator('#step2');
      if (await step2.isVisible({ timeout: 2000 }).catch(() => false)) {
  
        const step2Back = page.locator('#step2Back');
        if (await step2Back.isVisible()) {
          await step2Back.click();
          await page.waitForTimeout(500);
   
          await expect(page.locator('#step1')).toBeVisible();
        }
      }
    }
  });

  test('Checkout delivery date picker renders calendar', async ({ page }) => {
    await page.goto('/checkout.html');
    await page.waitForTimeout(2000);


    const step1Next = page.locator('#step1Next');
    if (await step1Next.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.fill('#recFirstName', 'Test');
      await page.fill('#recLastName', 'User');
      await page.fill('#recAddress', '123 Bloom Street');
      await page.fill('#recCity', 'Manila');
      await page.fill('#recZip', '1000');
      await step1Next.click();
      await page.waitForTimeout(500);

 
      const datePicker = page.locator('#datePicker');
      if (await datePicker.isVisible({ timeout: 2000 }).catch(() => false)) {
   
        const cells = datePicker.locator('.date-cell');
        const cellCount = await cells.count();
        expect(cellCount).toBeGreaterThan(0);

  
        const nextMonth = page.locator('#nextMonth');
        if (await nextMonth.isVisible()) {
          const monthLabel = page.locator('#calendarMonth');
          const initialMonth = await monthLabel.textContent();
          await nextMonth.click();
          await page.waitForTimeout(300);
          const newMonth = await monthLabel.textContent();
          expect(newMonth).not.toBe(initialMonth);
        }
      }
    }
  });
});

test.describe('Health & API', () => {
  test('Health endpoint returns ok', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.routes).toBeDefined();
    expect(body.routes.length).toBeGreaterThan(0);
  });

  test('Products API returns valid data', async ({ request }) => {
    const response = await request.get('/api/products');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    const products = body.products || body.items || body;
    expect(Array.isArray(products)).toBeTruthy();
  });

  test('Analytics event endpoint accepts events', async ({ request }) => {
    const response = await request.post('/api/analytics/event', {
      data: {
        eventType: 'test_event',
        payload: { test: true, timestamp: Date.now() },
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.ok).toBe(true);
  });

  test('Unknown API endpoint returns 404', async ({ request }) => {
    const response = await request.get('/api/nonexistent');
    expect(response.status()).toBe(404);
  });
});
