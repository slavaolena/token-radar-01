const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Load the dashboard
  await page.goto('file:///home/ubuntu/.hermes/cache/scratch/token-radar-01-kit/test-output/dashboard/index.html');
  await page.waitForLoadState('networkidle');

  // Wait for content to render
  await page.waitForTimeout(1000);

  // Screenshot 1: Board view (full page)
  await page.evaluate(() => {
    // Reset any filters
    window.state = { q: '', category: 'all', tab: 'pre-token', sort: 'implied', dir: -1, selected: null };
    window.render();
  });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: '/home/ubuntu/.hermes/cache/scratch/token-radar-01-kit/screenshots/1-board.png',
    fullPage: true,
    type: 'png',
    clip: { x: 0, y: 0, width: 1400, height: 900 }
  });
  console.log('Screenshot 1: Board view done');

  // Screenshot 2: Detail view - open first row
  await page.evaluate(() => {
    if (window.DATA && window.DATA.rows && window.DATA.rows.length > 0) {
      window.openDetail(window.DATA.rows[0].slug);
    }
  });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: '/home/ubuntu/.hermes/cache/scratch/token-radar-01-kit/starter/screenshots/2-detail.png',
    fullPage: true,
    type: 'png',
    clip: { x: 0, y: 0, width: 1400, height: 900 }
  });
  console.log('Screenshot 2: Detail view done');

  // Screenshot 3: Filtered view (Lending category)
  await page.evaluate(() => {
    window.state = { q: '', category: 'Lending', tab: 'pre-token', sort: 'implied', dir: -1, selected: null };
    window.render();
  });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: '/home/ubuntu/.hermes/cache/scratch/token-radar-01-kit/starter/screenshots/3-filtered.png',
    fullPage: true,
    type: 'png',
    clip: { x: 0, y: 0, width: 1400, height: 900 }
  });
  console.log('Screenshot 3: Filtered view done');

  await browser.close();
  console.log('All screenshots generated!');
})();
