import puppeteer from 'puppeteer-core';
const EXEC = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:5173';
const results = [];
const check = (n, ok, d = '') => { results.push({ n, ok, d }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? ' — ' + d : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: EXEC, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
const goto = async (p) => { await page.goto(BASE + p, { waitUntil: 'networkidle0' }); await sleep(400); };

await goto('/');
await page.evaluate(() => localStorage.clear());
await goto('/');

// no horizontal overflow at 390 and 320
for (const w of [320, 390, 768]) {
  await page.setViewport({ width: w, height: 844, isMobile: true, hasTouch: true });
  await sleep(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`no horizontal scroll at ${w}px`, overflow <= 1, `overflow=${overflow}`);
}
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await sleep(300);

// tab bar
const tabs = await page.$$eval('.tabbar button, .tabbar a', (els) => els.map((e) => e.textContent.trim()));
check('mobile tab bar has 4 tabs', tabs.length === 4, JSON.stringify(tabs));
const tabVisible = await page.evaluate(() => {
  const t = document.querySelector('.tabbar');
  if (!t) return false;
  const r = t.getBoundingClientRect();
  return r.height > 0 && r.top < window.innerHeight && Math.abs(r.bottom - window.innerHeight) < 4;
});
check('tab bar pinned to bottom', tabVisible);

// navigate via tab bar
await page.evaluate(() => [...document.querySelectorAll('.tabbar button, .tabbar a')].find((e) => /shop/i.test(e.textContent)).click());
await sleep(700);
check('Shop tab navigates to /shop', page.url().includes('/shop'), page.url());

// search tab opens overlay
await page.evaluate(() => [...document.querySelectorAll('.tabbar button, .tabbar a')].find((e) => /search/i.test(e.textContent)).click());
await sleep(500);
const searchOpen = await page.evaluate(() => !!document.querySelector('.search__field') && document.querySelector('.search__field').offsetParent !== null);
check('Search tab opens overlay', searchOpen);
await page.keyboard.press('Escape');
await sleep(300);

// bag tab opens drawer
await page.evaluate(() => [...document.querySelectorAll('.tabbar button, .tabbar a')].find((e) => /bag/i.test(e.textContent)).click());
await sleep(500);
const drawerOpen = await page.$eval('.drawer', (el) => el.classList.contains('drawer--open')).catch(() => false);
check('Bag tab opens cart drawer', drawerOpen);
const drawerFits = await page.evaluate(() => {
  const d = document.querySelector('.drawer');
  return d ? d.getBoundingClientRect().width <= window.innerWidth + 1 : false;
});
check('drawer fits 390px viewport', drawerFits);
await page.keyboard.press('Escape');
await sleep(300);

// mobile menu
await goto('/');
await page.click('[aria-label="Open menu"]');
await sleep(500);
const menuOpen = await page.$eval('.mmenu', (el) => el.classList.contains('mmenu--open'));
check('mobile menu opens', menuOpen);
const menuLinks = await page.$$eval('.mmenu a', (els) => els.map((e) => e.textContent.trim()));
check('menu lists nav links', menuLinks.length >= 5, JSON.stringify(menuLinks));
await page.evaluate(() => {
  const l = [...document.querySelectorAll('.mmenu a')].find((a) => a.getAttribute('href') === '/about');
  if (l) l.click();
});
await sleep(900);
check('menu link navigates to /about', page.url().includes('/about'), page.url());
const menuClosed = await page.$eval('.mmenu', (el) => !el.classList.contains('mmenu--open'));
check('menu closes after navigation', menuClosed);

// PDP sticky add-to-bag
await goto('/product/black-kiss');
const sticky = await page.evaluate(() => {
  const s = document.querySelector('.pdp__sticky');
  if (!s) return null;
  const r = s.getBoundingClientRect();
  return { visible: r.height > 0 && r.top < window.innerHeight, text: s.textContent.trim() };
});
check('sticky add-to-bag visible on mobile PDP', !!sticky && sticky.visible, JSON.stringify(sticky));
check('sticky button shows price', /EGP/.test(sticky?.text || ''));
await page.evaluate(() => document.querySelector('.pdp__sticky button').click());
await sleep(600);
const bagAfterSticky = await page.evaluate(() => {
  const t = document.querySelector('.tabbar');
  return t ? t.textContent : '';
});
check('sticky add-to-bag adds item', /1/.test(bagAfterSticky), bagAfterSticky.replace(/\s+/g, ' ').trim());
const stickyNoOverlap = await page.evaluate(() => {
  const s = document.querySelector('.pdp__sticky').getBoundingClientRect();
  const t = document.querySelector('.tabbar').getBoundingClientRect();
  return s.bottom <= t.top + 2;
});
check('sticky bar does not overlap tab bar', stickyNoOverlap);

// accordions (FAQ)
await goto('/faq');
const acc = await page.$$('.acc__head');
check('FAQ accordions render', acc.length >= 5, `${acc.length}`);
const h0 = await page.$eval('.acc .acc__body', (el) => el.getBoundingClientRect().height);
await page.evaluate(() => document.querySelector('.acc__head').click());
await sleep(700);
const h1 = await page.$eval('.acc .acc__body', (el) => el.getBoundingClientRect().height);
const aria = await page.$eval('.acc__head', (el) => el.getAttribute('aria-expanded'));
check('accordion expands on click', h1 > h0 + 20 && aria === 'true', `${h0} → ${h1}, aria=${aria}`);
await page.evaluate(() => document.querySelector('.acc__head').click());
await sleep(700);
const h2 = await page.$eval('.acc .acc__body', (el) => el.getBoundingClientRect().height);
check('accordion collapses on second click', h2 < 5, `${h2}`);

// contact form validation
await goto('/contact');
const hasForm = await page.evaluate(() => !!document.querySelector('form'));
check('contact page has a form', hasForm);
if (hasForm) {
  await page.evaluate(() => document.querySelector('form button[type="submit"], form .btn').click());
  await sleep(400);
  const errs = await page.$$eval('.field--error, .field-error', (e) => e.length).catch(() => 0);
  check('empty contact submit shows errors', errs > 0, `${errs}`);
}

// 404
await goto('/nope-not-a-page');
const nf = await page.$eval('main', (el) => el.textContent).catch(() => '');
check('404 page renders', /wandered off/i.test(nf), nf.replace(/\s+/g, ' ').slice(0, 40));
check('404 sets page title', /not found/i.test(await page.title()), await page.title());

// checkout on mobile
await goto('/checkout');
const sumVisible = await page.evaluate(() => {
  const s = document.querySelector('.sum');
  return s ? s.getBoundingClientRect().width > 0 : false;
});
check('order summary renders on mobile checkout', sumVisible);

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) { failed.forEach((f) => console.log(' FAILED:', f.n, f.d)); process.exit(1); }
