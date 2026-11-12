import { useLanguage } from '../i18n/LanguageContext.jsx';
import { Link } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { getCardImage, getCardImageStyle, getVariations, productComparePrice, productDiscountPercent, productPrice } from '../data/products.js';
import { egp } from '../utils/format.js';
import { HeartIcon } from './icons.jsx';

export default function ProductCard({ product, priority = false }) {
  const { t, localize } = useLanguage();
  const { addToCart, wishlist, toggleWish, categories } = useStore();
  const category = categories.find((item) => item.name === product.category);
  const productName = localize(product);
  const cardImage = getCardImage(product);
  const categoryName = category ? localize(category) : t(product.category);
  const wished = wishlist.includes(product.id);
  const defaultVariation = getVariations(product)[0];
  const soldOut = defaultVariation.stock === 0;
  const currentPrice = productPrice(product, defaultVariation);
  const comparePrice = productComparePrice(product, defaultVariation);
  const discountPercent = productDiscountPercent(product, defaultVariation);
  const hasOtherSizeOffer = getVariations(product).slice(1).some((variation) => productDiscountPercent(product, variation) > 0);

  return (
    <article className="card" style={{ '--product-accent': product.accentHex || '#e2ad55' }}>
      <div className="card__media">
        <Link to={`/product/${product.id}`} aria-label={`${t('View')} ${productName}`}>
          {cardImage && <img src={cardImage.src} alt={productName} style={getCardImageStyle(product)} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" />}
        </Link>
        {product.badge && <span className="card__badge">{t(product.badge)}</span>}
        {discountPercent > 0 ? <span className="card__sale">{t("Save")} {discountPercent}%</span> : hasOtherSizeOffer && <span className="card__sale">{t("Offers on sizes")}</span>}
        <button
          className={`card__quick ${soldOut ? 'card__quick--off' : ''}`}
          onClick={() => addToCart(product.id, defaultVariation.id, 1)}
          disabled={soldOut}
        >
          {soldOut ? t("Sold out") : t("Add to bag")}
        </button>
      </div>
      <button
        className={`card__wish ${wished ? 'card__wish--on' : ''}`}
        type="button"
        onClick={() => toggleWish(product.id)}
        aria-label={wished ? `${t('Remove')} ${productName} ${t('from wishlist')}` : `${t('Save')} ${productName} ${t('to wishlist')}`}
        aria-pressed={wished}
        title={wished ? t('Remove from wishlist') : t('Save to wishlist')}
      >
        <HeartIcon filled={wished} />
      </button>
      <h3 className="card__name">
        <Link to={`/product/${product.id}`}>{productName}</Link>
      </h3>
      <div className="card__meta">
          <span className="card__cat">{categoryName}</span>
        <b className="card__price"><span>{egp(currentPrice)}</span>{comparePrice && <s>{egp(comparePrice)}</s>}</b>
      </div>
    </article>
  );
}

