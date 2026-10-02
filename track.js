// Public order tracking lookup. Orders stay private in Firestore (admin-only
// rules); this function verifies the order number + checkout phone pair with
// the service account and returns only the progress fields the tracking
// timeline needs.

import { createHmac, createSign } from 'node:crypto';

const projectId = 'az-store-36cd0';
const db = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
let tokenCache;
let serviceAccountCache;
const b64url = (v) => Buffer.from(v).toString('base64url');

const dec = (v) => {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  return null;
};

async function accessToken() {
  if (tokenCache && tokenCache.exp > Date.now() + 60_000) return tokenCache.value;
  const account = getServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))}`;
  const signer = createSign('RSA-SHA256'); signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(account.private_key).toString('base64url')}`;
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
  const data = await response.json();
  if (!response.ok) throw new Error('Unable to authenticate with Firebase.');
  tokenCache = { value: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

function getServiceAccount() {
  if (serviceAccountCache) return serviceAccountCache;
  try { serviceAccountCache = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || ''); }
  catch { throw new Error('FIREBASE_SERVICE_ACCOUNT must contain the service account JSON.'); }
  return serviceAccountCache;
}

async function limitTrackingAttempts(token, ipAddress) {
  // Keep one short-window counter per visitor in Firestore. Unlike a process
  // memory counter, this still works when Vercel routes requests to new workers.
  const limit = 30;
  const windowMs = 10 * 60 * 1000;
  const now = Date.now();
  const docId = createHmac('sha256', getServiceAccount().private_key).update(ipAddress).digest('hex');
  const docName = `projects/${projectId}/databases/(default)/documents/_rateLimits/track_${docId}`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Retry transaction conflicts caused by simultaneous requests from one IP.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const begin = await fetch(`${db}:beginTransaction`, {
      method: 'POST', headers, body: JSON.stringify({ options: { readWrite: {} } }),
    });
    if (!begin.ok) throw new Error('Unable to start tracking rate-limit transaction.');
    const { transaction } = await begin.json();

    const read = await fetch(`${db}/_rateLimits/track_${docId}?transaction=${encodeURIComponent(transaction)}`, { headers });
    let current = null;
    if (read.ok) {
      const doc = await read.json();
      current = Object.fromEntries(Object.entries(doc.fields || {}).map(([key, value]) => [key, dec(value)]));
    } else if (read.status !== 404) {
      throw new Error('Unable to read tracking rate-limit counter.');
    }

    const windowStart = Number(current?.windowStart || 0);
    const attempts = windowStart + windowMs > now ? Number(current?.attempts || 0) : 0;
    if (attempts >= limit) {
      await fetch(`${db}:rollback`, {
        method: 'POST', headers, body: JSON.stringify({ transaction }),
      }).catch(() => {});
      return Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000));
    }

    const commit = await fetch(`${db}:commit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        transaction,
        writes: [{
          update: {
            name: docName,
            fields: {
              windowStart: { integerValue: String(attempts ? windowStart : now) },
              attempts: { integerValue: String(attempts + 1) },
            },
          },
        }],
      }),
    });
    if (commit.ok) return 0;
    const details = await commit.json().catch(() => ({}));
    if (details?.error?.status !== 'ABORTED' || attempt === 2) {
      throw new Error('Unable to update tracking rate-limit counter.');
    }
  }
  throw new Error('Unable to update tracking rate-limit counter.');
}

function getClientIp(req) {
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) return realIp.trim();
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || '';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const id = String(req.query.id || '').trim();
  const phone = String(req.query.phone || '').replace(/[\s-]/g, '');
  if (!id || !/^01[0125]\d{8}$/.test(phone)) return res.status(400).json({ error: 'Enter your order number and the phone used at checkout.' });
  try {
    const token = await accessToken();
    const ipAddress = getClientIp(req);
    if (ipAddress) {
      try {
        const retryAfter = await limitTrackingAttempts(token, ipAddress);
        if (retryAfter) {
          res.setHeader('Retry-After', String(retryAfter));
          return res.status(429).json({ error: 'Too many tracking attempts. Please wait a few minutes and try again.' });
        }
      } catch (error) {
        // Keep order tracking available if the counter has a transient failure.
        // The order lookup still uses the same authenticated Firestore service.
        console.error('track rate-limit error:', error.message);
      }
    }
    const response = await fetch(`${db}/orders/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return res.status(404).json({ error: 'We couldn’t find that order. Check the number and the phone you checked out with.' });
    const doc = await response.json();
    const order = Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, dec(v)]));
    if (String(order.phone || '').replace(/[\s-]/g, '') !== phone) {
      return res.status(404).json({ error: 'We couldn’t find that order. Check the number and the phone you checked out with.' });
    }
    return res.status(200).json({
      order: {
        id: order.id, name: order.name, total: order.total, placedAt: order.placedAt,
        status: Number(order.status || 0), cancelled: Boolean(order.cancelled),
      },
    });
  } catch (error) {
    console.error('track error:', error.message);
    return res.status(503).json({ error: 'Order tracking is not configured on this deployment.' });
  }
}
