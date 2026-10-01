// Comprehensive end-to-end verification for the AZ Store deployment build.
// Runs against the local (demo) backend on http://localhost:5173 and exercises
// the flows that matter for go-live: admin sign-in, payment-method settings,
// admin user management + password change, then a customer wallet purchase,
// order confirmation and public order tracking.
import puppeteer from 'puppeteer-core';

const EXEC = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE_URL || 'http://localhost:5173';

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: EXEC, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const pageErrors = [];
page.on('pageerror', (e) => { pageErrors.push(e.message); console.log('PAGEERROR:', e.message); });

const goto = async (p) => { await page.goto(BASE + p, { waitUntil: 'networkidle0' }); await sleep(450); };
const body = () => page.evaluate(() => document.body.textContent);

const setVal = (selector, val) => page.evaluate((s, v) => {
  const el = document.querySelector(s);
  if (!el) return false;
  const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}, selector, val);

const setByLabel = (label, val) => page.evaluate((l, v) => {
  const el = document.querySelector(`[aria-label="${l}"]`);
  if (!el) return false;
  const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}, label, val);

const clickByText = (sel, re) => page.evaluate((s, r) => {
  const el = [...document.querySelectorAll(s)].find((x) => new RegExp(r, 'i').test(x.textContent || ''));
  if (el) { el.click(); return true; }
  return false;
}, sel, re.source);

const checkCheckboxByLabel = (labelText, want) => page.evaluate((lt, w) => {
  const label = [...document.querySelectorAll('label.adcheck')].find((l) => new RegExp(lt, 'i').test(l.textContent || ''));
  if (!label) return false;
  const input = label.querySelector('input[type="checkbox"]');
  if (!input) return false;
  if (input.checked !== w) input.click();
  return input.checked === w;
}, labelText, want);

// ---- Fresh state ----
await goto('/');
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

// ============ PART A — ADMIN ============
console.log('\n== ADMIN ==');
await goto('/admin');
check('A1 unauthenticated /admin redirects to login', page.url().includes('/admin/login'), page.url());

await goto('/admin/login');
check('A2 demo credentials hint shown in local mode', /admin@azstore\.eg/i.test(await body()));
await setVal('#ad-email', 'admin@azstore.eg');
await setVal('#ad-pw', 'wrong-password');
await clickByText('.adlogin__box button[type="submit"]', /login/i);
await sleep(700);
check('A3 invalid password rejected', /invalid email or password/i.test(await body()));

await setVal('#ad-email', 'admin@azstore.eg');
await setVal('#ad-pw', 'AZ-admin!2026');
await clickByText('.adlogin__box button[type="submit"]', /login/i);
await sleep(1200);
check('A4 valid login reaches /admin', /\/admin$/.test(page.url()) || page.url().endsWith('/admin'), page.url());

// ---- Settings: enable wallets ----
await goto('/admin/settings');
await sleep(500);
const ipOn = await checkCheckboxByLabel('Enable InstaPay', true);
const vfOn = await checkCheckboxByLabel('Enable Vodafone Cash', true);
check('A5 toggled InstaPay + Vodafone on', ipOn && vfOn, `ip=${ipOn} vf=${vfOn}`);
await setVal('#set-instapay-account', 'azstore@instapay');
await setVal('#set-instapay-name', 'AZ Store');
await setVal('#set-vodafone-number', '01000000000');
await clickByText('form button[type="submit"]', /save settings/i);
await sleep(1000);
check('A6 settings saved toast', /settings saved/i.test(await body()));
const savedSettings = await page.evaluate(() => localStorage.getItem('az.settings'));
check('A7 wallet config persisted', /01000000000/.test(savedSettings || '') && /instapay/.test(savedSettings || ''), (savedSettings || '').slice(0, 80));

