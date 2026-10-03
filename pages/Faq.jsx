import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSeo } from '../hooks/useSeo.js';
import Accordion from '../components/Accordion.jsx';
import { FAQS } from '../data/content.js';

export default function Faq() {
  const { t } = useLanguage();
  const location = useLocation();
  useSeo('FAQ | AZ Store', 'Delivery times, payment methods, returns and authenticity — answers from AZ Store.');
  const returnQuestions = FAQS.filter((item) => item.q === 'Can I return a product?');
  const shippingQuestions = FAQS.filter((item) => item.q === 'How long does delivery take?' || item.q === 'Do you deliver across Egypt?');
  const commonQuestions = FAQS.filter((item) => !['Can I return a product?', 'How long does delivery take?', 'Do you deliver across Egypt?'].includes(item.q));
  useEffect(() => {
    if (!location.hash) return undefined;
    const frame = requestAnimationFrame(() => document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [location.hash]);
  return (
    <div className="container">
      <div className="page-head" style={{ textAlign: 'center' }}>
        <h1>{t("Questions, answered.")}</h1>
        <p style={{ marginInline: 'auto' }}>{t("Everything shoppers ask us, in one place.")}</p>
      </div>
      <section id="returns" className="faq-wrap faq-wrap--section">
        <h2>{t("Returns & Refunds")}</h2>
        <Accordion items={returnQuestions.map((f) => ({ q: f.q, a: f.a }))} />
      </section>
      <section id="shipping" className="faq-wrap faq-wrap--section">
        <h2>{t("Shipping & Delivery")}</h2>
        <Accordion items={shippingQuestions.map((f) => ({ q: f.q, a: f.a }))} />
      </section>
      <section id="faq" className="faq-wrap faq-wrap--section">
        <h2>{t("Frequently asked questions")}</h2>
        <Accordion items={commonQuestions.map((f) => ({ q: f.q, a: f.a }))} />
      </section>
    </div>
  );
}
