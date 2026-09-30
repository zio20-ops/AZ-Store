import { useSeo } from '../hooks/useSeo.js';
import Accordion from '../components/Accordion.jsx';
import { FAQS } from '../data/content.js';

export default function Faq() {
  useSeo('FAQ | AZ Store', 'Delivery times, payment methods, returns, tracking and authenticity — answers from AZ Store.');
  return (
    <div className="container">
      <div className="page-head" style={{ textAlign: 'center' }}>
        <h1>Questions, answered.</h1>
        <p style={{ marginInline: 'auto' }}>Everything shoppers ask us, in one place.</p>
      </div>
      <div className="faq-wrap">
        <Accordion items={FAQS.map((f) => ({ q: f.q, a: f.a }))} />
      </div>
    </div>
  );
}
