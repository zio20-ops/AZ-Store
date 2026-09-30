import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { useSeo } from '../hooks/useSeo.js';
import { DELIVERY_METHODS, PAYMENT_METHODS } from '../data/products.js';
import { GOVERNORATES, VODAFONE_CASH_NUMBER, INSTAPAY_ACCOUNT } from '../data/content.js';
import { egp, isValidEgyptPhone, isValidEmail } from '../utils/format.js';

const initialForm = {
  name: '', phone: '', email: '', governorate: '', city: '',
  address: '', apartment: '', notes: '',
};

export default function Checkout() {
  useSeo('Secure checkout | AZ Store', 'Complete your AZ order with delivery across Egypt and cash on delivery, card, Vodafone Cash or InstaPay.');
  const { cart, subtotal, discount, promo, freeThreshold, placeOrder } = useStore();
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [deliveryId, setDeliveryId] = useState('standard');
  const [paymentId, setPaymentId] = useState('cod');
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '' });
  const [walletRef, setWalletRef] = useState('');
  const [instapayRef, setInstapayRef] = useState('');
  const [placing, setPlacing] = useState(false);

  const method = DELIVERY_METHODS.find((m) => m.id === deliveryId);
  const deliveryFee = useMemo(() => {
    if (deliveryId === 'standard' && subtotal >= freeThreshold) return 0;
    return method.price;
  }, [deliveryId, subtotal, freeThreshold, method]);

  const total = subtotal - discount + deliveryFee;
  const payment = PAYMENT_METHODS.find((p) => p.id === paymentId);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const validate = () => {
    const er = {};
    if (form.name.trim().length < 3) er.name = 'Please enter your full name.';
    if (!isValidEgyptPhone(form.phone)) er.phone = 'Enter a valid Egyptian mobile number (e.g. 01012345678).';
    if (form.email && !isValidEmail(form.email)) er.email = 'That email address doesn’t look right.';
    if (!form.governorate) er.governorate = 'Choose your governorate.';
    if (!form.city.trim()) er.city = 'Please enter your city.';
    if (form.address.trim().length < 8) er.address = 'Please enter your full street address.';
    if (paymentId === 'card') {
      if (card.number.replace(/\s/g, '').length !== 16) er.card = 'Card number must be 16 digits.';
      else if (!/^\d{2}\/\d{2}$/.test(card.expiry)) er.card = 'Expiry must be MM/YY.';
      else if (!/^\d{3,4}$/.test(card.cvv)) er.card = 'CVV must be 3 or 4 digits.';
    }
    if (paymentId === 'vodafone' && walletRef.trim().length < 6) er.wallet = 'Enter the transaction reference number.';
    if (paymentId === 'instapay' && instapayRef.trim().length < 6) er.instapay = 'Enter the transaction reference number.';
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validate()) {
      document.querySelector('.field--error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setPlacing(true);
    setTimeout(() => {
      const order = placeOrder({
        name: form.name.trim(),
        phone: form.phone.replace(/\s/g, ''),
        email: form.email.trim(),
        payment: payment.label,
        paymentRef: paymentId === 'vodafone' ? walletRef.trim() : paymentId === 'instapay' ? instapayRef.trim() : null,
        deliveryMethod: `${method.label}, ${method.eta.toLowerCase()}`,
        delivery: deliveryFee,
        address: [form.address.trim(), form.apartment.trim(), form.city.trim(), form.governorate].filter(Boolean).join(', '),
        notes: form.notes.trim(),
      });
      navigate('/order-confirmation', { state: { id: order.id } });
    }, 700);
  };

  if (cart.length === 0) {
    return (
      <div className="confirm">
        <h1>Your bag is empty.</h1>
        <p>Add a scent or two before checking out.</p>
        <div className="confirm__actions">
          <Link className="btn btn--dark" to="/shop">Shop all</Link>
        </div>
      </div>
    );
  }

  const fieldClass = (key) => `field ${errors[key] ? 'field--error' : ''}`;

  return (
    <>
      <div className="cohead">
        <Link to="/" className="logo" aria-label="AZ Store home">AZ</Link>
        <span>Secure checkout</span>
        <Link to="/cart">Back to bag</Link>
      </div>

      <div className="container co">
        <form onSubmit={submit} noValidate>
          <h2>Delivery</h2>
          <div className="co__fields">
            <div>
              <input className={fieldClass('name')} placeholder="Full name" value={form.name} onChange={set('name')} aria-label="Full name" autoComplete="name" />
              {errors.name && <p className="field-error" role="alert">{errors.name}</p>}
            </div>
            <div>
              <input className={fieldClass('phone')} placeholder="Phone number" value={form.phone} onChange={set('phone')} aria-label="Phone number" inputMode="numeric" autoComplete="tel" />
              {errors.phone && <p className="field-error" role="alert">{errors.phone}</p>}
            </div>
            <div>
              <input className={fieldClass('email')} placeholder="Email address" value={form.email} onChange={set('email')} aria-label="Email address" type="email" autoComplete="email" />
              {errors.email && <p className="field-error" role="alert">{errors.email}</p>}
            </div>
            <div className="co__grid2">
              <div>
                <select className={fieldClass('governorate')} value={form.governorate} onChange={set('governorate')} aria-label="Governorate">
                  <option value="">Governorate</option>
                  {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                {errors.governorate && <p className="field-error" role="alert">{errors.governorate}</p>}
              </div>
              <div>
                <input className={fieldClass('city')} placeholder="City" value={form.city} onChange={set('city')} aria-label="City" />
                {errors.city && <p className="field-error" role="alert">{errors.city}</p>}
              </div>
            </div>
            <div>
              <input className={fieldClass('address')} placeholder="Full address" value={form.address} onChange={set('address')} aria-label="Full address" autoComplete="street-address" />
              {errors.address && <p className="field-error" role="alert">{errors.address}</p>}
            </div>
            <input className="field" placeholder="Apartment / Building" value={form.apartment} onChange={set('apartment')} aria-label="Apartment or building" />
            <textarea className="field" placeholder="Additional notes" value={form.notes} onChange={set('notes')} aria-label="Additional notes" rows={2} />
          </div>

          <h5>Delivery method</h5>
          <div className="opts opts--3" role="radiogroup" aria-label="Delivery method">
            {DELIVERY_METHODS.map((m) => {
              const free = m.id === 'standard' && subtotal >= freeThreshold;
              return (
                <button type="button" key={m.id} className={`opt ${deliveryId === m.id ? 'opt--on' : ''}`}
                  role="radio" aria-checked={deliveryId === m.id} onClick={() => setDeliveryId(m.id)}>
                  {m.label}, {m.eta.toLowerCase()}
                  <b>{free ? 'Free' : egp(m.price)}</b>
                </button>
              );
            })}
          </div>

          <h5>Payment</h5>
          <div className="opts opts--4" role="radiogroup" aria-label="Payment method">
            {PAYMENT_METHODS.map((p) => (
              <button type="button" key={p.id} className={`opt ${paymentId === p.id ? 'opt--on' : ''}`}
                role="radio" aria-checked={paymentId === p.id} onClick={() => setPaymentId(p.id)}>
                {p.label}
                <small>{p.note}</small>
              </button>
            ))}
          </div>

          {paymentId === 'card' && (
            <div className="paynote">
              <div className="co__fields" style={{ marginTop: 10 }}>
                <input className={`field ${errors.card ? 'field--error' : ''}`} placeholder="Card number" inputMode="numeric"
                  value={card.number} aria-label="Card number"
                  onChange={(e) => { setCard({ ...card, number: e.target.value.replace(/[^\d]/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ') }); setErrors({ ...errors, card: undefined }); }} />
                <div className="co__grid2">
                  <input className="field" placeholder="MM/YY" value={card.expiry} aria-label="Card expiry date"
                    onChange={(e) => {
                      let v = e.target.value.replace(/[^\d]/g, '').slice(0, 4);
                      if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
                      setCard({ ...card, expiry: v });
                    }} />
                  <input className="field" placeholder="CVV" inputMode="numeric" value={card.cvv} aria-label="Card CVV"
                    onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/[^\d]/g, '').slice(0, 4) })} />
                </div>
              </div>
              {errors.card && <p className="field-error" role="alert">{errors.card}</p>}
              <p>Your card is charged directly by our PCI-compliant payment partner (Paymob / Fawry). AZ never stores your card number, CVV or any password.</p>
            </div>
          )}

          {paymentId === 'vodafone' && (
            <div className="paynote">
              <p>Send the order amount to our Vodafone Cash number:</p>
              <p><code>{VODAFONE_CASH_NUMBER}</code></p>
              <div className="co__fields" style={{ marginTop: 12 }}>
                <input className={`field ${errors.wallet ? 'field--error' : ''}`} placeholder="Transaction Reference Number"
                  value={walletRef} aria-label="Transaction reference number"
                  onChange={(e) => { setWalletRef(e.target.value); setErrors({ ...errors, wallet: undefined }); }} />
              </div>
              {errors.wallet && <p className="field-error" role="alert">{errors.wallet}</p>}
              <p>Your order will be confirmed after payment verification.</p>
            </div>
          )}

          {paymentId === 'instapay' && (
            <div className="paynote">
              <p>Transfer the order amount through InstaPay to our official account:</p>
              <p><code>{INSTAPAY_ACCOUNT}</code></p>
              <div className="co__fields" style={{ marginTop: 12 }}>
                <input className={`field ${errors.instapay ? 'field--error' : ''}`} placeholder="Transaction / reference number"
                  value={instapayRef} aria-label="Transaction reference number"
                  onChange={(e) => { setInstapayRef(e.target.value); setErrors({ ...errors, instapay: undefined }); }} />
                <input className="field" placeholder="Your phone number" value={form.phone} aria-label="Customer phone number" onChange={set('phone')} />
              </div>
              {errors.instapay && <p className="field-error" role="alert">{errors.instapay}</p>}
              <p>Your order will be confirmed after payment verification.</p>
            </div>
          )}

          <button className="btn btn--dark btn--lg" type="submit" style={{ marginTop: 30 }} disabled={placing}>
            {placing ? 'Placing order…' : `Place order · ${egp(total)}`}
          </button>
        </form>

        <aside className="sum" aria-label="Order summary">
          <h2>Order summary</h2>
          {cart.map((l) => (
            <div className="sum__row" key={l.key}>
              <span>{l.product.name} × {l.qty}</span>
              <span>{egp(l.price * l.qty)}</span>
            </div>
          ))}
          <div className="sum__row"><span>Delivery</span><span>{deliveryFee === 0 ? 'Free' : egp(deliveryFee)}</span></div>
          {promo && (
            <div className="sum__row">
              <span>Promo {promo.code}</span>
              <span className="sum__discount">−{egp(discount)}</span>
            </div>
          )}
          <div className="sum__total"><span>Total</span><span>{egp(total)}</span></div>
          <p className="sum__note">Prices in Egyptian pounds. Card payments are processed by our secure payment partner — we never store card data.</p>
        </aside>
      </div>
    </>
  );
}
