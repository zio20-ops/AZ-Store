import puppeteer from 'puppeteer-core';

const EXEC = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE_URL || 'http://localhost:5173';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: EXEC, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

async function goto(path) {
  await page.goto(BASE + path, { waitUntil: 'networkidle0' });
  await sleep(400);
}
const setVal = (selector, val, label) => page.evaluate((s, v, l) => {
  const el = l ? document.querySelector(`[aria-label="${l}"]`) : document.querySelector(s);
  if (!el) return false;
  const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}, selector, val, label);
const clickByText = (sel, re) => page.evaluate((s, r) => {
  const el = [...document.querySelectorAll(s)].find((x) => new RegExp(r, 'i').test(x.textContent));
  if (el) { el.click(); return true; }
  return false;
}, sel, re.source);

// fresh state
await goto('/');
await page.evaluate(() => localStorage.clear());

// ---- 1. Shop: quick add ----
await goto('/shop');
const cards = await page.$$('.card');
check('shop renders 4 product cards', cards.length === 4, `${cards.length}`);

const added = await page.evaluate(() => {
  const c = [...document.querySelectorAll('.card')].find((x) => /black kiss/i.test(x.textContent));
  const q = c && c.querySelector('.card__quick');
  if (q && !q.disabled) { q.click(); return true; }
  return false;
});
check('clicked quick add on Black Kiss', added);
await sleep(500);
const bagLabel = await page.$eval('.bagpill', (el) => el.getAttribute('aria-label'));
check('bag pill shows 1 item', /1 item/.test(bagLabel), bagLabel);
const toastTxt = await page.$eval('.toast', (el) => el.textContent).catch(() => '');
check('toast "Added to your bag"', /added/i.test(toastTxt), toastTxt);

// ---- 2. Drawer: qty, promo ----
await page.click('.bagpill');
await sleep(500);
const drawerOpen = await page.$eval('.drawer', (el) => el.classList.contains('drawer--open'));
check('cart drawer opens', drawerOpen);
const drawerLines = await page.$$eval('.drawer__items .li', (els) => els.length).catch(() => 0);
check('drawer shows a line item', drawerLines === 1, `${drawerLines}`);
const shipbar = await page.$eval('.shipbar', (el) => el.textContent).catch(() => '');
check('free-delivery progress shown', /free delivery/i.test(shipbar), shipbar.trim().slice(0, 50));

await page.click('button[aria-label^="Increase"]');
await sleep(300);
const bag2 = await page.$eval('.bagpill', (el) => el.getAttribute('aria-label'));
check('qty + raises count to 2', /2 items/.test(bag2), bag2);

await setVal(null, 'BOGUS', 'Promo code');
await page.click('.drawer__promo button');
await sleep(400);
const promoErr = await page.$eval('.promo-msg--err', (el) => el.textContent).catch(() => '');
check('invalid promo rejected', !!promoErr, promoErr);

await setVal(null, 'AZ10', 'Promo code');
await page.click('.drawer__promo button');
await sleep(400);
const promoOk = await page.$eval('.promo-msg--ok', (el) => el.textContent).catch(() => '');
check('promo AZ10 applied', /AZ10|applied/i.test(promoOk), promoOk);
const promoLS = await page.evaluate(() => localStorage.getItem('az.promo'));
check('promo persisted in localStorage', /AZ10/.test(promoLS || ''), promoLS || 'null');

// ---- 3. Checkout navigation ----
await clickByText('.drawer button, .drawer a', /checkout/i);
await sleep(800);
check('drawer checkout goes to /checkout', page.url().includes('/checkout'), page.url());

// ---- 4. Validation: submit empty ----
await clickByText('button', /place order/i);
await sleep(500);
const errFields = await page.$$eval('.field--error', (els) => els.length).catch(() => 0);
check('empty submit shows field errors', errFields >= 3, `${errFields} error fields`);
check('still on /checkout', page.url().includes('/checkout'));

