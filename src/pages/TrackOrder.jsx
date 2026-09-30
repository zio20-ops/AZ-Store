import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { useSeo } from '../hooks/useSeo.js';
import { ORDER_STEPS } from '../data/content.js';
import { egp } from '../utils/format.js';

export default function TrackOrder() {
  useSeo('Track your order | AZ Store', 'Follow your AZ order from received to delivered.');
  const { findOrder } = useStore();
  const [params] = useSearchParams();
  const [orderId, setOrderId] = useState(params.get('order') || '');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    const order = findOrder(orderId, phone);
    if (!order) {
      setResult(null);
      setError('We couldn’t find that order. Check the number and the phone you checked out with.');
      return;
    }
    setError(null);
    setResult(order);
  };

  return (
    <div className="track">
      <h1>Track your order</h1>
      <p>Enter your order number and the phone number used at checkout. Try the demo order AZ-2609-1001 with 01000000000.</p>

      <form className="track__form" onSubmit={submit}>
        <input className="field" placeholder="Order number" value={orderId} aria-label="Order number"
          onChange={(e) => setOrderId(e.target.value)} />
        <input className="field" placeholder="Phone number" value={phone} aria-label="Phone number" inputMode="numeric"
          onChange={(e) => setPhone(e.target.value)} />
        <button className="btn btn--primary" type="submit">Track order</button>
      </form>

      {error && <p className="field-error" role="alert" style={{ textAlign: 'center' }}>{error}</p>}

      {result && (
        <section aria-label="Order progress">
          <p style={{ textAlign: 'center', fontSize: 13, opacity: 0.65, marginBottom: 26 }}>
            {result.id} · {result.name} · {egp(result.total)}
          </p>
          <ol className="steps">
            {result.cancelled ? (
              <li className="step step--done step--cancelled">
                <span className="step__dot" aria-hidden="true">✕</span>
                <div>
                  <div className="step__label">Cancelled</div>
                  <div className="step__date">This order was cancelled. Contact us if you believe this is a mistake.</div>
                </div>
              </li>
            ) : (
              ORDER_STEPS.map((step, i) => {
                const state = i < result.status ? 'done' : i === result.status ? 'now' : 'todo';
                return (
                  <li className={`step step--${state === 'done' ? 'done' : state === 'now' ? 'done step--now' : 'todo'}`} key={step}>
                    <span className="step__dot" aria-hidden="true">{i < result.status ? '✓' : i + 1}</span>
                    <div>
                      <div className="step__label">{step}</div>
                      {state === 'now' && (
                        <div className="step__date">{i === ORDER_STEPS.length - 1 ? 'Completed' : 'Current stage'}</div>
                      )}
                      {state === 'done' && i < result.status && <div className="step__date">Completed</div>}
                    </div>
                  </li>
                );
              })
            )}
          </ol>
          <p style={{ textAlign: 'center', marginTop: 34 }}>
            <Link className="btn btn--text" to="/contact">Need help with this order?</Link>
          </p>
        </section>
      )}
    </div>
  );
}