// ---- Admin access page: list + add + delete ----
await goto('/admin/users');
await sleep(700);
check('A8 admin access page lists owner', /admin@azstore\.eg/i.test(await body()) && /owner/i.test(await body()));
const ownerRemoveDisabled = await page.evaluate(() => {
  const row = [...document.querySelectorAll('.adtable tbody tr')].find((r) => /owner/i.test(r.textContent));
  const btn = row && row.querySelector('button');
  return btn ? btn.disabled : null;
});
check('A9 owner cannot be removed (button disabled)', ownerRemoveDisabled === true, String(ownerRemoveDisabled));

await setVal('#u-email', 'helper.admin@example.com');
await setVal('#u-pass', 'TempPass123');
await clickByText('form button[type="submit"]', /add administrator/i);
await sleep(900);
const hasHelper = /helper\.admin@example\.com/i.test(await body());
check('A10 added admin appears in list', hasHelper);

const removed = await page.evaluate(() => {
  const row = [...document.querySelectorAll('.adtable tbody tr')].find((r) => /helper\.admin@example\.com/i.test(r.textContent));
  const btn = row && [...row.querySelectorAll('button')].find((b) => /remove/i.test(b.textContent));
  if (btn && !btn.disabled) { btn.click(); return true; }
  return false;
});
await sleep(400);
check('A11 remove opens confirm dialog', removed && Boolean(await page.$('.admodal')));
await clickByText('.admodal .btn--danger', /remove/i);
await sleep(900);
const stillListed = await page.evaluate(() =>
  [...document.querySelectorAll('.adtable tbody tr')].some((r) => /helper\.admin@example\.com/i.test(r.textContent)));
check('A12 admin removed from list', stillListed === false, `stillListed=${stillListed}`);

// ---- Change my password: wrong current rejected, then real change + revert ----
await setVal('#p-cur', 'not-the-password');
await setVal('#p-new', 'NewPass!2026');
await setVal('#p-conf', 'NewPass!2026');
await clickByText('form button[type="submit"]', /update password/i);
await sleep(700);
check('A13 wrong current password rejected', /current password is not correct/i.test(await body()));

await setVal('#p-cur', 'AZ-admin!2026');
await setVal('#p-new', 'NewPass!2026');
await setVal('#p-conf', 'NewPass!2026');
await clickByText('form button[type="submit"]', /update password/i);
await sleep(800);
check('A14 password changed', /password changed/i.test(await body()));

await setVal('#p-cur', 'NewPass!2026');
await setVal('#p-new', 'AZ-admin!2026');
await setVal('#p-conf', 'AZ-admin!2026');
await clickByText('form button[type="submit"]', /update password/i);
await sleep(800);
check('A15 password reverted (change is real & re-verifiable)', /password changed/i.test(await body()));

// ---- Orders page shows payment verification control on the seeded wallet-capable order ----
await goto('/admin/orders');
await sleep(600);
check('A16 orders page lists orders with payment status', /payment status|verification|paid|pending/i.test(await body()));

// ============ PART B — CUSTOMER ============
console.log('\n== CUSTOMER ==');
await goto('/shop');
await sleep(500);
const cards = await page.$$('.card');
check('B1 shop renders product cards', cards.length >= 4, `${cards.length}`);

const quickAdded = await page.evaluate(() => {
  const c = [...document.querySelectorAll('.card')].find((x) => /black kiss/i.test(x.textContent));
  const q = c && c.querySelector('.card__quick');
  if (q && !q.disabled) { q.click(); return true; }
  return false;
});
await sleep(600);
check('B2 quick add to bag', quickAdded);
const bagCount = await page.$eval('.bag-count', (el) => el.textContent.trim()).catch(() => '');
check('B3 bag count reflects 1 item', bagCount === '1', bagCount);

// open drawer and checkout
await page.click('.bag-icon-btn');
await sleep(500);
const drawerOpen = await page.$eval('.drawer', (el) => el.className.includes('drawer--open')).catch(() => false);
check('B4 cart drawer opens', drawerOpen);
await clickByText('.drawer button, .drawer a', /checkout/i);
await sleep(900);
check('B5 drawer checkout navigates to /checkout', page.url().includes('/checkout'), page.url());