// fill valid
await setVal(null, 'Ziad Test', 'Full name');
await setVal(null, '01012345678', 'Phone number');
await setVal(null, 'ziad@example.com', 'Email address');
await page.evaluate(() => {
  const gov = document.querySelector('select[aria-label="Governorate"]');
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(gov, gov.options[3].value);
  gov.dispatchEvent(new Event('change', { bubbles: true }));
});
await setVal(null, 'Cairo', 'City');
await setVal(null, '12 Tahrir Street', 'Full address');
await sleep(200);

// express + vodafone cash
await clickByText('.opt', /express/i);
await clickByText('.opt', /vodafone/i);
await sleep(300);
const vodVisible = await page.evaluate(() => document.body.textContent.includes('[YOUR VODAFONE CASH NUMBER]'));
check('Vodafone Cash placeholder rendered', vodVisible);
await setVal(null, 'TX-987654', 'Transaction reference number');
await sleep(200);

// summary totals
const sumTxt = await page.$eval('.sum', (el) => el.textContent);
check('summary shows Express EGP 110', /110/.test(sumTxt), '');
check('summary shows 10% discount', /10%|−|discount/i.test(sumTxt), '');

// place order
await clickByText('button', /place order/i);
await sleep(1000);
check('lands on /order-confirmation', page.url().includes('/order-confirmation'), page.url());
const confTxt = await page.evaluate(() => document.body.textContent);
const orderNo = (confTxt.match(/AZ-\d{4}-\d{4}/) || [])[0];
check('confirmation shows order number', !!orderNo, orderNo || 'none');
check('confirmation mentions payment verification', /verif/i.test(confTxt));
// ---- 5. Tracking ----
await goto('/track-order');
await setVal(null, orderNo, 'Order number');
await setVal(null, '01012345678', 'Phone number');
await page.click('.track__form button[type="submit"]');
await sleep(600);
const steps = await page.$$eval('.step', (els) => els.length);
check('timeline shows 5 steps', steps === 5, `${steps}`);
const nowDot = await page.$$eval('.step--now', (els) => els.length);
check('current stage marked', nowDot === 1, `${nowDot}`);

// wrong phone fails
await goto('/track-order');
await setVal(null, orderNo, 'Order number');
await setVal(null, '01099999999', 'Phone number');
await page.click('.track__form button[type="submit"]');
await sleep(400);
const trackErr = await page.$eval('.field-error', (el) => el.textContent).catch(() => '');
check('mismatched phone rejected', /couldn.t find|not found|no order/i.test(trackErr), trackErr);

// ---- 6. Search overlay ----
await goto('/');
await clickByText('.header__icons button', /^search$/i);
await sleep(400);
const searchFocused = await page.evaluate(() => document.activeElement && document.activeElement.className.includes('search__field'));
check('search overlay opens and focuses input', searchFocused);
await page.type('.search__field', 'black');
await sleep(500);
const searchHit = await page.evaluate(() => document.body.textContent.includes('Black Kiss'));
check('search finds Black Kiss', searchHit);
await page.keyboard.press('Escape');
await sleep(300);
const searchClosed = await page.evaluate(() => !document.querySelector('.search__field') || document.querySelector('.search__field').offsetParent === null);
check('Escape closes search', searchClosed);

// ---- 7. Filters + sort + URL state ----
await goto('/shop');
await clickByText('.chips .chip', /gift/i);
await sleep(500);
const names = await page.$$eval('.card__name', (els) => els.map((e) => e.textContent.trim()));
check('gift filter shows only Trio', names.length === 1 && /trio/i.test(names[0]), JSON.stringify(names));
check('filter synced to URL', page.url().includes('filter='), page.url());
await clickByText('.chips .chip', /^all$/i);
await sleep(400);
const allBack = await page.$$eval('.card__name', (els) => els.length);
check('All chip restores 4 products', allBack === 4, `${allBack}`);

