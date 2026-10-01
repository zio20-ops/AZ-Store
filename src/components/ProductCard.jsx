import { Link } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { basePrice, getVariations } from '../data/products.js';
import { egp } from '../utils/format.js';
import { HeartIcon } from './icons.jsx';

export default function ProductCard({ product }) {
  const { addToCart, wishlist, toggleWish } = useStore();
  const wished = wishlist.includes(product.id);
  const defaultVariation = getVariations(product)[0];
  const soldOut = defaultVariation.stock === 0;

  return (
    <article className="card">
      <div className="card__media">
        <Link to={`/product/${product.id}`} aria-label={`View ${product.name}`}>
          <img src={product.images[0].src} alt={product.images[0].alt} loading="lazy" decoding="async" />
        </Link>
        {product.badge && <span className="card__badge">{product.badge}</span>}
        <button
          className={`card__quick ${soldOut ? 'card__quick--off' : ''}`}
          onClick={() => addToCart(product.id, defaultVariation.id, 1)}
          disabled={soldOut}
        >
          {soldOut ? 'Sold out' : 'Add to bag'}
        </button>
      </div>
      <button
        className={`card__wish ${wished ? 'card__wish--on' : ''}`}
        type="button"
        onClick={() => toggleWish(product.id)}
        aria-label={wished ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
        aria-pressed={wished}
        title={wished ? 'Remove from wishlist' : 'Save to wishlist'}
      >
        <HeartIcon filled={wished} />
      </button>
      <h3 className="card__name">
        <Link to={`/product/${product.id}`} style={{ color: product.accentHex }}>{product.name}</Link>
      </h3>
      <div className="card__meta">
        <span className="card__cat">{product.category}</span>
        <b className="card__price">{egp(basePrice(product))}</b>
      </div>
      <div className="card__rating">★ {product.rating} · {product.reviews} reviews</div>
    </article>
  );
}
