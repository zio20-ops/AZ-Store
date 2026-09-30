import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { useSeo } from '../hooks/useSeo.js';
import ProductCard from '../components/ProductCard.jsx';
import { FILTER_CHIPS, SORT_OPTIONS, SCENT_PROFILES } from '../data/content.js';
import { basePrice, getVariations } from '../data/products.js';

const PRICE_BANDS = [
  { id: 'any', label: 'Any price', test: () => true },
  { id: 'u300', label: 'Under EGP 300', test: (p) => basePrice(p) < 300 },
  { id: '300-500', label: 'EGP 300 – 500', test: (p) => basePrice(p) >= 300 && basePrice(p) <= 500 },
  { id: '500-1000', label: 'EGP 500 – 1,000', test: (p) => basePrice(p) > 500 && basePrice(p) <= 1000 },
  { id: 'o1000', label: 'Over EGP 1,000', test: (p) => basePrice(p) > 1000 },
];

const chipTest = (id) => (p) => {
  switch (id) {
    case 'mists': return p.type === 'mist';
    case 'serums': return p.type === 'serum';
    case 'gift-sets': return p.type === 'gift';
    case 'calm-and-deep': return p.category === 'Calm and deep';
    case 'bold': return p.category === 'Bold';
    case 'soft': return p.category === 'Soft and dreamy';
    default: return true;
  }
};

export default function Shop() {
  useSeo('Shop all | AZ Store', 'Browse the AZ collection: fine fragrance mists and gift sets. Filter by mood, price and rating.');
  const { products } = useStore();
  const [params, setParams] = useSearchParams();

  const chip = params.get('filter') || 'all';
  const sort = params.get('sort') || 'best-selling';
  const q = params.get('q') || '';

  const [refineOpen, setRefineOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [price, setPrice] = useState('any');
  const [minRating, setMinRating] = useState(0);
  const [inStock, setInStock] = useState(false);
  const [onSale, setOnSale] = useState(false);
  const [brandAZ, setBrandAZ] = useState(true);
  const [scents, setScents] = useState([]);

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

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = products.filter(chipTest(chip));
    if (term) {
      list = list.filter((p) =>
        [p.name, p.category, p.tagline, p.description, p.sku, ...(p.scentNotes || p.notes || [])].join(' ').toLowerCase().includes(term));
    }
    const band = PRICE_BANDS.find((b) => b.id === price) || PRICE_BANDS[0];
    list = list.filter(band.test);
    if (minRating) list = list.filter((p) => p.rating >= minRating);
    if (inStock) list = list.filter((p) => getVariations(p).some((v) => v.stock > 0));
    if (onSale) list = list.filter((p) => p.compareAt);
    if (!brandAZ) list = [];
    if (scents.length) list = list.filter((p) => scents.includes(p.category));

    const sorted = [...list];
    switch (sort) {
      case 'featured': sorted.sort((a, b) => a.featured - b.featured); break;
      case 'newest': sorted.sort((a, b) => b.releasedAt.localeCompare(a.releasedAt)); break;
      case 'price-asc': sorted.sort((a, b) => basePrice(a) - basePrice(b)); break;
      case 'price-desc': sorted.sort((a, b) => basePrice(b) - basePrice(a)); break;
      case 'best-rated': sorted.sort((a, b) => b.rating - a.rating); break;
      default: sorted.sort((a, b) => b.sold - a.sold);
    }
    return sorted;
  }, [products, chip, q, price, minRating, inStock, onSale, brandAZ, scents, sort]);

  const sortLabel = SORT_OPTIONS.find((s) => s.id === sort)?.label || 'Best Selling';
  const activeRefinements = (price !== 'any') + (minRating ? 1 : 0) + (inStock ? 1 : 0) + (onSale ? 1 : 0) + (!brandAZ ? 1 : 0) + (scents.length ? 1 : 0);

  const clearAll = () => {
    setPrice('any'); setMinRating(0); setInStock(false); setOnSale(false); setBrandAZ(true); setScents([]);
    setParams(new URLSearchParams(), { replace: true });
  };

  return (
    <div className="container">
      <nav className="crumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link> / <span>Shop all</span>
      </nav>

      <div className="shopbar">
        <div className="chips" role="group" aria-label="Filter by category">
          {FILTER_CHIPS.map((c) => (
            <button
              key={c.id}
              className={`chip ${chip === c.id ? 'chip--on' : ''}`}
              aria-pressed={chip === c.id}
              onClick={() => setParam('filter', c.id, 'all')}
            >
              {c.label}
            </button>
          ))}
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
            <h4>Scent profile</h4>
            {SCENT_PROFILES.map((s) => (
              <label key={s}>
                <input
                  type="checkbox"
                  checked={scents.includes(s)}
                  onChange={() => setScents((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s])}
                />
                {s}
              </label>
            ))}
          </div>
          <div>
            <h4>Rating</h4>
            {[0, 4.5, 4.8].map((r) => (
              <label key={r}>
                <input type="radio" name="rating" checked={minRating === r} onChange={() => setMinRating(r)} />
                {r === 0 ? 'Any rating' : `${r}★ & up`}
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
        <div className="grid">
          {results.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
