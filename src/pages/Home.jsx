import { useLanguage } from '../i18n/LanguageContext.jsx';
import { Link } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { useSeo } from '../hooks/useSeo.js';
import { Reveal } from '../hooks/Reveal.jsx';
import { TRUST_ITEMS } from '../data/content.js';
import { categorySlug } from '../data/products.js';
import ProductCard from '../components/ProductCard.jsx';

export default function Home() {
  const { t, localize } = useLanguage();
  useSeo('AZ Store | Shop the collection', 'Discover the AZ Store collection and explore new sections, with delivery across Egypt.');
  const { products, categories, settings } = useStore();
  const heroImage = settings.homepageImages?.hero || '/images/az-watch-hero.png';
  const giftImage = settings.homepageImages?.gift || '/images/az-watch-gift.png';
  const homeCategories = [...categories].filter((category) => category.showOnHome && products.some((product) => product.category === category.name))
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const featuredProducts = products.filter((product) => product.homeFeatured).slice(0, 4);

  return (
    <>
      <section className="container hero">
        <div>
          <span className="hero__eyebrow">{t("AZ / Objects to keep")}</span>
          <h1>{t("Find your")}<br />{t("everyday favorite.")}</h1>
          <p>{t("Thoughtfully selected pieces for every day, with a distinct AZ touch.")}</p>
          <div className="hero__cta">
            <Link className="btn btn--primary btn--lg" to="/shop">{t("Shop the collection")}</Link>
            <a className="btn btn--text" href="#sections">{t("Explore sections")}</a>
          </div>
        </div>
        <div className="hero__media hero__media--watch">
          <img src={heroImage} alt={t("AZ Store featured collection") } fetchpriority="high" />
          <span className="hero__brand-mark" aria-hidden="true">AZ</span>
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
            const categoryPath = `/shop?category=${encodeURIComponent(categorySlug(category) || category.id)}`;
            return <Reveal className={`mood mood--${['night', 'bold', 'soft'][index % 3]}${homeCategories.length === 1 ? ' mood--featured' : ''}`} key={category.id}>
              {image && <Link className="mood__image-link" to={categoryPath} aria-label={`${t('Shop section')}: ${localize(category)}`}><img src={image} alt={localize(category)} loading="lazy" />}</Link>}
              <h3><Link className="mood__title-link" to={categoryPath}>{localize(category)}</Link></h3>
              <p>{localize(category, 'description') || t(`Explore products in ${category.name}.`)}</p>
              <Link className="btn btn--text" to={categoryPath}>{t("Shop section")}</Link>
            </Reveal>;
          })}
        </div>
      </section>}

      {featuredProducts.length > 0 && <section className="container sec home-edit" aria-labelledby="home-edit-title">
        <Reveal className="sec__head">
          <div>
            <span className="home-edit__eyebrow">AZ / THE EDIT</span>
            <h2 className="sec__title" id="home-edit-title">{t("Selected by AZ")}</h2>
            <p className="sec__sub">{t("A small selection of pieces worth keeping close.")}</p>
          </div>
          <Link className="btn btn--text" to="/shop">{t("View all")}</Link>
        </Reveal>
        <div className="grid home-edit__grid">
          {featuredProducts.map((product, index) => <Reveal key={product.id} style={{ '--reveal-delay': `${index * 70}ms` }}>
            <div className="home-edit__card"><span>{String(index + 1).padStart(2, '0')}</span><ProductCard product={product} priority={index < 2} /></div>
          </Reveal>)}
        </div>
      </section>}

      <section className="container gift">
        <Reveal className="gift__media"><img src={giftImage} alt={t("A thoughtful AZ Store gift") } loading="lazy" /></Reveal>
        <Reveal className="gift__copy"><span className="gift__eyebrow">{t("AZ / A gift to remember")}</span><h2>{t("Made to be")}<br />{t("remembered.")}</h2><p>{t("Explore the collection and find a thoughtful gift or a new everyday favorite.")}</p><Link className="btn btn--primary" to="/shop">{t("Discover the collection")}</Link></Reveal>
      </section>

      <section className="container statement"><Reveal><p>{t("Made for the moments that make you, you.")}</p><small>{t("AZ Store — Cairo")}</small></Reveal></section>
    </>
  );
}
