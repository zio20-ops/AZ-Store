import { useEffect, useMemo, useState } from 'react';
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
  const { id } = useParams();
  const { addToCart, wishlist, toggleWish, products, productsLoading } = useStore();
  const product = products.find((p) => p.id === id);
  const variations = product ? getVariations(product) : [];

  const [variationId, setVariationId] = useState(variations[0]?.id);
  const [imageIndex, setImageIndex] = useState(0);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (product) {
      setVariationId(getVariations(product)[0].id);
      setImageIndex(0);
      setQty(1);
    }
  }, [product]);

  const variation = variations.find((v) => v.id === variationId) || variations[0];

  useSeo(
    product ? `${product.name} | AZ Store` : 'Product not found | AZ Store',
    product?.tagline,
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

  const accordionItems = [
    { q: 'Scent notes', a: (product.scentNotes || product.notes || []).join(' · ') },
    { q: 'How to use', a: product.howToUse || 'Spray generously on clean skin from 15 cm — wrists, neck and over clothing.' },
    ...(product.ingredients?.length ? [{ q: 'Ingredients', a: product.ingredients.join(', ') }] : []),
    ...(product.benefits?.length ? [{ q: 'Benefits', a: product.benefits.join(' · ') }] : []),
    { q: 'Delivery and returns', a: 'Standard delivery 2 to 4 days (EGP 60), express next day (EGP 110). Free standard delivery over EGP 1,800. Unopened products can be returned within 14 days.' },
  ];

  return (
    <div className="container">
      <nav className="crumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link> / <Link to="/shop">Shop all</Link> / <span>{product.name}</span>
      </nav>

      <div className="pdp" style={{ '--product-accent': product.accentHex || '#e2ad55' }}>
        <div className="thumbs" role="group" aria-label="Product images">
          {product.images.map((g, i) => g?.src ? (
            <button
              key={g.src + i}
              className={`thumb ${imageIndex === i ? 'thumb--on' : ''}`}
              onClick={() => setImageIndex(i)}
              aria-label={`Show image ${i + 1}`}
              aria-pressed={imageIndex === i}
            >
              <img src={g.src} alt="" loading="lazy" />
            </button>
          ) : null)}
        </div>

        <div className="pdp__main">
          <img src={(product.images[imageIndex]?.src ? product.images[imageIndex] : product.images.find((image) => image?.src))?.src} alt={(product.images[imageIndex]?.src ? product.images[imageIndex] : product.images.find((image) => image?.src))?.alt || product.name} />
        </div>

        <div className="pdp__info">
          <span className="chip">{product.category}</span>
          <h1 className="pdp__title" style={{ color: 'var(--product-accent)' }}>{product.name}</h1>
          <p className="pdp__lead">{product.tagline}</p>
          <div className="pdp__notes">
            {(product.scentNotes || product.notes || []).map((n) => <span className="chip" key={n}>{n}</span>)}
          </div>

          <div className="pdp__price">
            <span>{egp(currentPrice)}</span>
            {comparePrice && <s>{egp(comparePrice)}</s>}
            {discountPercent > 0 && <b className="pdp__sale">Save {discountPercent}%</b>}
            <small>{variation.label}</small>
          </div>

          {variations.length > 1 && (
            <div className="variations" role="group" aria-label="Choose size">
              {variations.map((v) => (
                <button
                  key={v.id}
                  className={`chip ${v.id === variation.id ? 'chip--on' : ''}`}
                  aria-pressed={v.id === variation.id}
                  onClick={() => { setVariationId(v.id); setImageIndex(variationImageIndex(product, v)); setQty(1); }}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}

          <div className="pdp__buy">
            <QuantitySelector value={qty} onChange={setQty} max={Math.max(1, variation.stock)} />
            <button
              className={`btn btn--primary ${soldOut ? 'btn--disabled' : ''}`}
              style={{ flex: 1, minWidth: 180 }}
              onClick={() => addToCart(product.id, variation.id, qty)}
              disabled={soldOut}
            >
              {soldOut ? 'Sold out' : 'Add to bag'}
            </button>
            <button
              className={`pdp__wish ${wished ? 'pdp__wish--on' : ''}`}
              type="button"
              onClick={() => toggleWish(product.id)}
              aria-label={wished ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
              aria-pressed={wished}
              title={wished ? 'Remove from wishlist' : 'Save to wishlist'}
            >
              <HeartIcon filled={wished} />
            </button>
          </div>
          <p className={`pdp__stock ${soldOut ? 'pdp__stock--out' : ''}`} role="status">
            {soldOut
              ? 'This size is sold out — try another size.'
              : variation.stock <= (product.lowStockThreshold ?? 6)
                ? `Only ${variation.stock} left in stock · SKU ${variation.sku}`
                : `In stock · SKU ${variation.sku}`}
          </p>

          {product.id !== 'trio-gift-box' && (
            <div className="pdp__buy" style={{ marginTop: 12 }}>
              <Link className="btn btn--ghost btn--block" to="/product/trio-gift-box">Buy the trio box and save</Link>
            </div>
          )}

          <div className="pdp__accordions">
            <Accordion items={accordionItems} />
          </div>
        </div>
      </div>

      <div className="pdp__sticky">
        <button
          className={`btn btn--primary btn--block ${soldOut ? 'btn--disabled' : ''}`}
          style={{ '--product-accent': product.accentHex || '#e2ad55' }}
          onClick={() => addToCart(product.id, variation.id, qty)}
          disabled={soldOut}
        >
          {soldOut ? 'Sold out' : `Add to bag · ${egp(currentPrice * qty)}`}
        </button>
      </div>

      <section className="container sec" style={{ paddingInline: 0 }}>
        <div className="sec__head">
          <h2 className="sec__title">Complete the wardrobe</h2>
          <Link className="btn btn--text" to="/shop">View all</Link>
        </div>
        <div className="grid">
          {related.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </div>
  );
}
