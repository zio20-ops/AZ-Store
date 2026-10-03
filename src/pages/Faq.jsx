import { useSeo } from '../hooks/useSeo.js';
import Accordion from '../components/Accordion.jsx';
import { FAQS } from '../data/content.js';

export default function Faq() {
  useSeo('FAQ | AZ Store', 'Delivery times, payment methods, returns and authenticity — answers from AZ Store.');
  const returnQuestions = FAQS.filter((item) => item.q === 'Can I return a product?');
  const commonQuestions = FAQS.filter((item) => item.q !== 'Can I return a product?');
  return (
    <div className="container">
      <div className="page-head" style={{ textAlign: 'center' }}>
        <h1>Questions, answered.</h1>
        <p style={{ marginInline: 'auto' }}>Everything shoppers ask us, in one place.</p>
      </div>
      <section id="returns" className="faq-wrap faq-wrap--section">
        <h2>Returns &amp; Refunds</h2>
        <Accordion items={returnQuestions.map((f) => ({ q: f.q, a: f.a }))} />
      </section>
      <section className="faq-wrap faq-wrap--section">
        <h2>Frequently asked questions</h2>
        <Accordion items={commonQuestions.map((f) => ({ q: f.q, a: f.a }))} />
      </section>
    </div>
  );
}
