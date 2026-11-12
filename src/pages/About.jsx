import { useLanguage } from '../i18n/LanguageContext.jsx';
import { Link } from 'react-router-dom';
import { useSeo } from '../hooks/useSeo.js';
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
      <Reveal as="figure"><img src="/images/trio-marble.jpg" alt={t("A carefully styled AZ collection on dark marble")} loading="lazy" /></Reveal>
      <Reveal as="figure" className="wide"><img src="/images/packaging-box.jpg" alt={t("AZ packaging with a gold monogram on bronze satin")} loading="lazy" /></Reveal>
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
