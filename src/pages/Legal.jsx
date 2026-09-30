import { useSeo } from '../hooks/useSeo.js';

const COPY = {
  privacy: {
    title: 'Privacy Policy',
    body: [
      'AZ Store collects only the information needed to fulfil your order: your name, phone number, delivery address and, if you provide it, your email address. We use it to deliver your order, send order updates and, if you subscribe, our newsletter.',
      'We never store card numbers, CVV codes or banking passwords. Card payments are handled end-to-end by our PCI-compliant payment partners; wallet and InstaPay payments are verified manually using only the transaction reference you provide.',
      'Your order history is stored on your own device so your bag and tracking stay with you between visits. We do not sell or share personal data with third parties except delivery partners who need your address to reach you.',
      'To delete your data or ask what we hold about you, email care@az-store.eg and we will respond within 30 days.',
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    body: [
      'All prices are in Egyptian pounds and include applicable taxes. Orders are confirmed after payment verification for Vodafone Cash and InstaPay, and immediately for cash on delivery and card.',
      'Unopened products may be returned within 14 days of delivery for a full refund. Damaged or incorrect orders must be reported within 48 hours of delivery for a free replacement.',
      'Delivery estimates (2 to 4 days standard, next day express) begin once an order is confirmed. Forces outside our control — weather, national holidays, carrier strikes — may extend these windows.',
      'By placing an order you agree to provide accurate delivery and contact information. AZ Store reserves the right to refuse or cancel orders where information cannot be verified.',
    ],
  },
};

export default function Legal({ kind }) {
  const c = COPY[kind] || COPY.privacy;
  useSeo(`${c.title} | AZ Store`, `${c.title} for AZ Store shoppers in Egypt.`);
  return (
    <div className="container">
      <div className="page-head">
        <h1>{c.title}</h1>
      </div>
      <div className="faq-wrap" style={{ paddingTop: 20 }}>
        {c.body.map((p) => <p key={p.slice(0, 24)} style={{ opacity: 0.75, marginBottom: 16 }}>{p}</p>)}
      </div>
    </div>
  );
}
