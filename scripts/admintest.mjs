import puppeteer from 'puppeteer-core';

const EXEC = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:5173';
const IMG = 'C:\\Users\\Ziad\\Documents\\Qoder\\2026-09-30\\b4409103\\public\\images\\product-black-kiss.jpg';

const results = [];
const check = (n, ok, d = '') => { results.push({ n, ok, d }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? ' — ' + d : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: EXEC, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

const goto = async (p) => { await page.goto(BASE + p, { waitUntil: 'networkidle0' }); await sleep(450); };
const type = async (sel, val) => {
  await page.click(sel);
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  if (val) await page.type(sel, val);
};
const clickText = (sel, re) => page.evaluate((s, r) => {
  const el = [...document.querySelectorAll(s)].find((x) => new RegExp(r, 'i').test(x.textContent));
  if (el) { el.click(); return el.textContent.trim(); }
  return null;
}, sel, re.source);
const body = () => page.evaluate(() => document.body.textContent);

// ---- 1. Guard: unauthenticated redirect ----
await goto('/');
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
await goto('/admin');
check('unauthenticated /admin redirects to login', page.url().includes('/admin/login'), page.url());
await goto('/admin/products');
check('unauthenticated /admin/products redirects', page.url().includes('/admin/login'), page.url());

// ---- 2. Login page + invalid creds ----
check('login shows Admin Portal heading', /Admin Portal/.test(await body()));
await type('#ad-email', 'admin@azstore.eg');
await type('#ad-pw', 'wrong-password');
await clickText('button', /^login$/);
await sleep(700);
check('invalid credentials show error', /invalid email or password/i.test(await body()));

// show/hide password toggle
await page.evaluate(() => { [...document.querySelectorAll('.adlogin__pw button')][0].click(); });
const pwType = await page.$eval('#ad-pw', (el) => el.type);
check('show/hide password toggles input type', pwType === 'text', pwType);

// ---- 3. Successful login ----
await type('#ad-pw', 'AZ-admin!2026');
await clickText('button', /^login$/);
await sleep(900);
check('login lands inside the admin area', /\/admin/.test(page.url()) && !/\/admin\/login/.test(page.url()), page.url());
await goto('/admin');
const dash = await body();
check('dashboard shows overview cards', /Products/.test(dash) && /Revenue/.test(dash) && /Low Stock/.test(dash) && /Pending/.test(dash));
check('sidebar lists all sections', /Dashboard/.test(dash) && /Inventory/.test(dash) && /Customers/.test(dash) && /Settings/.test(dash));

// ---- 4. Products table + search ----
await goto('/admin/products');
let rows = await page.$$eval('.adtable tbody tr', (els) => els.length);
check('products table lists 4 seeded products', rows === 4, `${rows}`);
await type('.adbar input[aria-label="Search products"]', 'AZ-BLK');
await sleep(400);
rows = await page.$$eval('.adtable tbody tr', (els) => els.length);
check('search by SKU filters table', rows === 1, `${rows}`);
await type('.adbar input[aria-label="Search products"]', '');
await sleep(300);

// ---- 5. Create product with image upload ----
await goto('/admin/products/new');
await type('#pf-name', 'Amber Oud');
await type('#pf-sku', 'AZ-AMB-220');
await type('#pf-cat', 'Bold');
await type('#pf-tag', 'Warm amber with an oud heart.');
await type('#pf-desc', 'A resinous amber opening over smoky oud and soft musk.');
await type('#pf-price', '520');
await type('#pf-stock', '8');
await type('#pf-scent', 'Amber, Oud, Musk');
const fileInput = await page.$('input[type="file"][accept="image/*"]');
await fileInput.uploadFile(IMG);
await sleep(900);
const thumbs = await page.$$eval('.imgs__item .imgs__thumb', (els) => els.length);
check('uploaded image preview appears', thumbs === 1, `${thumbs}`);
await clickText('button[type="submit"]', /create product/);
await sleep(1200);
check('create redirects to products with toast', page.url().includes('/admin/products') && /created successfully/i.test(await body()), page.url());

// ---- 6. Customer store sees the new product ----
await goto('/shop');
check('new product visible in customer shop', /Amber Oud/.test(await body()));
await goto('/product/amber-oud');
const pdp = await body();
check('customer PDP shows new price EGP 520', /EGP 520/.test(pdp));
check('PDP shows admin scent notes', /Amber/.test(pdp) && /Oud/.test(pdp));

// ---- 7. Edit product: price + stock ----
await goto('/admin/products/edit/amber-oud');
await type('#pf-price', '599');
await type('#pf-stock', '3');
await clickText('button[type="submit"]', /save changes/);
await sleep(1200);
check('edit shows update toast', /updated successfully/i.test(await body()));
await goto('/product/amber-oud');
const pdp2 = await body();
check('customer sees updated price EGP 599', /EGP 599/.test(pdp2));
check('customer sees low stock (3 left)', /only 3 left/i.test(pdp2));

// ---- 8. Archive → hidden from customer, restore ----
await goto('/admin/products');
await page.evaluate(() => {
  const row = [...document.querySelectorAll('.adtable tbody tr')].find((r) => /Amber Oud/.test(r.textContent));
  [...row.querySelectorAll('.ad__actions button')].find((b) => /archive/i.test(b.textContent)).click();
});
await sleep(400);
check('archive confirmation dialog appears', /Archive Product\?/.test(await body()));
await clickText('.admodal button', /^archive$/);
await sleep(1000);
check('archive toast shown', /archived successfully/i.test(await body()));
await goto('/shop');
check('archived product hidden from customer shop', !/Amber Oud/.test(await body()));
await goto('/admin/products');
check('archived product still in admin', /Amber Oud/.test(await body()) && /Archived/.test(await body()));
await page.evaluate(() => {
  const row = [...document.querySelectorAll('.adtable tbody tr')].find((r) => /Amber Oud/.test(r.textContent));
  [...row.querySelectorAll('.ad__actions button')].find((b) => /restore/i.test(b.textContent)).click();
});
await sleep(1000);
await goto('/shop');
check('restored product visible again', /Amber Oud/.test(await body()));

// ---- 9. Duplicate ----
await goto('/admin/products');
await page.evaluate(() => {
  const row = [...document.querySelectorAll('.adtable tbody tr')].find((r) => /Amber Oud/.test(r.textContent));
  [...row.querySelectorAll('.ad__actions button')].find((b) => /duplicate/i.test(b.textContent)).click();
});
await sleep(1100);
const dupRow = await page.evaluate(() => {
  const row = [...document.querySelectorAll('.adtable tbody tr')].find((r) => /Amber Oud \(Copy\)/.test(r.textContent));
  return row ? row.textContent : '';
});
check('duplicate creates draft copy', /Amber Oud \(Copy\)/.test(dupRow) && /Draft/.test(dupRow), dupRow.slice(0, 60));
check('duplicate got new SKU', /AZ-AMB-220-C/.test(dupRow));

// ---- 10. Inventory management ----
await goto('/admin/inventory');
const skuRow = await page.evaluate(() => {
  const row = [...document.querySelectorAll('.adtable tbody tr')].find((r) => /AZ-BLK-220/.test(r.textContent));
  const stockInput = row.querySelectorAll('input')[0];
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(stockInput, '2');
  stockInput.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
});
await sleep(300);
await page.evaluate(() => {
  const row = [...document.querySelectorAll('.adtable tbody tr')].find((r) => /AZ-BLK-220/.test(r.textContent));
  [...row.querySelectorAll('.ad__actions button')].find((b) => /save/i.test(b.textContent)).click();
});
await sleep(1000);
check('inventory save toast', /inventory updated/i.test(await body()));
const lowBadge = await page.evaluate(() => {
  const row = [...document.querySelectorAll('.adtable tbody tr')].find((r) => /AZ-BLK-220/.test(r.textContent));
  return row.textContent.includes('Low Stock');
});
check('stock 2 recalculated as Low Stock', lowBadge && skuRow);

// ---- 11. Orders: status + payment verification ----
await goto('/admin/orders');
await page.evaluate(() => {
  const row = [...document.querySelectorAll('.adtable tbody tr')].find((r) => /AZ-2609-1001/.test(r.textContent));
  const sel = row.querySelectorAll('select')[0];
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(sel, '4');
  sel.dispatchEvent(new Event('change', { bubbles: true }));
});
await sleep(600);
check('order status update toast', /order status updated/i.test(await body()));
await goto('/track-order');
await page.evaluate(() => {
  const set = (el, v) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const inputs = document.querySelectorAll('.track__form input');
  set(inputs[0], 'AZ-2609-1001');
  set(inputs[1], '01000000000');
});
await page.click('.track__form button[type="submit"]');
await sleep(700);
const track = await body();
check('customer tracking reflects delivered status', /Delivered/.test(track) && !/Current stage/.test(track), '');

// payment verification on a wallet order: place one quickly
await goto('/product/amber-oud');
await page.evaluate(() => document.querySelectorAll('.pdp__buy .btn--primary')[0].click());
await sleep(400);
await goto('/checkout');
await page.evaluate(() => {
  const set = (label, v) => {
    const el = document.querySelector(`[aria-label="${label}"]`);
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  set('Full name', 'Ziad Test');
  set('Phone number', '01012345678');
  set('Email address', 'ziad@example.com');
  const gov = document.querySelector('select[aria-label="Governorate"]');
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(gov, gov.options[3].value);
  gov.dispatchEvent(new Event('change', { bubbles: true }));
  set('City', 'Cairo');
  set('Full address', '12 Tahrir Street');
});
await clickText('.opt', /instapay/i);
await sleep(300);
await page.evaluate(() => {
  const el = document.querySelector('[aria-label="Transaction reference number"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(el, 'IP-555123');
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await clickText('button', /place order/i);
await sleep(1000);
const newOrderId = ((await body()).match(/AZ-\d{4}-\d{4}/) || [])[0];
check('wallet order placed', !!newOrderId, newOrderId || 'none');

await goto('/admin/orders');
const walletRowTxt = await page.evaluate((id) => {
  const row = [...document.querySelectorAll('.adtable tbody tr')].find((r) => r.textContent.includes(id));
  return row ? row.textContent : '';
}, newOrderId);
check('admin shows transaction reference', /IP-555123/.test(walletRowTxt));
check('wallet order starts as Verification Required', /Verification Required/.test(walletRowTxt));
await page.evaluate((id) => {
  const row = [...document.querySelectorAll('.adtable tbody tr')].find((r) => r.textContent.includes(id));
  [...row.querySelectorAll('.ad__actions button')].find((b) => /verify payment/i.test(b.textContent)).click();
}, newOrderId);
await sleep(600);
check('verify payment marks Paid', /marked as paid/i.test(await body()));

// ---- 12. Categories CRUD ----
await goto('/admin/categories');
await type('#cat-name', 'New Arrivals');
await clickText('button[type="submit"]', /add category/);
await sleep(800);
check('category created', /New Arrivals/.test(await body()));
await page.evaluate(() => {
  const row = [...document.querySelectorAll('.adtable tbody tr')].find((r) => /New Arrivals/.test(r.textContent));
  [...row.querySelectorAll('.ad__actions button')].find((b) => /delete/i.test(b.textContent)).click();
});
await sleep(400);
await clickText('.admodal button', /delete category/);
await sleep(800);
check('empty category deleted', !/New Arrivals/.test(await body()));
// deleting a category with products is blocked
await page.evaluate(() => {
  const row = [...document.querySelectorAll('.adtable tbody tr')].find((r) => /Bold/.test(r.textContent));
  [...row.querySelectorAll('.ad__actions button')].find((b) => /delete/i.test(b.textContent)).click();
});
await sleep(400);
await clickText('.admodal button', /delete category/);
await sleep(800);
check('category with products cannot be deleted', /move its .* product/i.test(await body()));

// ---- 13. Customers ----
await goto('/admin/customers');
const cust = await body();
check('customers page lists buyer', /Ziad Test/.test(cust) && /Total spent/i.test(cust));
check('no sensitive payment data shown', !/\b\d{12,19}\b/.test(cust) && !/\b\d{3,4}\b\s*\/\s*(cvv|secret)/i.test(cust));
check('customers page discloses it never stores card data', /never collected/i.test(cust));

// ---- 14. Settings sync to storefront ----
await goto('/admin/settings');
await type('#set-ann', 'Winter mists are here');
await clickText('button[type="submit"]', /save settings/);
await sleep(900);
await goto('/');
check('announcement change reaches storefront', /Winter mists are here/.test(await body()));

// ---- 15. Delete product permanently ----
await goto('/admin/products');
await page.evaluate(() => {
  const row = [...document.querySelectorAll('.adtable tbody tr')].find((r) => /Amber Oud \(Copy\)/.test(r.textContent));
  [...row.querySelectorAll('.ad__actions button')].find((b) => /^delete$/i.test(b.textContent.trim())).click();
});
await sleep(400);
check('delete confirmation dialog', /Delete Product\?/.test(await body()) && /cannot be undone/i.test(await body()));
await clickText('.admodal button', /delete product/);
await sleep(1000);
check('delete toast', /deleted successfully/i.test(await body()));
check('deleted product gone from table', await page.evaluate(() => ![...document.querySelectorAll('.adtable tbody tr')].some((r) => /Amber Oud \(Copy\)/.test(r.textContent))));

// ---- 16. Preview modal ----
await page.evaluate(() => {
  const row = [...document.querySelectorAll('.adtable tbody tr')].find((r) => /Black Kiss/.test(r.textContent));
  [...row.querySelectorAll('.ad__actions button')].find((b) => /preview/i.test(b.textContent)).click();
});
await sleep(500);
const prev = await body();
check('preview modal shows customer view', /Customer preview/.test(prev) && /Add to Bag/.test(prev));
await page.keyboard.press('Escape');
await clickText('.admodal button', /^close$/);
await sleep(300);

// ---- 17. Logout invalidates session ----
await clickText('.ad__side-foot button', /logout/);
await sleep(800);
check('logout returns to login page', page.url().includes('/admin/login'), page.url());
await goto('/admin/orders');
check('session invalidated after logout', page.url().includes('/admin/login'), page.url());

// ---- 18. Mobile admin layout ----
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await type('#ad-email', 'admin@azstore.eg');
await type('#ad-pw', 'AZ-admin!2026');
await clickText('button', /^login$/);
await sleep(900);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('admin dashboard no horizontal scroll at 390px', overflow <= 1, `overflow=${overflow}`);
await page.click('[aria-label="Open admin menu"]');
await sleep(500);
check('mobile sidebar drawer opens', await page.$eval('.ad__side', (el) => el.classList.contains('ad__side--open')));
await goto('/admin/products');
const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('products table no horizontal scroll at 390px', overflow2 <= 1, `overflow=${overflow2}`);

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log('FAILED:');
  failed.forEach((f) => console.log(' -', f.n, f.d));
  process.exit(1);
}
