import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { useSeo } from '../hooks/useSeo.js';
import { getVariations, productComparePrice, productDiscountPercent, productPrice, variationImageIndex } from '../data/products.js';
import { egp } from '../utils/format.js';
import QuantitySelector from '../components/QuantitySelector.jsx';
import Accordion from '../components/Accordion.jsx';
import ProductCard from '../components/ProductCard.jsx';
import NotFound from './NotFound.jsx';
import { HeartIcon } from '../components/icons.jsx';

export default function ProductDetails() {
  const { t, localize } = useLanguage();
  const { id } = useParams();
  const { addToCart, wishlist, toggleWish, products, categories, productsLoading } = useStore();
  const product = products.find((p) => p.id === id);
  const productCategory = categories.find((category) => category.name === product?.category) || product?.category;
  const variations = product ? getVariations(product) : [];

  const [variationId, setVariationId] = useState(variations[0]?.id);
  const [imageIndex, setImageIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const touchStartX = useRef(null);
  const swipedGallery = useRef(false);

  useEffect(() => {
    if (product) {
      const firstVariation = getVariations(product)[0];
      setVariationId(firstVariation.id);
      setImageIndex(variationImageIndex(product, firstVariation));
      setQty(1);
    }
  }, [product]);

  const galleryImages = product?.images?.filter((image) => image?.src) || [];
  const showGalleryImage = (index) => setImageIndex((index + galleryImages.length) % galleryImages.length);

  useEffect(() => {
    if (!galleryOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setGalleryOpen(false);
      if (event.key === 'ArrowRight') showGalleryImage(imageIndex + (document.documentElement.dir === 'rtl' ? -1 : 1));
      if (event.key === 'ArrowLeft') showGalleryImage(imageIndex + (document.documentElement.dir === 'rtl' ? 1 : -1));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [galleryOpen, imageIndex, galleryImages.length]);

  const variation = variations.find((v) => v.id === variationId) || variations[0];

  useSeo(
    product ? `${localize(product)} | AZ Store` : 'Product not found | AZ Store',
    product ? localize(product, 'tagline') : '',
  );

  useEffect(() => {
    if (!product || !variation) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: product.images.map((g) => g.src),
      brand: { '@type': 'Brand', name: 'AZ' },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'EGP',
        price: productPrice(product, variation),
        availability: variation.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        sku: variation.sku,
      },
    });
    document.head.appendChild(script);
    return () => document.head.removeChild(script);
  }, [product, variation]);

  const related = useMemo(() => products.filter((p) => p.id !== id).slice(0, 3), [products, id]);

  if (productsLoading && !product) return null;
  if (!product || !variation) return <NotFound />;

  const soldOut = variation.stock === 0;
  const wished = wishlist.includes(product.id);
  const currentPrice = productPrice(product, variation);
  const comparePrice = productComparePrice(product, variation);
  const discountPercent = productDiscountPercent(product, variation);
  const selectedImage = galleryImages[imageIndex] || galleryImages[0];

  const accordionItems = [
    ...(localize(product, 'description') ? [{ q: localize({ name: 'About this product', nameAr: 'عن المنتج' }), a: localize(product, 'description') }] : []),
    ...(product.attributes?.length ? [{ q: 'Product details', a: product.attributes.map((item) => `${localize(item, 'label')}: ${localize(item, 'value')}`).join(' · ') }] : []),
    { q: 'Delivery and returns', a: 'Standard delivery 2 to 4 days (EGP 60), express next day (EGP 110). Free standard delivery over EGP 1,800. Unopened products can be returned within 14 days.' },
  ];

  return (
    <div className="container">
      <nav className="crumb" aria-label={t("Breadcrumb")}>
        <Link to="/">{t("Home")}</Link> / <Link to="/shop">{t("Shop all")}</Link> / <span>{localize(product)}</span>
      </nav>

      <div className="pdp" style={{ '--product-accent': product.accentHex || '#e2ad55' }}>
        <div className="thumbs" role="group" aria-label={t("Product images")}>
          {galleryImages.map((g, i) => (
            <button
              key={g.src + i}
              className={`thumb ${imageIndex === i ? 'thumb--on' : ''}`}
              onClick={() => showGalleryImage(i)}
              aria-label={`Show image ${i + 1}`}
              aria-pressed={imageIndex === i}
            >
              <img src={g.src} alt={localize(product)} loading="lazy" />
            </button>
          ))}
        </div>

        <div className="pdp__main">
          {selectedImage && <button type="button" className="pdp__zoom-trigger" onClick={() => { if (swipedGallery.current) { swipedGallery.current = false; return; } setGalleryOpen(true); }} aria-label={t('Enlarge image')} onTouchStart={(event) => { touchStartX.current = event.changedTouches[0].clientX; }} onTouchEnd={(event) => { if (touchStartX.current === null || galleryImages.length < 2) return; const delta = event.changedTouches[0].clientX - touchStartX.current; if (Math.abs(delta) > 48) { showGalleryImage(imageIndex + (delta < 0 ? 1 : -1)); swipedGallery.current = true; } touchStartX.current = null; }}>
            <img src={selectedImage.src} alt={localize(product)} style={{ objectFit: selectedImage.fit === 'contain' ? 'contain' : 'cover', transform: `scale(${Math.min(1.5, Math.max(1, Number(selectedImage.zoom ?? 100) / 100))})` }} />
            <span className="pdp__zoom-hint">{t('Click to enlarge')}</span>
          </button>}
        </div>

        <div className="pdp__info">
          <span className="chip">{localize(productCategory)}</span>
          <h1 className="pdp__title" style={{ color: 'var(--product-accent)' }}>{localize(product)}</h1>
          <p className="pdp__lead">{localize(product, 'tagline')}</p>
          <div className="pdp__notes">
            {(product.attributes || []).slice(0, 3).map((item) => <span className="chip" key={item.label}>{localize(item, 'label')}: {localize(item, 'value')}</span>)}
          </div>

          <div className="pdp__price">
            <span>{egp(currentPrice)}</span>
            {comparePrice && <s>{egp(comparePrice)}</s>}
            {discountPercent > 0 && <b className="pdp__sale">{t("Save")} {discountPercent}%</b>}
            <small>{localize(variation, 'label')}</small>
          </div>

          {variations.length > 1 && (
            <div className="variations" role="group" aria-label={t("Choose option")}>
              {variations.map((v) => (
                <button
                  key={v.id}
                  className={`chip ${v.id === variation.id ? 'chip--on' : ''}`}
                  aria-pressed={v.id === variation.id}
                  onClick={() => { setVariationId(v.id); setImageIndex(variationImageIndex(product, v)); setQty(1); }}
                >
                  {localize(v, 'label')}
                </button>
              ))}
            </div>
          )}

          <div className="pdp__buy">
            <QuantitySelector value={qty} onChange={setQty} max={Math.max(1, variation.stock)} />
            <button
              className={`btn btn--primary pdp__buy-primary ${soldOut ? 'btn--disabled' : ''}`}
              style={{ flex: 1 }}
              onClick={() => addToCart(product.id, variation.id, qty)}
              disabled={soldOut}
            >
              {soldOut ? t("Sold out") : t("Add to bag")}
            </button>
            <button
              className={`pdp__wish ${wished ? 'pdp__wish--on' : ''}`}
              type="button"
              onClick={() => toggleWish(product.id)}
              aria-label={wished ? `${t('Remove')} ${localize(product)} ${t('from wishlist')}` : `${t('Save')} ${localize(product)} ${t('to wishlist')}`}
              aria-pressed={wished}
              title={wished ? t('Remove from wishlist') : t('Save to wishlist')}
            >
              <HeartIcon filled={wished} />
            </button>
          </div>
          <p className={`pdp__stock ${soldOut ? 'pdp__stock--out' : ''}`} role="status">
            {soldOut
              ? t("This size is sold out — try another size.")
              : variation.stock <= (product.lowStockThreshold ?? 6)
              ? <>{t('Only')} {variation.stock} {t('left in stock · SKU')} {variation.sku}</>
              : <>{t('In stock · SKU')} {variation.sku}</>}
          </p>

          <div className="pdp__accordions">
            <Accordion items={accordionItems} />
          </div>
        </div>
      </div>

      {galleryOpen && selectedImage && <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={t('Product images')} onMouseDown={(event) => { if (event.target === event.currentTarget) setGalleryOpen(false); }}>
        <button type="button" className="gallery-lightbox__close" onClick={() => setGalleryOpen(false)} aria-label={t('Close')}>×</button>
        {galleryImages.length > 1 && <button type="button" className="gallery-lightbox__arrow gallery-lightbox__arrow--prev" onClick={() => showGalleryImage(imageIndex - 1)} aria-label={t('Previous image')}>‹</button>}
        <img src={selectedImage.src} alt={`${localize(product)} — ${imageIndex + 1}`} />
        {galleryImages.length > 1 && <button type="button" className="gallery-lightbox__arrow gallery-lightbox__arrow--next" onClick={() => showGalleryImage(imageIndex + 1)} aria-label={t('Next image')}>›</button>}
        <span className="gallery-lightbox__count">{imageIndex + 1} / {galleryImages.length}</span>
      </div>}

      <section className="container sec" style={{ paddingInline: 0 }}>
        <div className="sec__head">
          <h2 className="sec__title">{t("You may also like")}</h2>
          <Link className="btn btn--text" to="/shop">{t("View all")}</Link>
        </div>
        <div className="grid">
          {related.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </div>
  );
}

