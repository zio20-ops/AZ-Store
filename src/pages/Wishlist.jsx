import { useLanguage } from '../i18n/LanguageContext.jsx';
import { Link } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { useSeo } from '../hooks/useSeo.js';
import ProductCard from '../components/ProductCard.jsx';

export default function Wishlist() {
  const { t } = useLanguage();
  useSeo('Wishlist | AZ Store', 'The scents you saved for later.');
  const { wishlist, products } = useStore();
  const saved = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="container">
      <div className="page-head">
        <h1>{t("Your wishlist")}</h1>
        <p>{saved.length ? t("The moods you’re keeping an eye on.") : t("Nothing saved yet — tap the heart on any scent to keep it here.")}</p>
      </div>

      {saved.length === 0 ? (
        <div className="empty">
          <h3>{t("No saved scents.")}</h3>
          <p>{t("Browse the collection and save the ones that speak to you.")}</p>
          <Link className="btn btn--primary" to="/shop">{t("Shop all")}</Link>
        </div>
      ) : (
        <div className="grid">
          {saved.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
