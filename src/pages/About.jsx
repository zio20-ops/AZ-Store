import { Link } from 'react-router-dom';
import { useSeo } from '../hooks/useSeo.js';
import { Reveal } from '../hooks/Reveal.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function About() {
  const { t } = useLanguage();
  useSeo('Our story | AZ Store', 'AZ is an Egyptian fragrance house built on one idea: scent is self-expression. Three moods, one you.');

  return (
    <>
      <section className="container about-hero">
        <Reveal>
          <h1>{t('Scent is self-expression.')}</h1>
          <p>
            {t('AZ began in Cairo with a simple frustration: beautiful fragrance was either imported and expensive, or local and forgettable. We wanted a third way — small-batch fine fragrance mists, made here, priced honestly, and dressed like the luxury object they are.')}
          </p>
        </Reveal>
      </section>

      <section className="container about-grid">
        <Reveal as="figure">
          <img src="/images/trio-marble.jpg" alt={t('The three AZ mists standing on black marble with golden smoke')} loading="lazy" />
        </Reveal>
        <Reveal as="figure" className="wide">
          <img src="/images/packaging-box.jpg" alt={t('AZ black gift box with gold monogram on bronze satin')} loading="lazy" />
        </Reveal>
      </section>

      <section className="container about-copy">
        <Reveal>
          <h2>{t('Three moods, one wardrobe')}</h2>
          <p>
            {t('We don’t release twenty scents a season. We release three, and we obsess over them: Through The Night for the calm and the deep, Black Kiss for the bold, Million Dreams for the soft and dreamy. One of them is always you — and some nights, all three are.')}
          </p>
          <p>
            {t('Every mist is 220 ml of skin-safe, alcohol-balanced formula, filled in dated batches and rested before it ships, so the scent you spray in the morning is still with you at night.')}
          </p>
        </Reveal>
        <Reveal>
          <h2>{t('Made to be given')}</h2>
          <p>
            {t('A fragrance is the most personal gift you can give — and the hardest to get right. The AZ trio box solves that: all three moods in one black velvet-touch box, with a thank-you card and a dedication card tucked under the lid.')}
          </p>
          <p>
            {t('From our studio in Cairo to doorsteps across Egypt, every box is packed by hand, sealed, and sent with the same care we would give a gift of our own.')}
          </p>
          <p style={{ marginTop: 22 }}>
            <Link className="btn btn--primary" to="/shop">{t('Shop the collection')}</Link>
          </p>
        </Reveal>
      </section>

      <section className="container statement">
        <Reveal>
          <p>{t('Three moods. One you.')}</p>
          <small>{t('AZ — Bodysplash & Serum')}</small>
        </Reveal>
      </section>
    </>
  );
}