// sort price asc
await page.click('.sort .chip');
await sleep(300);
await clickByText('.sort__menu *', /price.*low|low.*high|asc/i);
await sleep(400);
const prices = await page.$$eval('.card__price', (els) => els.map((e) => parseInt(e.textContent.replace(/[^\d]/g, ''), 10)));
const sorted = prices.every((p, i) => i === 0 || prices[i - 1] <= p);
check('sort price low→high works', sorted, JSON.stringify(prices));

// ---- 8. PDP variations + sold out ----
await goto('/product/through-the-night');
const varChips = await page.$$eval('.variations .chip', (els) => els.map((e) => e.textContent));
check('PDP shows variation chips', varChips.length >= 2, JSON.stringify(varChips));
const readSku = () => page.evaluate(() => {
  const el = document.querySelector('.pdp__stock');
  return el ? (el.textContent.match(/SKU\s+([A-Z0-9-]+)/) || [])[1] || el.textContent.trim() : '';
});
const skuBefore = await readSku();
await page.evaluate(() => {
  const chips = document.querySelectorAll('.variations .chip');
  chips[chips.length - 1].click();
});
await sleep(400);
const pdpTxt = await page.evaluate(() => document.body.textContent);
check('sold-out variation shows Sold out', /sold out/i.test(pdpTxt));
const addState = await page.evaluate(() => {
  const b = [...document.querySelectorAll('.pdp__buy .btn--primary')][0];
  return b ? { disabled: b.disabled, text: b.textContent.trim() } : null;
});
check('add-to-bag disabled when sold out', !!addState && addState.disabled && /sold out/i.test(addState.text), JSON.stringify(addState));

// back to in-stock variation
await page.evaluate(() => document.querySelectorAll('.variations .chip')[0].click());
await sleep(300);
const backTxt = await page.$eval('.pdp__stock', (el) => el.textContent);
check('returning to 220ml restores in-stock', /in stock/i.test(backTxt), backTxt);

// add to bag from PDP
await page.evaluate(() => document.querySelectorAll('.pdp__buy .btn--primary')[0].click());
await sleep(500);
const bag3 = await page.$eval('.bagpill', (el) => el.getAttribute('aria-label'));
check('PDP add-to-bag increments bag', /1 items/.test(bag3), bag3);

// SKU + price track the variation (both sizes in stock here)
await goto('/product/black-kiss');
const skuA = await page.$eval('.pdp__stock', (el) => el.textContent);
await page.evaluate(() => document.querySelectorAll('.variations .chip')[1].click());
await sleep(400);
const skuB = await page.$eval('.pdp__stock', (el) => el.textContent);
check('SKU updates with variation', /AZ-BLK-220/.test(skuA) && /AZ-BLK-100/.test(skuB), `${skuA} → ${skuB}`);
const priceB = await page.$eval('.pdp__price', (el) => el.textContent);
check('price updates with variation', /280/.test(priceB), priceB.trim());
const lowStock = /only 6 left/i.test(skuB);
check('low-stock warning shown', lowStock, skuB);

// ---- 9. Wishlist ----
await goto('/shop');
await page.evaluate(() => {
  const c = [...document.querySelectorAll('.card')].find((x) => /million dreams/i.test(x.textContent));
  c.querySelector('.card__wish').click();
});
await sleep(300);
await goto('/wishlist');
const wishTxt = await page.evaluate(() => document.body.textContent);
check('wishlist lists Million Dreams', /million dreams/i.test(wishTxt));

// ---- 10. Persistence ----
const ls = await page.evaluate(() => ({ cart: localStorage.getItem('az.cart'), wish: localStorage.getItem('az.wishlist'), promo: localStorage.getItem('az.promo'), orders: localStorage.getItem('az.orders') }));
check('cart persisted', /through-the-night/.test(ls.cart || ''), '');
check('wishlist persisted', /million-dreams/.test(ls.wish || ''), '');
check('promo cleared after ordering', !ls.promo || ls.promo === 'null', String(ls.promo));
check('order persisted', new RegExp(orderNo).test(ls.orders || ''), '');

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log('FAILED:');
  failed.forEach((f) => console.log(' -', f.name, f.detail));
  process.exit(1);
}
