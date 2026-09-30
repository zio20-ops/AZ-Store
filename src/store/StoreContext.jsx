import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getVariations, PROMOS, FREE_DELIVERY_THRESHOLD } from '../data/products.js';
import { readStorage, writeStorage, makeOrderNumber } from '../utils/format.js';
import * as catalog from '../services/productService.js';

const StoreContext = createContext(null);

const seedOrders = () => {
  const existing = readStorage('az.orders', null);
  if (existing) return existing.map((o) => ({ paymentStatus: o.paymentStatus || defaultPaymentStatus(o), ...o }));
  const demo = [
    {
      id: 'AZ-2609-1001',
      phone: '01000000000',
      name: 'Demo Customer',
      email: '',
      placedAt: '2026-09-27T10:20:00.000Z',
      status: 3,
      cancelled: false,
      payment: 'Cash on delivery',
      paymentStatus: 'Paid',
      paymentRef: null,
      deliveryMethod: 'Standard, 2 to 4 days',
      address: '12 El Thawra St, Heliopolis, Cairo',
      items: [{ name: 'Black Kiss', meta: '220 ml / 7.4 fl oz', qty: 1, price: 450, image: '/images/product-black-kiss.jpg' }],
      subtotal: 450,
      delivery: 60,
      discount: 0,
      total: 510,
    },
  ];
  writeStorage('az.orders', demo);
  return demo;
};

export const defaultPaymentStatus = (order) => {
  if (order.paymentRef) return 'Verification Required';
  if (/visa|mastercard/i.test(order.payment || '')) return 'Paid';
  return 'Pending';
};

export function StoreProvider({ children }) {
  const [cart, setCart] = useState(() => readStorage('az.cart', []));
  const [wishlist, setWishlist] = useState(() => readStorage('az.wishlist', []));
  const [orders, setOrders] = useState(seedOrders);
  const [promo, setPromo] = useState(() => readStorage('az.promo', null));
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  const [allProducts, setAllProducts] = useState([]);
  const [settings, setSettings] = useState({});
  const [productsLoading, setProductsLoading] = useState(true);

  const loadCatalog = useCallback(() => {
    Promise.all([catalog.listProducts(), catalog.getSettings()]).then(([products, nextSettings]) => {
      setAllProducts(products);
      setSettings(nextSettings);
      setProductsLoading(false);
    });
  }, []);

  useEffect(() => {
    loadCatalog();
    // Keep other tabs (customer session while admin edits) in sync.
    const onStorage = (e) => {
      if (e.key === 'az.products' || e.key === 'az.settings') loadCatalog();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [loadCatalog]);

  useEffect(() => writeStorage('az.cart', cart), [cart]);
  useEffect(() => writeStorage('az.wishlist', wishlist), [wishlist]);
  useEffect(() => writeStorage('az.promo', promo), [promo]);
  useEffect(() => writeStorage('az.orders', orders), [orders]);

  const toast = useCallback((message) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

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
    (payload) => {
      const order = {
        id: makeOrderNumber(),
        placedAt: new Date().toISOString(),
        status: 0,
        cancelled: false,
        items: detailed.map((l) => ({
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
      setOrders((o) => [order, ...o]);
      setCart([]);
      setPromo(null);
      return order;
    },
    [detailed, subtotal, discount],
  );

  const updateOrder = useCallback((id, patch) => {
    setOrders((o) => o.map((order) => (order.id === id ? { ...order, ...patch } : order)));
  }, []);

  const findOrder = useCallback(
    (id, phone) =>
      orders.find(
        (o) => o.id.toLowerCase() === id.trim().toLowerCase() && o.phone.replace(/\s/g, '') === phone.replace(/\s/g, ''),
      ) || null,
    [orders],
  );

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
    findOrder,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);
