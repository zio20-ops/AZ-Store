import { useLanguage } from '../i18n/LanguageContext.jsx';
import { Link } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { useSeo } from '../hooks/useSeo.js';
import { Reveal } from '../hooks/Reveal.jsx';
import { TRUST_ITEMS } from '../data/content.js';

export default function Home() {
  const { t, localize } = useLanguage();
  useSeo('AZ Store | Shop the collection', 'Discover the AZ Store collection and explore new sections, with delivery across Egypt.');
  const { products, categories, settings } = useStore();
  const heroImage = settings.homepageImages?.hero || '/images/az-watch-hero.png';
  const giftImage = settings.homepageImages?.gift || '/images/az-watch-gift.png';
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
        <div className="hero__media hero__media--watch">
          <img src={heroImage} alt={t("A luxury AZ watch photographed on dark stone")} fetchpriority="high" />
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

      <section className="container gift">
        <Reveal className="gift__media"><img src={giftImage} alt={t("A luxury watch presented in its gift box")} loading="lazy" /></Reveal>
        <Reveal><h2>{t("Made to be")}<br />{t("remembered.")}</h2><p>{t("Explore the collection and find a thoughtful gift or a new everyday favorite.")}</p><Link className="btn btn--primary" to="/shop">{t("Discover the collection")}</Link></Reveal>
      </section>

      <section className="container statement"><Reveal><p>{t("Made for the moments that make you, you.")}</p><small>{t("AZ Store — Cairo")}</small></Reveal></section>
    </>
  );
}
