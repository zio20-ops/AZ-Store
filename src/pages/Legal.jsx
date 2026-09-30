import { useSeo } from '../hooks/useSeo.js';

const COPY = {
  privacy: {
    title: 'Privacy Policy',
    body: [
      'AZ Store collects only the information needed to fulfil your order: your name, phone number, delivery address and, if you provide it, your email address. We use it to deliver your order, send order updates and, if you subscribe, our newsletter.',
      'Depending on the options enabled by the store, you may pay cash on delivery or transfer manually through InstaPay or Vodafone Cash. For manual transfers, we record the reference you submit so the store can verify the payment. AZ Store does not collect card numbers, CVV codes, banking passwords, or online payment credentials.',
      'Order information is stored in the AZ Store Firebase database so the store administrator can fulfil orders and customers can check delivery status. Delivery details may be shared with the delivery provider to complete your order.',
      'To delete your data or ask what we hold about you, email azstore700@gmail.com and we will respond within 30 days.',
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    body: [
      'All prices are shown in Egyptian pounds. Orders are subject to confirmation by the store. Manual InstaPay and Vodafone Cash transfers must be verified by the store before the order is prepared.',
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
