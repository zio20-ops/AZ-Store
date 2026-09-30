import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:5173';
const OUT = 'shots';

const routes = process.argv[2] ? [process.argv[2]] : ['/', '/shop', '/product/through-the-night', '/product/trio-gift-box', '/cart', '/checkout', '/order-confirmation', '/track-order', '/about', '/contact', '/faq'];

fs.mkdirSync(OUT, { recursive: true });

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', '--force-device-scale-factor=1'],
});

for (const vp of viewports) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(() => {
    window.localStorage.setItem('az.cart', JSON.stringify([
      { key: 'black-kiss__220', productId: 'black-kiss', variationId: '220', qty: 1 },
      { key: 'trio-gift-box__3x220', productId: 'trio-gift-box', variationId: '3x220', qty: 1 },
    ]));
  });
  for (const route of routes) {
    const url = BASE + route;
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.evaluate(() => new Promise((r) => {
      window.scrollTo(0, document.body.scrollHeight);
      setTimeout(() => { window.scrollTo(0, 0); setTimeout(r, 400); }, 500);
    }));
    const file = `${OUT}/${vp.name}${route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || '-home'}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log('shot', file);
  }
  await page.close();
}

await browser.close();
