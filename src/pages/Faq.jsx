import { useSeo } from '../hooks/useSeo.js';
import Accordion from '../components/Accordion.jsx';
import { FAQS } from '../data/content.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function Faq() {
  const { t } = useLanguage();
  useSeo('FAQ | AZ Store', 'Delivery times, payment methods, returns and authenticity — answers from AZ Store.');
  return (
    <div className="container">
      <div className="page-head" style={{ textAlign: 'center' }}>
        <h1>{t('Questions, answered.')}</h1>
        <p style={{ marginInline: 'auto' }}>{t('Everything shoppers ask us, in one place.')}</p>
      </div>
      <div className="faq-wrap">
        <Accordion items={FAQS.map((f) => ({ q: t(f.q), a: t(f.a) }))} />
      </div>
    </div>
  );
}
