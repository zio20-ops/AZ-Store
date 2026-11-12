import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { useSeo } from '../hooks/useSeo.js';
import ProductCard from '../components/ProductCard.jsx';
import { SORT_OPTIONS } from '../data/content.js';
import { getVariations, productDiscountPercent, productPrice } from '../data/products.js';

const PRICE_BANDS = [
  { id: 'any', label: 'Any price', test: () => true },
  { id: 'u300', label: 'Under EGP 300', test: (p) => productPrice(p) < 300 },
  { id: '300-500', label: 'EGP 300 – 500', test: (p) => productPrice(p) >= 300 && productPrice(p) <= 500 },
  { id: '500-1000', label: 'EGP 500 – 1,000', test: (p) => productPrice(p) > 500 && productPrice(p) <= 1000 },
  { id: 'o1000', label: 'Over EGP 1,000', test: (p) => productPrice(p) > 1000 },
];

export default function Shop() {
  const { t, localize } = useLanguage();
  useSeo('Shop all | AZ Store', 'Browse the AZ collection and explore products by section, price and availability.');
  const { products, categories } = useStore();
  const [params, setParams] = useSearchParams();

  const legacyFilter = params.get('filter') || 'all';
  const categoryFilter = params.get('category') || (legacyFilter.startsWith('category:') ? legacyFilter.slice('category:'.length) : ({ 'calm-and-deep': 'calm-and-deep', bold: 'bold', soft: 'soft-and-dreamy' }[legacyFilter] || ''));
  const sort = params.get('sort') || 'best-selling';
  const q = params.get('q') || '';

  const [refineOpen, setRefineOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [price, setPrice] = useState('any');
  const [inStock, setInStock] = useState(false);
  const [onSale, setOnSale] = useState(false);
  const [brandAZ, setBrandAZ] = useState(true);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setSortOpen(false);
      setCategoryMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const setParam = (key, value, fallback) => {
    const next = new URLSearchParams(params);
    if (!value || value === fallback) next.delete(key);
    else next.set(key, value);
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
    return names.map((name) => { const saved = categories.find((category) => category.name === name); return { name, nameAr: saved?.nameAr || '', slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''), id: saved?.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') }; })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, products]);
  const selectedCategoryLabel = localize(categoryOptions.find((category) => category.id === categoryFilter || category.slug === categoryFilter) || 'All categories');

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const selectedCategory = categoryOptions.find((category) => category.id === categoryFilter || category.slug === categoryFilter) || null;
    let list = products.filter((product) => !categoryFilter || product.category === selectedCategory?.name);
    if (term) {
      list = list.filter((p) =>
        [p.name, p.nameAr, p.category, categories.find((category) => category.name === p.category)?.nameAr, p.tagline, p.taglineAr, p.description, p.descriptionAr, p.sku, ...(p.attributes || []).flatMap((attribute) => [attribute.label, attribute.labelAr, attribute.value, attribute.valueAr]), ...(p.scentNotes || p.notes || [])].join(' ').toLowerCase().includes(term));
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
  }, [products, categoryOptions, categoryFilter, q, price, inStock, onSale, brandAZ, sort]);

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
      <nav className="crumb" aria-label={t("Breadcrumb")}>
        <Link to="/">{t("Home")}</Link> / <span>{t("Shop all")}</span>
      </nav>

      <div className="shopbar">
        <div className="shop-filters">
          <div className={`shop-filter-group shop-filter-group--dropdown${categoryMenuOpen ? ' is-open' : ''}`} role="group" aria-label={t("Filter by category")}>
            <span className="shop-filter-group__label">{t("Category")}</span>
            <button type="button" className="shop-filter-group__toggle" aria-expanded={categoryMenuOpen} onClick={() => setCategoryMenuOpen((open) => !open)}>
              <span>{t("Category")}</span><b>{selectedCategoryLabel}</b><i aria-hidden="true">⌄</i>
            </button>
            <div className="shop-filter-group__chips">
              <button className={`chip ${!categoryFilter ? 'chip--on' : ''}`} aria-pressed={!categoryFilter} onClick={() => { setCategoryFilter(''); setCategoryMenuOpen(false); }}>{t("All categories")}</button>
              {categoryOptions.map((category) => {
                return <button key={category.id} className={`chip ${categoryFilter === category.id || categoryFilter === category.slug ? 'chip--on' : ''}`} aria-pressed={categoryFilter === category.id || categoryFilter === category.slug} onClick={() => { setCategoryFilter(category.id); setCategoryMenuOpen(false); }}>{localize(category)}</button>;
              })}
            </div>
          </div>
        </div>
        <div className="shopbar__right">
          <button className="btn btn--text" onClick={() => setRefineOpen((v) => !v)} aria-expanded={refineOpen}>
            {t("Refine")}{activeRefinements ? ` (${activeRefinements})` : ''}
          </button>
          <div className="sort">
            <button className="chip" aria-haspopup="true" aria-expanded={sortOpen} onClick={() => setSortOpen((v) => !v)}>
              {t("Sort:")} {t(sortLabel)} ▾
            </button>
            {sortOpen && (
              <div className="sort__menu" role="listbox" aria-label={t("Sort products")}>
                {SORT_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    role="option"
                    aria-checked={sort === s.id}
                    onClick={() => { setParam('sort', s.id, 'best-selling'); setSortOpen(false); }}
                  >
                    {t(s.label)}
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
            <h4>{t("Price")}</h4>
            {PRICE_BANDS.map((b) => (
              <label key={b.id}>
                <input type="radio" name="price" checked={price === b.id} onChange={() => setPrice(b.id)} />
                {t(b.label)}
              </label>
            ))}
          </div>
          <div>
            <h4>{t("More")}</h4>
            <label><input type="checkbox" checked={inStock} onChange={() => setInStock(inStock === false)} /> {t("In stock only")}</label>
            <label><input type="checkbox" checked={onSale} onChange={() => setOnSale(onSale === false)} /> {t("On sale")}</label>
            <label><input type="checkbox" checked={brandAZ} onChange={() => setBrandAZ(brandAZ === false)} /> {t("AZ Original Products")}</label>
          </div>
        </div>
      )}

      {q && <p className="count-line">{t("Search results for “")}{q}” — <button className="btn btn--text" style={{ padding: 0 }} onClick={() => setParam('q', '', '')}>{t("clear")}</button></p>}
      <p className="count-line">{results.length} {results.length === 1 ? t("product") : t("products")}</p>

      {results.length === 0 ? (
        <div className="empty">
          <h3>{t("No products found.")}</h3>
          <p>{t("Try another section, or clear the filters and start again.")}</p>
          <button className="btn btn--primary" onClick={clearAll}>{t("Clear filters")}</button>
        </div>
      ) : (
        <div className="grid" id="shop-results">
          {results.map((p, index) => <ProductCard key={p.id} product={p} priority={index < 2} />)}
        </div>
      )}
    </div>
  );
}
