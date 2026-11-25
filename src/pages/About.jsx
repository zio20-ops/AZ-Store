import { Link } from 'react-router-dom';
import { useSeo } from '../hooks/useSeo.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { Reveal } from '../hooks/Reveal.jsx';

export default function About() {
  const { t } = useLanguage();
  useSeo('Our story | AZ Store', 'Discover the AZ Store story: thoughtful products, considered details and personal service from Cairo.');

  return <>
    <section className="container about-hero"><Reveal>
      <h1>{t("Made for your everyday.")}</h1>
      <p>{t("AZ began in Cairo with a simple idea: finding something you love should feel personal. We bring together thoughtfully selected products, clear information and attentive service, all with a distinct AZ point of view.")}</p>
    </Reveal></section>

    <section className="container about-grid">
      <Reveal as="figure" className="wide about-story-box">
        <img src="/images/az-story-brand-box.jpg" alt={t("A minimal black AZ presentation box")} loading="lazy" />
        <svg className="about-story-box__mark" viewBox="0 0 2136 1424" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="azStoryGold" x1="0" y1="0" x2="0.8" y2="1"><stop offset="0" stopColor="#f5d58a" /><stop offset="1" stopColor="#b47b31" /></linearGradient>
            <filter id="azStoryEmboss" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" /><feOffset dy="2" result="offset" /><feComponentTransfer><feFuncA type="linear" slope="0.45" /></feComponentTransfer><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <text x="0" y="0" transform="matrix(1 -0.24 0.6 1 1255 665)" fill="url(#azStoryGold)" filter="url(#azStoryEmboss)" fontFamily="Georgia, 'Times New Roman', serif" fontSize="118" fontWeight="500" letterSpacing="-8">AZ</text>
        </svg>
      </Reveal>
      <Reveal as="figure" className="wide"><img src="/images/az-story-order-packing.jpg" alt={t("A thoughtfully wrapped AZ gift being handed over")} loading="lazy" /></Reveal>
    </section>

    <section className="container about-copy">
      <Reveal><h2>{t("A collection that keeps growing")}</h2>
        <p>{t("Our collection is designed to grow with the things our customers love. Each section has its own place, and every product includes the details that help you choose with confidence.")}</p>
        <p>{t("From the first look to the final delivery, we want every part of the AZ experience to feel considered, reliable and easy.")}</p>
      </Reveal>
      <Reveal><h2>{t("From Cairo, with care")}</h2>
        <p>{t("We serve customers across Egypt and take care with every order. Whether you are choosing a new everyday favorite or finding a gift, our team is here to help.")}</p>
        <p style={{ marginTop: 22 }}><Link className="btn btn--primary" to="/shop">{t("Shop the collection")}</Link></p>
      </Reveal>
    </section>

    <section className="container statement"><Reveal><p>{t("Thoughtful details. A distinct AZ touch.")}</p><small>{t("AZ Store — Cairo")}</small></Reveal></section>
  </>;
}

