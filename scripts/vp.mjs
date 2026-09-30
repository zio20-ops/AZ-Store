import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const route = process.argv[2] || '/';
const out = process.argv[3] || 'shots/vp.png';
const width = Number(process.argv[4] || 1440);
const height = Number(process.argv[5] || 900);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', '--force-device-scale-factor=1'],
});
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 1 });
await page.goto('http://localhost:5173' + route, { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: out });
await browser.close();
console.log('shot', out);
