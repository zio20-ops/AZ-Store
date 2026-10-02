import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { useSeo } from '../hooks/useSeo.js';
import ProductCard from '../components/ProductCard.jsx';
import { FILTER_CHIPS, SORT_OPTIONS } from '../data/content.js';
import { getVariations, productDiscountPercent, productPrice } from '../data/products.js';

const PRICE_BANDS = [
  { id: 'any', label: 'Any price', test: () => true },
  { id: 'u300', label: 'Under EGP 300', test: (p) => productPrice(p) < 300 },
  { id: '300-500', label: 'EGP 300 – 500', test: (p) => productPrice(p) >= 300 && productPrice(p) <= 500 },
  { id: '500-1000', label: 'EGP 500 – 1,000', test: (p) => productPrice(p) > 500 && productPrice(p) <= 1000 },
  { id: 'o1000', label: 'Over EGP 1,000', test: (p) => productPrice(p) > 1000 },
];

const chipTest = (id) => (p) => {
  switch (id) {
    case 'mists': return p.type === 'mist';
    case 'gift-sets': return p.type === 'gift';
    default: return true;
  }
};

export default function Shop() {
  useSeo('Shop all | AZ Store', 'Browse the AZ collection: fine fragrance mists and gift sets. Filter by mood and price.');
  const { products, categories } = useStore();
  const [params, setParams] = useSearchParams();

  const legacyFilter = params.get('filter') || 'all';
  const typeFilter = params.get('type') || (['mists', 'gift-sets'].includes(legacyFilter) ? legacyFilter : 'all');
  const categoryFilter = params.get('category') || (legacyFilter.startsWith('category:') ? legacyFilter.slice('category:'.length) : ({ 'calm-and-deep': 'calm-and-deep', bold: 'bold', soft: 'soft-and-dreamy' }[legacyFilter] || ''));
  const sort = params.get('sort') || 'best-selling';
  const q = params.get('q') || '';

  const [refineOpen, setRefineOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [price, setPrice] = useState('any');
  const [inStock, setInStock] = useState(false);
  const [onSale, setOnSale] = useState(false);
  const [brandAZ, setBrandAZ] = useState(true);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setSortOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const setParam = (key, value, fallback) => {
    const next = new URLSearchParams(params);
    if (!value || value === fallback) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };
  const setTypeFilter = (value) => {
    const next = new URLSearchParams(params);
    next.delete('filter');
    if (!value || value === 'all') next.delete('type'); else next.set('type', value);
    setParams(next, { replace: true });
  };
  const setCategoryFilter = (value) => {
    const next = new URLSearchParams(params);
    next.delete('filter');
    if (!value) next.delete('category'); else next.set('category', value);
    setParams(next, { replace: true });
  };

  const categoryOptions = useMemo(() => {
    const names = [...new Set([...categories.map((category) => category.name), ...products.map((product) => product.category)].filter(Boolean))];
    return names.map((name) => ({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''), id: categories.find((category) => category.name === name)?.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, products]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const selectedCategory = categoryOptions.find((category) => category.id === categoryFilter || category.slug === categoryFilter) || null;
    let list = products.filter((product) => chipTest(typeFilter)(product) && (!categoryFilter || product.category === selectedCategory?.name));
    if (term) {
      list = list.filter((p) =>
        [p.name, p.category, p.tagline, p.description, p.sku, ...(p.scentNotes || p.notes || [])].join(' ').toLowerCase().includes(term));
    }
    const band = PRICE_BANDS.find((b) => b.id === price) || PRICE_BANDS[0];
    list = list.filter(band.test);
    if (inStock) list = list.filter((p) => getVariations(p).some((v) => v.stock > 0));
    if (onSale) list = list.filter((p) => getVariations(p).some((variation) => productDiscountPercent(p, variation) > 0));
    if (!brandAZ) list = [];

    const sorted = [...list];
    switch (sort) {
      case 'featured': sorted.sort((a, b) => a.featured - b.featured); break;
      case 'newest': {
        const releaseTime = (product) => {
          const value = product.releasedAt || product.createdAt || product.updatedAt;
          const time = value ? new Date(value).getTime() : 0;
          return Number.isFinite(time) ? time : 0;
        };
        sorted.sort((a, b) => releaseTime(b) - releaseTime(a) || String(a.name).localeCompare(String(b.name)));
        break;
      }
      case 'price-asc': sorted.sort((a, b) => productPrice(a) - productPrice(b)); break;
      case 'price-desc': sorted.sort((a, b) => productPrice(b) - productPrice(a)); break;
      case 'best-selling':
      default: sorted.sort((a, b) => (Number(b.sold) || 0) - (Number(a.sold) || 0) || String(a.name).localeCompare(String(b.name)));
    }
    return sorted;
  }, [products, categoryOptions, typeFilter, categoryFilter, q, price, inStock, onSale, brandAZ, sort]);

  const sortLabel = SORT_OPTIONS.find((s) => s.id === sort)?.label || 'Best Selling';
  const activeRefinements = (price !== 'any') + (inStock ? 1 : 0) + (onSale ? 1 : 0) + (!brandAZ ? 1 : 0);

  const clearAll = () => {
    setPrice('any'); setInStock(false); setOnSale(false); setBrandAZ(true);
    setParams(new URLSearchParams(), { replace: true });
  };

  useEffect(() => {
    if (window.location.hash !== '#shop-results') return undefined;
    const frame = requestAnimationFrame(() => document.getElementById('shop-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [params]);

  return (
    <div className="container">
      <nav className="crumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link> / <span>Shop all</span>
      </nav>

      <div className="shopbar">
        <div className="shop-filters">
          <div className="shop-filter-group" role="group" aria-label="Filter by product type">
            <span className="shop-filter-group__label">Product type</span>
            <div className="shop-filter-group__chips">
              {FILTER_CHIPS.map((c) => <button key={c.id} className={`chip ${typeFilter === c.id ? 'chip--on' : ''}`} aria-pressed={typeFilter === c.id} onClick={() => setTypeFilter(c.id)}>{c.label}</button>)}
            </div>
          </div>
          <div className="shop-filter-group" role="group" aria-label="Filter by category">
            <span className="shop-filter-group__label">Category</span>
            <div className="shop-filter-group__chips">
              <button className={`chip ${!categoryFilter ? 'chip--on' : ''}`} aria-pressed={!categoryFilter} onClick={() => setCategoryFilter('')}>All categories</button>
              {categoryOptions.map((category) => {
                return <button key={category.id} className={`chip ${categoryFilter === category.id || categoryFilter === category.slug ? 'chip--on' : ''}`} aria-pressed={categoryFilter === category.id || categoryFilter === category.slug} onClick={() => setCategoryFilter(category.id)}>{category.name}</button>;
              })}
            </div>
          </div>
        </div>
        <div className="shopbar__right">
          <button className="btn btn--text" onClick={() => setRefineOpen((v) => !v)} aria-expanded={refineOpen}>
            Refine{activeRefinements ? ` (${activeRefinements})` : ''}
          </button>
          <div className="sort">
            <button className="chip" aria-haspopup="true" aria-expanded={sortOpen} onClick={() => setSortOpen((v) => !v)}>
              Sort: {sortLabel} ▾
            </button>
            {sortOpen && (
              <div className="sort__menu" role="listbox" aria-label="Sort products">
                {SORT_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    role="option"
                    aria-checked={sort === s.id}
                    onClick={() => { setParam('sort', s.id, 'best-selling'); setSortOpen(false); }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {refineOpen && (
        <div className="refine">
          <div>
            <h4>Price</h4>
            {PRICE_BANDS.map((b) => (
              <label key={b.id}>
                <input type="radio" name="price" checked={price === b.id} onChange={() => setPrice(b.id)} />
                {b.label}
              </label>
            ))}
          </div>
          <div>
            <h4>More</h4>
            <label><input type="checkbox" checked={inStock} onChange={() => setInStock(inStock === false)} /> In stock only</label>
            <label><input type="checkbox" checked={onSale} onChange={() => setOnSale(onSale === false)} /> On sale</label>
            <label><input type="checkbox" checked={brandAZ} onChange={() => setBrandAZ(brandAZ === false)} /> AZ Original Products</label>
          </div>
        </div>
      )}

      {q && <p className="count-line">Search results for “{q}” — <button className="btn btn--text" style={{ padding: 0 }} onClick={() => setParam('q', '', '')}>clear</button></p>}
      <p className="count-line">{results.length} {results.length === 1 ? 'product' : 'products'}</p>

      {results.length === 0 ? (
        <div className="empty">
          <h3>No scents found.</h3>
          <p>Try another mood, or clear the filters and start again.</p>
          <button className="btn btn--primary" onClick={clearAll}>Clear filters</button>
        </div>
      ) : (
        <div className="grid" id="shop-results">
          {results.map((p, index) => <ProductCard key={p.id} product={p} priority={index < 2} />)}
        </div>
      )}
    </div>
  );
}
