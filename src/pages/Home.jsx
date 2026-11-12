import { useLanguage } from '../i18n/LanguageContext.jsx';
import { Link } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { useSeo } from '../hooks/useSeo.js';
import { Reveal } from '../hooks/Reveal.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { TRUST_ITEMS } from '../data/content.js';

export default function Home() {
  const { t, localize } = useLanguage();
  useSeo('AZ Store | Shop the collection', 'Discover the AZ Store collection and explore new sections, with delivery across Egypt.');
  const { products, categories } = useStore();
  const featured = products.filter((product) => product.homeFeatured);
  const homeProducts = featured.length ? featured : products;
  const homeCategories = [...categories].filter((category) => category.showOnHome && products.some((product) => product.category === category.name))
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <>
      <section className="container hero">
        <div>
          <h1>{t("Find your")}<br />{t("everyday favorite.")}</h1>
          <p>{t("Thoughtfully selected pieces for every day, with a distinct AZ touch.")}</p>
          <div className="hero__cta">
            <Link className="btn btn--primary btn--lg" to="/shop">{t("Shop the collection")}</Link>
            <a className="btn btn--text" href="#sections">{t("Explore sections")}</a>
          </div>
        </div>
        <div className="hero__media">
          <img src="/images/trio-satin.jpg" alt={t("The AZ collection styled on bronze satin under golden light")} fetchpriority="high" />
        </div>
      </section>

      <section className="container">
        <ul className="trust">{TRUST_ITEMS.map((item) => <li key={item}>{t(item)}</li>)}</ul>
      </section>

      {homeCategories.length > 0 && <section className="container sec" id="sections">
        <Reveal className="sec__head">
          <div><h2 className="sec__title">{t("Shop by section")}</h2><p className="sec__sub">{t("Explore the collections selected by AZ.")}</p></div>
          <Link className="btn btn--text" to="/shop">{t("View all")}</Link>
        </Reveal>
        <div className="moods">
          {homeCategories.map((category, index) => {
            const product = products.find((item) => item.category === category.name);
            const image = category.image || product?.images?.find((item) => item?.src)?.src;
            return <Reveal className={`mood mood--${['night', 'bold', 'soft'][index % 3]}`} key={category.id}>
              {image && <img src={image} alt={localize(category)} loading="lazy" style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 8, marginBottom: 16 }} />}
              <span className="mood__no">{String(index + 1).padStart(2, '0')}</span>
              <h3>{localize(category)}</h3>
              <p>{localize(category, 'description') || t(`Explore products in ${category.name}.`)}</p>
              <Link className="btn btn--text" to={`/shop?category=${encodeURIComponent(category.id)}`}>{t("Shop section")}</Link>
            </Reveal>;
          })}
        </div>
      </section>}

      <section className="container sec">
        <Reveal className="sec__head">
          <div><h2 className="sec__title">{t("The collection")}</h2><p className="sec__sub">{t("Selected products from across the AZ collection.")}</p></div>
          <Link className="btn btn--text" to="/shop">{t("View all")}</Link>
        </Reveal>
        <div className="grid">{homeProducts.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 2} />)}</div>
      </section>

      <section className="container gift">
        <Reveal className="gift__media"><img src="/images/gift-box.jpg" alt={t("AZ collection presented as a thoughtful gift")} loading="lazy" /></Reveal>
        <Reveal><h2>{t("Made to be")}<br />{t("remembered.")}</h2><p>{t("Explore the collection and find a thoughtful gift or a new everyday favorite.")}</p><Link className="btn btn--primary" to="/shop">{t("Discover the collection")}</Link></Reveal>
      </section>

      <section className="container statement"><Reveal><p>{t("Made for the moments that make you, you.")}</p><small>{t("AZ Store — Cairo")}</small></Reveal></section>
    </>
  );
}
