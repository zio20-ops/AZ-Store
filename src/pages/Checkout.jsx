import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { useSeo } from '../hooks/useSeo.js';
import { DELIVERY_METHODS, PAYMENT_METHODS } from '../data/products.js';
import { GOVERNORATES } from '../data/content.js';
import { egp, isValidEgyptPhone, isValidEmail } from '../utils/format.js';
import * as auth from '../services/authService.js';

const initialForm = {
  name: '', phone: '', email: '', governorate: '', city: '',
  address: '', apartment: '', notes: '',
};

export default function Checkout() {
  useSeo('Checkout | AZ Store', 'Choose a payment method and complete your AZ Store order.');
  const { cart, subtotal, discount, promo, freeThreshold, settings, placeOrder } = useStore();
  const navigate = useNavigate();

  const [form, setForm] = useState(() => {
    const user = auth.getCurrentUser();
    return { ...initialForm, name: user?.name === user?.email ? '' : (user?.name || ''), email: user?.email || '' };
  });
  const [errors, setErrors] = useState({});
  const [deliveryId, setDeliveryId] = useState('standard');
  const [paymentId, setPaymentId] = useState('cod');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentProof, setPaymentProof] = useState(null);
  const [proofError, setProofError] = useState('');
  const [compressingProof, setCompressingProof] = useState(false);
  const [placing, setPlacing] = useState(false);

  const method = DELIVERY_METHODS.find((m) => m.id === deliveryId);
  const deliveryFee = useMemo(() => {
    if (promo?.type === 'shipping') return 0;
    if (deliveryId === 'standard' && subtotal >= freeThreshold) return 0;
    return method.price;
  }, [deliveryId, subtotal, freeThreshold, method, promo]);

  const total = subtotal - discount + deliveryFee;
  const payment = PAYMENT_METHODS.find((p) => p.id === paymentId);
  const paymentOptions = PAYMENT_METHODS.filter((p) => settings.paymentMethods?.[p.id]?.enabled ?? p.id === 'cod');
  const paymentConfig = settings.paymentMethods?.[paymentId] || {};

  useEffect(() => {
    if (paymentOptions.length && !paymentOptions.some((p) => p.id === paymentId)) setPaymentId(paymentOptions[0].id);
  }, [paymentId, paymentOptions]);

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
    if (paymentId !== 'cod' && paymentRef.trim().length < 4 && !paymentProof) er.paymentRef = 'Add a transfer reference or upload a payment screenshot.';
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      document.querySelector('.field--error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setPlacing(true);
    try {
      const order = await placeOrder({
        name: form.name.trim(),
        phone: form.phone.replace(/\s/g, ''),
        email: form.email.trim(),
        payment: payment.label,
        paymentMethod: paymentId,
        paymentRef: paymentId === 'cod' ? '' : paymentRef.trim(),
        paymentProof: paymentId === 'cod' ? null : paymentProof?.dataUrl || null,
        deliveryMethod: `${method.label}, ${method.eta.toLowerCase()}`,
        deliveryOption: deliveryId,
        promoCode: promo?.code || '',
        delivery: deliveryFee,
        address: [form.address.trim(), form.apartment.trim(), form.city.trim(), form.governorate].filter(Boolean).join(', '),
        notes: form.notes.trim(),
      });
      navigate('/order-confirmation', { state: { id: order.id, order } });
    } catch (error) {
      setErrors((old) => ({ ...old, submit: error.message || 'Unable to save the order. Please try again.' }));
    } finally { setPlacing(false); }
  };

  const selectPaymentProof = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setProofError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setProofError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    setCompressingProof(true);
    try {
      const image = await createImageBitmap(file);
      const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();
      let quality = 0.82;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > 600_000 && quality > 0.48) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      if (dataUrl.length > 600_000) throw new Error('The screenshot is too large. Please choose a smaller image.');
      setPaymentProof({ dataUrl, name: file.name });
      setErrors((previous) => ({ ...previous, paymentRef: undefined }));
    } catch (error) {
      setPaymentProof(null);
      setProofError(error.message || 'Could not read this image. Please choose another one.');
    } finally { setCompressingProof(false); }
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
          <span>Checkout</span>
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
          {paymentOptions.length > 0 ? <div className="opts opts--3" role="radiogroup" aria-label="Payment method">
            {paymentOptions.map((p) => (
              <button type="button" key={p.id} className={`opt ${paymentId === p.id ? 'opt--on' : ''}`}
                role="radio" aria-checked={paymentId === p.id} onClick={() => setPaymentId(p.id)}>
                {p.label}
                <small>{p.note}</small>
              </button>
            ))}
          </div> : <p className="field-error">The store has no payment method enabled. Contact the store owner.</p>}

          {paymentId === 'instapay' && <div className="paynote">
            <p>Transfer <b>{egp(total)}</b> to this InstaPay account:</p>
            <p><code>{paymentConfig.account}</code>{paymentConfig.accountName ? ` · ${paymentConfig.accountName}` : ''}</p>
            <small>After the transfer succeeds, copy the transaction ID or reference shown on the InstaPay receipt. It is not your order number or account number.</small>
            <label className="co__fields">Transaction ID / reference<input className="field" value={paymentRef} onChange={(e) => { setPaymentRef(e.target.value); setErrors({ ...errors, paymentRef: undefined }); }} placeholder="From the successful transfer receipt" /></label>
            {errors.paymentRef && <p className="field-error">{errors.paymentRef}</p>}
            <label className="co__fields">Payment screenshot (optional)<input className="field" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPaymentProof} /></label>
            {compressingProof && <small>Preparing screenshot…</small>}
            {paymentProof && <div className="paynote__proof"><img src={paymentProof.dataUrl} alt="Selected InstaPay transfer receipt" /><span>{paymentProof.name}</span><button type="button" onClick={() => setPaymentProof(null)}>Remove image</button></div>}
            {proofError && <p className="field-error">{proofError}</p>}
            <small>Add the reference, screenshot, or both. At least one is required.</small>
            <small>The store will confirm your transfer manually before preparing the order.</small>
          </div>}

          {paymentId === 'vodafone' && <div className="paynote">
            <p>Transfer <b>{egp(total)}</b> to this Vodafone Cash number:</p>
            <p><code>{paymentConfig.number}</code></p>
            <small>After the transfer succeeds, copy the transaction ID or reference shown in the Vodafone Cash confirmation message or receipt. It is not your order number or phone number.</small>
            <label className="co__fields">Transaction ID / reference<input className="field" value={paymentRef} onChange={(e) => { setPaymentRef(e.target.value); setErrors({ ...errors, paymentRef: undefined }); }} placeholder="From the successful transfer receipt" /></label>
            {errors.paymentRef && <p className="field-error">{errors.paymentRef}</p>}
            <label className="co__fields">Payment screenshot (optional)<input className="field" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPaymentProof} /></label>
            {compressingProof && <small>Preparing screenshot…</small>}
            {paymentProof && <div className="paynote__proof"><img src={paymentProof.dataUrl} alt="Selected Vodafone Cash transfer receipt" /><span>{paymentProof.name}</span><button type="button" onClick={() => setPaymentProof(null)}>Remove image</button></div>}
            {proofError && <p className="field-error">{proofError}</p>}
            <small>Add the reference, screenshot, or both. At least one is required.</small>
            <small>The store will confirm your transfer manually before preparing the order.</small>
          </div>}

          {errors.submit && <p className="field-error" role="alert">{errors.submit}</p>}

          <button className="btn btn--dark btn--lg" type="submit" style={{ marginTop: 30 }} disabled={placing || compressingProof || paymentOptions.length === 0}>
            {compressingProof ? 'Preparing screenshot…' : placing ? 'Placing order…' : `Place order · ${egp(total)}`}
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
          <p className="sum__note">Prices in Egyptian pounds. {paymentId === 'cod' ? 'Pay the courier when your order arrives.' : 'Your transfer will be manually verified by the store.'}</p>
        </aside>
      </div>
    </>
  );
}
