import puppeteer from 'puppeteer-core';

const EXEC = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: EXEC, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 940, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
const goto = async (p) => { await page.goto('http://localhost:5173' + p, { waitUntil: 'networkidle0' }); await sleep(600); };
const shot = async (name) => { await page.screenshot({ path: `shots/${name}.png` }); console.log('shot', name); };

await goto('/admin/login');
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
await goto('/admin/login');
await shot('admin-login');

await page.type('#ad-email', 'admin@azstore.eg');
await page.type('#ad-pw', 'AZ-admin!2026');
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /^login$/i.test(b.textContent)).click());
await sleep(1400);
await shot('admin-dashboard');

await goto('/admin/products');
await shot('admin-products');

await goto('/admin/products/new');
await shot('admin-product-form');

await goto('/admin/orders');
await shot('admin-orders');

await goto('/admin/inventory');
await shot('admin-inventory');

await page.setViewport({ width: 390, height: 844 });
await goto('/admin/products');
await shot('admin-products-mobile');
await page.click('[aria-label="Open admin menu"]');
await sleep(600);
await shot('admin-drawer-mobile');

await browser.close();
