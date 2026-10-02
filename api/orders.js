import { createSign, randomUUID } from 'node:crypto';

const projectId = 'az-store-36cd0';
const db = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const tokenCache = new Map();

const enc = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
};
const dec = (v) => {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, dec(x)]));
  return null;
};
const fields = (doc) => Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, dec(v)]));
const b64url = (v) => Buffer.from(v).toString('base64url');

async function accessToken(scope = 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit') {
  const cached = tokenCache.get(scope);
  if (cached && cached.exp > Date.now() + 60_000) return cached.value;
  let account;
  try { account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || ''); }
  catch { throw new Error('FIREBASE_SERVICE_ACCOUNT must contain the service account JSON.'); }
  if (!account.client_email || !account.private_key) throw new Error('Firebase service account configuration is incomplete.');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: account.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))}`;
  const signer = createSign('RSA-SHA256'); signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(account.private_key).toString('base64url')}`;
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
  const data = await response.json();
  if (!response.ok) throw new Error('Unable to authenticate the order API with Firebase.');
  tokenCache.set(scope, { value: data.access_token, exp: Date.now() + data.expires_in * 1000 });
  return data.access_token;
}

async function verifyCustomer(idToken, serviceToken) {
  if (!idToken) return null;
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`, {
    method: 'POST', headers: { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
  });
  const data = await response.json().catch(() => ({}));
  return response.ok ? data.users?.[0] || null : false;
}

async function firestore(path, token) {
  const response = await fetch(`${db}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const doc = await response.json();
  if (!response.ok) throw new Error(response.status === 404 ? 'Product or settings not found.' : 'Could not read the store database.');
  return doc;
}

