import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getVariations, PROMOS, FREE_DELIVERY_THRESHOLD } from '../data/products.js';
import { readStorage, writeStorage } from '../utils/format.js';
import * as catalog from '../services/productService.js';
import * as orderService from '../services/orderService.js';
import * as auth from '../services/authService.js';

const StoreContext = createContext(null);

export const defaultPaymentStatus = (order) => {
  if (order.paymentRef) return 'Verification Required';
  if (/visa|mastercard/i.test(order.payment || '')) return 'Paid';
  return 'Pending';
};

export function StoreProvider({ children }) {
  const [cart, setCart] = useState(() => readStorage('az.cart', []));
  const [wishlist, setWishlist] = useState(() => readStorage('az.wishlist', []));
  const [orders, setOrders] = useState([]);
  const [lastOrder, setLastOrder] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('az.lastOrder') || 'null'); } catch { return null; }
  });
  const [promo, setPromo] = useState(() => readStorage('az.promo', null));
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  const [allProducts, setAllProducts] = useState([]);
  const [settings, setSettings] = useState({});
  const [productsLoading, setProductsLoading] = useState(true);

  const toast = useCallback((message) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const loadCatalog = useCallback(() => {
    setProductsLoading(true);
    Promise.all([catalog.listProducts(), catalog.getSettings()]).then(([products, nextSettings]) => {
      setAllProducts(products);
      setSettings(nextSettings);
      setProductsLoading(false);
    }).catch((error) => { setProductsLoading(false); toast(error.message || 'Unable to load the store.'); });
  }, [toast]);

  useEffect(() => {
    loadCatalog();
    // Keep other tabs (customer session while admin edits) in sync.
    const onStorage = (e) => {
      if (e.key === 'az.products' || e.key === 'az.settings') loadCatalog();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [loadCatalog]);

  const loadOrders = useCallback(async () => {
    if (!auth.me()) { setOrders([]); return; }
    try { setOrders(await orderService.listOrders()); } catch (error) { toast(error.message); }
  }, [toast]);
  useEffect(() => {
    loadOrders();
    const refresh = () => { loadCatalog(); loadOrders(); };
    window.addEventListener('az-auth-changed', refresh);
    return () => window.removeEventListener('az-auth-changed', refresh);
  }, [loadCatalog, loadOrders]);

  useEffect(() => writeStorage('az.cart', cart), [cart]);
  useEffect(() => writeStorage('az.wishlist', wishlist), [wishlist]);
  useEffect(() => writeStorage('az.promo', promo), [promo]);

  const products = useMemo(() => allProducts.filter((p) => p.status === 'active'), [allProducts]);

  const findProduct = useCallback((id) => allProducts.find((p) => p.id === id), [allProducts]);

  const detailed = useMemo(
    () =>
      cart
        .map((line) => {
          const product = findProduct(line.productId);
          if (!product) return null;
          const variation = getVariations(product).find((v) => v.id === line.variationId) || getVariations(product)[0];
          return { ...line, product, variation, price: variation.price, image: product.images[variation.image]?.src || product.images[0].src };
        })
        .filter(Boolean),
    [cart, findProduct],
  );

  const count = useMemo(() => cart.reduce((n, l) => n + l.qty, 0), [cart]);
  const subtotal = useMemo(() => detailed.reduce((n, l) => n + l.qty * l.price, 0), [detailed]);

  const discount = useMemo(() => {
    if (!promo) return 0;
    if (promo.type === 'percent') return Math.round((subtotal * promo.value) / 100);
    return 0;
  }, [promo, subtotal]);

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
    const found = PROMOS[code.trim().toUpperCase()];
    if (!found) return { ok: false, message: 'That code isn’t valid.' };
    setPromo(found);
    return { ok: true, message: `${found.code} applied.` };
  }, []);

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
    productsLoading,
    refreshCatalog: loadCatalog,
    settings,
    announcement: settings.announcement ?? 'Free gift cards with every trio box',
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
