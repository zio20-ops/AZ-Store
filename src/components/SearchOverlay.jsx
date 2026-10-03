import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { egp } from '../utils/format.js';
import { getVariations, productComparePrice, productPrice } from '../data/products.js';

export default function SearchOverlay() {
  const { t } = useLanguage();
  const { searchOpen, setSearchOpen, products } = useStore();
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (searchOpen) {
      setQ('');
      setTimeout(() => inputRef.current?.focus(), 60);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setSearchOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSearchOpen]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return products.filter((p) =>
      [p.name, p.category, p.tagline, p.description, p.sku, ...(p.scentNotes || p.notes || [])].join(' ').toLowerCase().includes(term),
    );
  }, [q, products]);

  if (!searchOpen) return null;

  const goShop = (e) => {
    e.preventDefault();
    setSearchOpen(false);
    navigate(`/shop?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="search" role="dialog" aria-modal="true" aria-label={t("Search products")}>
      <div className="search__in">
        <div className="search__top">
          <span>{t("Search by name, scent or mood")}</span>
          <button onClick={() => setSearchOpen(false)}>{t("Close")}</button>
        </div>
        <form onSubmit={goShop}>
          <input
            ref={inputRef}
            className="search__field"
            placeholder={t("What are you in the mood for?")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t("Search products")}
          />
        </form>

        {q.trim() && (
          <div className="search__results">
            {results.length === 0 ? (
              <p className="search__hint">{t("No scents found. Try “night”, “bold” or “gift”.")}</p>
            ) : (
              results.map((p) => (
                <button
                  key={p.id}
                  className="search__row"
                  onClick={() => { setSearchOpen(false); navigate(`/product/${p.id}`); }}
                >
                  <img src={p.images[0].src} alt="" loading="lazy" />
                  <span>
                    <b style={{ color: p.accentHex }}>{t(p.name)}</b>
                    <small>{t(p.category)}</small>
                  </span>
                  <span className="search__price">{egp(productPrice(p))}{productComparePrice(p, getVariations(p)[0]) && <s>{egp(productComparePrice(p, getVariations(p)[0]))}</s>}</span>
                </button>
              ))
            )}
          </div>
        )}

        {!q.trim() && (
          <p className="search__hint">{t("Popular tonight: Black Kiss · gift box · rose · night flowers")}</p>
        )}
      </div>
    </div>
  );
}
