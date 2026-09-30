import { Link } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { useSeo } from '../hooks/useSeo.js';
import ProductCard from '../components/ProductCard.jsx';

export default function Wishlist() {
  useSeo('Wishlist | AZ Store', 'The scents you saved for later.');
  const { wishlist, products } = useStore();
  const saved = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="container">
      <div className="page-head">
        <h1>Your wishlist</h1>
        <p>{saved.length ? 'The moods you’re keeping an eye on.' : 'Nothing saved yet — tap the heart on any scent to keep it here.'}</p>
      </div>

      {saved.length === 0 ? (
        <div className="empty">
          <h3>No saved scents.</h3>
          <p>Browse the collection and save the ones that speak to you.</p>
          <Link className="btn btn--primary" to="/shop">Shop all</Link>
        </div>
      ) : (
        <div className="grid">
          {saved.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