// fill customer details
await setByLabel('Full name', 'Ziad Test');
await setByLabel('Phone number', '01012345678');
await setByLabel('Email address', 'ziad@example.com');
await page.evaluate(() => {
  const gov = document.querySelector('select[aria-label="Governorate"]');
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(gov, gov.options[3].value);
  gov.dispatchEvent(new Event('change', { bubbles: true }));
});
await setByLabel('City', 'Cairo');
await setByLabel('Full address', '12 Tahrir Street');
await sleep(200);

// payment methods now include wallets (enabled by admin in Part A)
const payOpts = await page.$$eval('.opt', (els) => els.map((e) => (e.textContent || '').toLowerCase()));
check('B6 checkout offers COD + wallets', payOpts.some((t) => /cash on delivery/.test(t)) && payOpts.some((t) => /vodafone/.test(t)) && payOpts.some((t) => /instapay/.test(t)), JSON.stringify(payOpts.slice(0, 6)));

await clickByText('.opt', /express/i);
await clickByText('.opt', /vodafone/i);
await sleep(400);
const vodNote = await page.$eval('.paynote', (el) => el.textContent).catch(() => '');
check('B7 Vodafone paynote shows configured number', /01000000000/.test(vodNote), vodNote.trim().slice(0, 60));
await setVal('.paynote input', 'TX-987654');
await sleep(200);

await clickByText('button', /place order/i);
await sleep(1400);
check('B8 lands on /order-confirmation', page.url().includes('/order-confirmation'), page.url());
const confTxt = await body();
const orderNo = (confTxt.match(/AZ-\d{4}-\d{4}/) || [])[0];
check('B9 confirmation shows order number', !!orderNo, orderNo || 'none');
check('B10 confirmation mentions payment verification', /verif/i.test(confTxt));

// ---- Public tracking ----
await goto('/track-order');
await sleep(400);
await page.evaluate((no) => {
  const set = (el, v) => { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
  const inputs = document.querySelectorAll('.track__form input');
  set(inputs[0], no); set(inputs[1], '01012345678');
}, orderNo);
await page.click('.track__form button[type="submit"]');
await sleep(800);
const steps = await page.$$eval('.step', (els) => els.length).catch(() => 0);
check('B11 tracking shows 5-step timeline', steps === 5, `${steps}`);
const nowDots = await page.$$eval('.step--now', (els) => els.length).catch(() => 0);
check('B12 current stage marked once', nowDots === 1, `${nowDots}`);

await goto('/track-order');
await page.evaluate((no) => {
  const set = (el, v) => { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
  const inputs = document.querySelectorAll('.track__form input');
  set(inputs[0], no); set(inputs[1], '01099999999');
}, orderNo);
await page.click('.track__form button[type="submit"]');
await sleep(600);
const trackErr = await page.$eval('.field-error', (el) => el.textContent).catch(() => '');
check('B13 mismatched phone rejected', /couldn.t find|not found|no order/i.test(trackErr), trackErr);

// ============ PART C — MOBILE SMOKE ============
console.log('\n== MOBILE ==');
await page.setViewport({ width: 390, height: 844 });
await goto('/');
await sleep(500);
check('C1 home renders on mobile', /az/i.test(await body()));
await clickByText('.header__menu-btn', /menu/i);
await sleep(500);
const menuOpen = await page.$eval('.mmenu', (el) => el.className.includes('mmenu--open')).catch(() => false);
check('C2 mobile menu opens', menuOpen);
const menuHasTrack = await page.evaluate(() => [...document.querySelectorAll('.mmenu a')].some((a) => /track order/i.test(a.textContent)));
check('C3 mobile menu lists Track order', menuHasTrack);

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (pageErrors.length) console.log('PAGE ERRORS:', pageErrors);
if (failed.length) { console.log('FAILED:'); failed.forEach((f) => console.log(' -', f.name, f.detail)); process.exit(1); }
