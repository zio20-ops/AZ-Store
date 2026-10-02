import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getVariations, productPrice, PROMOS, FREE_DELIVERY_THRESHOLD } from '../data/products.js';
import { readStorage, writeStorage } from '../utils/format.js';
import * as catalog from '../services/productService.js';
import * as orderService from '../services/orderService.js';
import * as auth from '../services/authService.js';
import * as customerCart from '../services/customerCartService.js';

const StoreContext = createContext(null);
const cartStorageKey = (uid) => uid ? `az.cart.customer.${uid}` : 'az.cart.guest';
const activeCustomerUid = () => {
  const user = auth.getCurrentUser();
  return user && !user.isAdmin ? user.uid : null;
};
const readCart = (uid) => readStorage(cartStorageKey(uid), []);

export const defaultPaymentStatus = (order) => {
  if (order.paymentRef) return 'Verification Required';
  if (/visa|mastercard/i.test(order.payment || '')) return 'Paid';
  return 'Pending';
};

export function StoreProvider({ children }) {
  const initialCartOwner = useRef(activeCustomerUid());
  const [cart, setCart] = useState(() => readCart(initialCartOwner.current));
  const [cartReady, setCartReady] = useState(() => !initialCartOwner.current);
  const cartOwner = useRef(initialCartOwner.current);
  const latestCart = useRef(cart);
  const cartSyncTimer = useRef(null);
  const cartSyncFailed = useRef(false);
  const [wishlist, setWishlist] = useState(() => readStorage('az.wishlist', []));
  const [orders, setOrders] = useState([]);
  const [lastOrder, setLastOrder] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('az.lastOrder') || 'null'); } catch { return null; }
  });
  const [promo, setPromo] = useState(() => {
    const stored = readStorage('az.promo', null);
    if (!stored) return null;
    return { ...stored, appliesTo: stored.appliesTo || (stored.type === 'shipping' ? 'shipping' : 'products'), type: stored.type === 'shipping' ? 'percent' : stored.type, value: stored.type === 'shipping' ? 100 : stored.value };
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({});
  const [promoOffers, setPromoOffers] = useState(Object.values(PROMOS).map((item) => ({ ...item, type: item.type === 'shipping' ? 'percent' : item.type, value: item.type === 'shipping' ? 100 : item.value, active: true, appliesTo: item.appliesTo || (item.type === 'shipping' ? 'shipping' : 'products'), productIds: [] })));
  const [productsLoading, setProductsLoading] = useState(true);

  const toast = useCallback((message) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const loadCatalog = useCallback(() => {
    setProductsLoading(true);
    return Promise.allSettled([catalog.listProducts(), catalog.getSettings(), catalog.listCategories()]).then(([productsResult, settingsResult, categoriesResult]) => {
      const products = productsResult.status === 'fulfilled' ? productsResult.value : [];
      const nextSettings = settingsResult.status === 'fulfilled' ? settingsResult.value : catalog.DEFAULT_SETTINGS;
      const visibleProducts = products.length ? products : catalog.getSeedProducts();
      setAllProducts(visibleProducts);
      const loadedCategories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
      setCategories(loadedCategories.length ? loadedCategories : [...new Set(visibleProducts.map((product) => product.category).filter(Boolean))].map((name) => ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, image: '' })));
      setSettings(nextSettings);
      setProductsLoading(false);
      const error = productsResult.status === 'rejected' ? productsResult.reason : settingsResult.status === 'rejected' ? settingsResult.reason : null;
      if (error) toast(error.message || 'Unable to connect to the store database. Showing built-in products.');
    });
  }, [toast]);

  const loadPromos = useCallback(() => {
    catalog.listPromos().then((items) => { if (Array.isArray(items)) setPromoOffers(items); }).catch(() => {});
  }, []);

  useEffect(() => {
    try { localStorage.removeItem('az.cart'); } catch { /* Ignore blocked storage. */ }
    loadCatalog();
    loadPromos();
    // Keep other tabs (customer session while admin edits) in sync.
    const onStorage = (e) => {
      if (e.key === 'az.products' || e.key === 'az.settings' || e.key === 'az.categories') loadCatalog();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [loadCatalog, loadPromos]);

  const loadOrders = useCallback(async () => {
    if (!auth.me()) { setOrders([]); return; }
    try { setOrders(await orderService.listOrders()); } catch (error) { toast(error.message); }
  }, [toast]);
  useEffect(() => { latestCart.current = cart; }, [cart]);

  useEffect(() => {
    loadOrders();
    const refreshOrders = () => {
      if (document.visibilityState === 'visible' && auth.me()) void loadOrders();
    };
    const orderPoll = window.setInterval(refreshOrders, 15000);
    window.addEventListener('focus', refreshOrders);
    document.addEventListener('visibilitychange', refreshOrders);
    let mounted = true;
    const hydrateCart = async (uid) => {
      if (!uid) return;
      try {
        const saved = await customerCart.load();
        if (!mounted || cartOwner.current !== uid) return;
        const next = saved?.exists ? (saved.items || []) : readCart(uid);
        setCart(next);
        writeStorage(cartStorageKey(uid), next);
        setCartReady(true);
      } catch {
        if (mounted && cartOwner.current === uid) setCartReady(true);
      }
    };
    const refresh = () => {
      loadCatalog(); loadOrders();
      const nextUid = activeCustomerUid();
      if (nextUid === cartOwner.current) return;
      writeStorage(cartStorageKey(cartOwner.current), latestCart.current);
      cartOwner.current = nextUid;
      clearTimeout(cartSyncTimer.current);
      setPromo(null);
      if (!nextUid) {
        writeStorage(cartStorageKey(null), []);
        setCart([]);
        setCartReady(true);
        return;
      }
      setCart(readCart(nextUid));
      setCartReady(false);
      void hydrateCart(nextUid);
    };
    window.addEventListener('az-auth-changed', refresh);
    if (cartOwner.current) {
      setCartReady(false);
      void hydrateCart(cartOwner.current);
    }
    return () => {
      mounted = false;
      clearTimeout(cartSyncTimer.current);
      window.clearInterval(orderPoll);
      window.removeEventListener('focus', refreshOrders);
      document.removeEventListener('visibilitychange', refreshOrders);
      window.removeEventListener('az-auth-changed', refresh);
    };
  }, [loadCatalog, loadOrders]);

  useEffect(() => {
    if (!cartReady) return;
    const uid = cartOwner.current;
    writeStorage(cartStorageKey(uid), cart);
    if (!uid || activeCustomerUid() !== uid) return;
    clearTimeout(cartSyncTimer.current);
    cartSyncTimer.current = setTimeout(() => {
      if (activeCustomerUid() !== uid) return;
      customerCart.save(cart).then(() => { cartSyncFailed.current = false; }).catch(() => {
        if (!cartSyncFailed.current) toast('Your bag is saved on this device, but could not sync to your account. Please try again.');
        cartSyncFailed.current = true;
      });
    }, 650);
  }, [cart, cartReady, toast]);
  useEffect(() => writeStorage('az.wishlist', wishlist), [wishlist]);
  useEffect(() => writeStorage('az.promo', promo), [promo]);

  const products = useMemo(() => allProducts.filter((p) => p.status === 'active'), [allProducts]);

  const findProduct = useCallback((id) => allProducts.find((p) => p.id === id), [allProducts]);

  const baseDetailed = useMemo(
    () =>
      cart
        .map((line) => {
          const product = findProduct(line.productId);
          if (!product) return null;
          const variation = getVariations(product).find((v) => v.id === line.variationId) || getVariations(product)[0];
      return { ...line, product, variation, price: productPrice(product, variation), image: product.images[variation.image]?.src || product.images[0].src };
        })
        .filter(Boolean),
    [cart, findProduct],
  );

  const count = useMemo(() => cart.reduce((n, l) => n + l.qty, 0), [cart]);
  const subtotal = useMemo(() => baseDetailed.reduce((n, l) => n + l.qty * l.price, 0), [baseDetailed]);

  const eligibleLines = useMemo(() => baseDetailed.filter((line) => !promo?.productIds?.length || promo.productIds.includes(line.product.id)), [baseDetailed, promo]);
  const eligibleSubtotal = useMemo(() => eligibleLines.reduce((sum, line) => sum + line.qty * line.price, 0), [eligibleLines]);
  const discount = useMemo(() => {
    if (!promo || promo.appliesTo === 'shipping') return 0;
    const amount = promo.type === 'percent' ? Math.round(eligibleSubtotal * promo.value / 100) : Number(promo.value || 0);
    return Math.min(eligibleSubtotal, amount);
  }, [promo, eligibleSubtotal]);
  const detailed = useMemo(() => {
    if (!promo || promo.appliesTo === 'shipping' || !discount || !eligibleSubtotal) return baseDetailed;
    let remainingDiscount = discount;
    const lastEligibleIndex = baseDetailed.reduce((last, line, index) => (!promo.productIds?.length || promo.productIds.includes(line.product.id) ? index : last), -1);
    return baseDetailed.map((line, index) => {
      if (promo.productIds?.length && !promo.productIds.includes(line.product.id)) return line;
      const lineTotal = line.qty * line.price;
      const lineDiscount = index === lastEligibleIndex
        ? remainingDiscount
        : Math.min(remainingDiscount, lineTotal, Math.round(discount * lineTotal / eligibleSubtotal));
      remainingDiscount = Math.max(0, remainingDiscount - lineDiscount);
      return { ...line, promoDiscount: lineDiscount, promoLineTotal: lineTotal - lineDiscount };
    });
  }, [baseDetailed, promo, discount, eligibleSubtotal]);
  useEffect(() => {
    if (promo?.appliesTo === 'products' && promo.productIds?.length && eligibleSubtotal === 0) setPromo(null);
  }, [promo, eligibleSubtotal]);

  const addToCart = useCallback(
    (productId, variationId, qty = 1) => {
      const product = findProduct(productId);
      if (!product) return false;
      const variation = getVariations(product).find((v) => v.id === variationId) || getVariations(product)[0];
      if (!variation.stock) return false;
      setCart((c) => {
        const key = `${productId}__${variation.id}`;
        const found = c.find((l) => l.key === key);
        if (found) {
          return c.map((l) => (l.key === key ? { ...l, qty: Math.min(l.qty + qty, variation.stock) } : l));
        }
        return [...c, { key, productId, variationId: variation.id, qty: Math.min(qty, variation.stock) }];
      });
      toast('Added to your bag');
      return true;
    },
    [toast, findProduct],
  );

  const setQty = useCallback(
    (key, qty) => {
      setCart((c) =>
        qty <= 0
          ? c.filter((l) => l.key !== key)
          : c.map((l) => {
              if (l.key !== key) return l;
              const product = findProduct(l.productId);
              if (!product) return l;
              const stock = getVariations(product).find((v) => v.id === l.variationId)?.stock || 0;
              return { ...l, qty: Math.min(qty, stock) };
            }),
      );
    },
    [findProduct],
  );

  const removeLine = useCallback((key) => setCart((c) => c.filter((l) => l.key !== key)), []);
  const clearCart = useCallback(() => { setCart([]); setPromo(null); }, []);

  const toggleWish = useCallback(
    (productId) => {
      setWishlist((w) => {
        const has = w.includes(productId);
        toast(has ? 'Removed from wishlist' : 'Saved to wishlist');
        return has ? w.filter((id) => id !== productId) : [...w, productId];
      });
    },
    [toast],
  );

  const applyPromo = useCallback((code) => {
    const found = promoOffers.find((item) => item.code === code.trim().toUpperCase() && item.active !== false);
    if (!found) return { ok: false, message: 'That code isn’t valid or is no longer active.' };
    const eligibleTotal = detailed.filter((line) => !found.productIds?.length || found.productIds.includes(line.product.id)).reduce((sum, line) => sum + line.qty * line.price, 0);
    if (found.productIds?.length && eligibleTotal === 0) return { ok: false, message: 'This code does not apply to products in your bag.' };
    if (Number(found.minSubtotal) > eligibleTotal) return { ok: false, message: `Add ${Number(found.minSubtotal) - eligibleTotal} EGP more in eligible products to use this code.` };
    setPromo(found);
    return { ok: true, message: `${found.code} applied.` };
  }, [promoOffers, baseDetailed, subtotal]);

  const removePromo = useCallback(() => setPromo(null), []);

  const placeOrder = useCallback(
    async (payload) => {
      const order = {
        placedAt: new Date().toISOString(),
        status: 0,
        cancelled: false,
        items: detailed.map((l) => ({
          productId: l.product.id,
          variationId: l.variation.id,
          name: l.product.name,
          meta: l.variation.label,
          qty: l.qty,
          price: l.price,
          image: l.image,
        })),
        subtotal,
        discount,
        ...payload,
      };
      order.total = subtotal - discount + order.delivery;
      order.paymentStatus = order.paymentStatus || defaultPaymentStatus(order);
      const saved = await orderService.createOrder(order);
      setLastOrder(saved);
      try { sessionStorage.setItem('az.lastOrder', JSON.stringify(saved)); } catch { /* storage full or blocked */ }
      setCart([]);
      setPromo(null);
      return saved;
    },
    [detailed, subtotal, discount],
  );

  const updateOrder = useCallback(async (id, patch) => {
    const updated = await orderService.updateOrder(id, patch);
    setOrders((o) => o.map((order) => (order.id === id ? updated : order)));
    return updated;
  }, []);

  const value = {
    products,
    allProducts,
    categories,
    productsLoading,
    refreshCatalog: loadCatalog,
    settings,
    announcement: typeof settings.announcement === 'string' ? settings.announcement.trim() : 'Free gift cards with every trio box',
    cart: detailed,
    count,
    subtotal,
    discount,
    promo,
    freeThreshold: settings.freeDeliveryThreshold ?? FREE_DELIVERY_THRESHOLD,
    cartOpen,
    setCartOpen,
    searchOpen,
    setSearchOpen,
    addToCart,
    setQty,
    removeLine,
    clearCart,
    wishlist,
    toggleWish,
    applyPromo,
    removePromo,
    promoOffers,
    refreshPromos: loadPromos,
    toasts,
    toast,
    orders,
    placeOrder,
    updateOrder,
    lastOrder,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);
