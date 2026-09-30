export const egp = (n) => `EGP ${Math.round(n).toLocaleString('en-US')}`;

export const readStorage = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const writeStorage = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — cart stays in memory */
  }
};

export const makeOrderNumber = () => {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `AZ-${yy}${mm}-${rand}`;
};

export const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export const isValidEgyptPhone = (v) => /^01[0125]\d{8}$/.test(v.replace(/[\s-]/g, ''));
