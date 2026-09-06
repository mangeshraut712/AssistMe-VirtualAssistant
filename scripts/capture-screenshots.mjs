/**
 * Capture live GitHub Pages screenshots for the README.
 *
 * Usage:
 *   npx playwright install chromium
 *   node scripts/capture-screenshots.mjs
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LIVE = 'https://mangeshraut712.github.io/AssistMe-VirtualAssistant/';
const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../docs/screenshots');

const browser = await chromium.launch({
  headless: true,
  args: ['--disable-dev-shm-usage'],
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: 'light',
  locale: 'en-US',
});

const page = await context.newPage();
page.setDefaultTimeout(45000);

async function waitForAppReady(heading) {
  await page.waitForLoadState('domcontentloaded');
  await page.locator('#root').waitFor({ state: 'visible' });
  await page.getByRole('heading', { name: heading }).waitFor({ state: 'visible' });
  await page.waitForTimeout(1800);
}

await mkdir(OUT_DIR, { recursive: true });

await page.goto(LIVE, { waitUntil: 'networkidle' });
await waitForAppReady(/What can I help with today/i);
const homePath = resolve(OUT_DIR, '01-home.png');
await page.screenshot({ path: homePath, fullPage: false });
console.log('saved', homePath, 'url=', page.url());

const imagineNav = page.locator('aside').getByText('Imagine', { exact: true });
if (await imagineNav.isVisible()) {
  await imagineNav.click();
} else {
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.locator('aside').getByText('Imagine', { exact: true }).click();
}
await page.waitForURL(/\/imagine/);
await waitForAppReady(/Imagine/i);
await page.getByText(/AI Image Studio/i).waitFor({ state: 'visible' });
await page.getByText('Digital Art', { exact: true }).click();
const prompt = page.getByPlaceholder(/Describe your imagination/i);
await prompt.click();
await prompt.fill('A quiet hillside village at dusk, cinematic lighting, painterly digital art');
await page.waitForTimeout(600);
const featurePath = resolve(OUT_DIR, '02-feature.png');
await page.screenshot({ path: featurePath, fullPage: false });
console.log('saved', featurePath, 'url=', page.url());

await browser.close();