// Commit Write.update.name is a Firestore resource name, not an HTTPS URL.
const docName = (collection, id) => `projects/${projectId}/databases/(default)/documents/${collection}/${id}`;
const problem = (res, status, message) => res.status(status).json({ error: message });

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return problem(res, 405, 'Method not allowed.');
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || new URL(origin).host !== host) return problem(res, 403, 'Origin not allowed.');
  try {
    const body = req.body || {};
    const { customer = {}, items = [], deliveryMethod, promoCode = '', paymentMethod = 'cod', paymentRef = '' } = body;
    if (typeof customer.name !== 'string' || customer.name.trim().length < 3 || customer.name.length > 120 || !/^01[0125]\d{8}$/.test(String(customer.phone || '').replace(/[\s-]/g, '')) || typeof customer.address !== 'string' || customer.address.trim().length < 8 || customer.address.length > 500 || (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) || !Array.isArray(items) || items.length < 1 || items.length > 30) return problem(res, 400, 'Check the customer and item details.');
    if (!['standard', 'express'].includes(deliveryMethod)) return problem(res, 400, 'Invalid delivery method.');
    const token = await accessToken();
    const idToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const verifiedCustomer = await verifyCustomer(idToken, token);
    if (verifiedCustomer === false) return problem(res, 401, 'Your sign-in expired. Sign in again and place the order.');
    if (!verifiedCustomer) return problem(res, 401, 'Sign in or create an account before placing an order.');
    const settings = await firestore('settings/store', token).catch(() => ({ fields: {} }));
    const storeSettings = fields(settings);
    const paymentConfig = storeSettings.paymentMethods || { cod: { enabled: true }, instapay: { enabled: false }, vodafone: { enabled: false } };
    if (!['cod', 'instapay', 'vodafone'].includes(paymentMethod) || !paymentConfig[paymentMethod]?.enabled) return problem(res, 400, 'This payment method is not available. Refresh checkout and choose another method.');
    if (paymentMethod === 'instapay' && !paymentConfig.instapay.account) return problem(res, 400, 'InstaPay is not configured by the store.');
    if (paymentMethod === 'vodafone' && !paymentConfig.vodafone.number) return problem(res, 400, 'Vodafone Cash is not configured by the store.');
    if (paymentMethod !== 'cod' && String(paymentRef).trim().length < 4) return problem(res, 400, 'Enter the transaction reference from your payment receipt.');
    const products = new Map();
    const normalizedItems = [];
    let subtotal = 0;
    for (const line of items) {
      if (!/^[a-z0-9-]{1,80}$/.test(line.productId || '') || !Number.isInteger(line.qty) || line.qty < 1 || line.qty > 20 || !line.variationId) return problem(res, 400, 'Invalid order item.');
      let record = products.get(line.productId);
      if (!record) {
        const raw = await firestore(`products/${encodeURIComponent(line.productId)}`, token);
        record = { doc: raw, product: fields(raw) };
        products.set(line.productId, record);
      }
      const product = record.product;
      const variation = (product.variations || []).find((v) => v.id === line.variationId);
      if (product.status !== 'active' || !variation || !Number.isInteger(variation.stock) || variation.stock < line.qty) return problem(res, 409, `${product.name || 'A product'} is out of stock for the selected size.`);
      variation.stock -= line.qty;
      const regularPrice = Number(variation.price);
      const compareAt = Number(product.compareAtPrice ?? product.compareAt ?? 0);
      const isPrimaryVariation = product.variations?.[0]?.id === variation.id;
      const appliedDiscount = Math.min(90, Math.max(0, Number(product.discount || 0)));
      const hasVariationSale = Object.hasOwn(variation, 'discount') || Object.hasOwn(variation, 'compareAtPrice');
      const variationCompareAt = Number(variation.compareAtPrice || 0);
      const variationDiscount = Math.min(90, Math.max(0, Number(variation.discount || 0)));
      const unitPrice = hasVariationSale
        ? variationCompareAt > regularPrice ? regularPrice : variationDiscount ? Math.max(0, Math.round(regularPrice * (100 - variationDiscount) / 100)) : regularPrice
        : isPrimaryVariation && compareAt > regularPrice ? regularPrice : appliedDiscount ? Math.max(0, Math.round(regularPrice * (100 - appliedDiscount) / 100)) : regularPrice;
      subtotal += unitPrice * line.qty;
      normalizedItems.push({ productId: product.id || line.productId, variationId: variation.id, name: product.name, meta: variation.label, qty: line.qty, price: unitPrice, image: product.images?.[variation.image]?.src || product.images?.[0]?.src || '' });
    }
    const standardFree = deliveryMethod === 'standard' && subtotal >= Number(storeSettings.freeDeliveryThreshold ?? 1800);
    const baseDeliveryFee = standardFree ? 0 : deliveryMethod === 'express' ? 110 : 60;
    let discount = 0;
    let shippingDiscount = 0;
    let deliveryFee = baseDeliveryFee;
    let appliedPromo = null;
    if (String(promoCode).trim()) {
      const code = String(promoCode).trim().toUpperCase();
      const promoDoc = await firestore(`promos/${encodeURIComponent(code)}`, token).catch(() => null);
      const promo = promoDoc ? fields(promoDoc) : code === 'AZ10'
        ? { code, type: 'percent', value: 10, appliesTo: 'products', productIds: [], active: true }
        : code === 'FREESHIP' ? { code, type: 'fixed', value: 0, appliesTo: 'shipping', shippingMethod: 'standard', productIds: [], active: true } : null;
      const now = Date.now();
      if (!promo || promo.active === false || (promo.startsAt && Date.parse(promo.startsAt) > now) || (promo.endsAt && Date.parse(promo.endsAt) < now)) return problem(res, 400, 'This promo code is not valid or has expired.');
      if (!['percent', 'fixed'].includes(promo.type) || !['products', 'shipping'].includes(promo.appliesTo || (promo.type === 'shipping' ? 'shipping' : 'products')) || !Number.isFinite(Number(promo.value))) return problem(res, 400, 'This promo code is not configured correctly.');
      const target = promo.appliesTo || (promo.type === 'shipping' ? 'shipping' : 'products');
      const amount = Number(promo.value);
      if (target === 'shipping') {
        const shippingMethod = ['standard', 'express', 'any'].includes(promo.shippingMethod) ? promo.shippingMethod : 'standard';
        if (shippingMethod !== 'any' && shippingMethod !== deliveryMethod) return problem(res, 400, `This code applies to ${shippingMethod} delivery only.`);
        if (Number(promo.minSubtotal || 0) > subtotal) return problem(res, 400, 'This promo code does not meet its minimum order amount.');
        shippingDiscount = amount === 0 && code === 'FREESHIP' ? baseDeliveryFee : promo.type === 'percent' ? Math.round(baseDeliveryFee * amount / 100) : amount;
        shippingDiscount = Math.min(baseDeliveryFee, Math.max(0, shippingDiscount));
        deliveryFee = baseDeliveryFee - shippingDiscount;
      } else {
        const allowedIds = Array.isArray(promo.productIds) ? promo.productIds : [];
        const eligibleTotal = normalizedItems.filter((item) => !allowedIds.length || allowedIds.includes(item.productId)).reduce((sum, item) => sum + item.price * item.qty, 0);
        if (allowedIds.length && !normalizedItems.some((item) => allowedIds.includes(item.productId))) return problem(res, 400, 'This promo code does not apply to the products in this order.');
        if (Number(promo.minSubtotal || 0) > eligibleTotal) return problem(res, 400, 'This promo code does not meet the minimum amount for eligible products.');
        discount = Math.min(eligibleTotal, Math.max(0, promo.type === 'percent' ? Math.round(eligibleTotal * amount / 100) : amount));
      }
      appliedPromo = code;
    }
    const id = randomUUID();
    const phone = String(customer.phone).replace(/[\s-]/g, '');
    const order = {
      id, placedAt: new Date().toISOString(), status: 0, cancelled: false,
      ...(verifiedCustomer ? { customerUid: verifiedCustomer.localId } : {}),
      name: customer.name.trim(), phone, email: String(customer.email || '').slice(0, 180),
      address: customer.address.trim(), notes: String(customer.notes || '').slice(0, 500),
      payment: paymentMethod === 'cod' ? 'Cash on delivery' : paymentMethod === 'instapay' ? 'InstaPay' : 'Vodafone Cash',
      paymentRef: paymentMethod === 'cod' ? null : String(paymentRef).trim().slice(0, 100),
      paymentProofUrl: null,
      paymentStatus: paymentMethod === 'cod' ? 'Pending' : 'Verification Required',
      deliveryMethod: deliveryMethod === 'express' ? 'Express, next day' : 'Standard, 2 to 4 days',
      items: normalizedItems, subtotal, discount, shippingDiscount, promoCode: appliedPromo, delivery: deliveryFee, total: subtotal - discount + deliveryFee,
    };
    const writes = [...products.values()].map(({ doc, product }) => {
      product.stock = (product.variations || []).reduce((total, v) => total + Number(v.stock || 0), 0);
      return { update: { name: doc.name, fields: Object.fromEntries(Object.entries(product).map(([k, v]) => [k, enc(v)])) }, currentDocument: { updateTime: doc.updateTime } };
    });
    // Firestore Commit's Write union has update/delete/transform operations;
    // document creation is expressed as an update guarded by exists:false.
    writes.push({
      update: { name: docName('orders', id), fields: Object.fromEntries(Object.entries(order).map(([k, v]) => [k, enc(v)])) },
      currentDocument: { exists: false },
    });
    const commit = await fetch(`${db}:commit`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ writes }) });
    const result = await commit.json();
    if (!commit.ok) {
      const firestoreError = result.error || {};
      const code = String(firestoreError.status || firestoreError.code || `HTTP_${commit.status}`).toUpperCase();
      console.error('Firestore order commit rejected:', code, firestoreError.message || 'No error message returned.');
      const messages = {
        ABORTED: 'The product stock changed while your order was saving. Return to your bag, refresh, and try again.',
        FAILED_PRECONDITION: 'The store data changed during checkout. Refresh the page and try again.',
        INVALID_ARGUMENT: 'The store database rejected the order data. Please contact the store owner and share error code INVALID_ARGUMENT.',
        PERMISSION_DENIED: 'The store database refused to save this order. The store owner needs to check Firebase permissions.',
        NOT_FOUND: 'A store record needed for this order could not be found. Please contact the store owner.',
      };
      const status = code === 'ABORTED' || code === 'FAILED_PRECONDITION' ? 409 : code === 'INVALID_ARGUMENT' ? 400 : 503;
      return res.status(status).json({ error: messages[code] || 'The order database could not save this order. Please contact the store owner.', code });
    }
    return res.status(201).json({ order });
  } catch (error) {
    console.error('Order API error:', error.message);
    return problem(res, 503, 'Order service is not configured yet. Please try again later.');
  }
}
