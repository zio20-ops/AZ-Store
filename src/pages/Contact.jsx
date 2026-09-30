import { useState } from 'react';
import { useStore } from '../store/StoreContext.jsx';
import { useSeo } from '../hooks/useSeo.js';
import { CONTACT_INFO } from '../data/content.js';
import { isValidEmail } from '../utils/format.js';

export default function Contact() {
  useSeo('Contact | AZ Store', 'Questions about an order, a scent or a gift? Talk to the AZ care team.');
  const { toast } = useStore();
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [errors, setErrors] = useState({});

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (form.name.trim().length < 2) er.name = 'Please tell us your name.';
    if (!isValidEmail(form.email)) er.email = 'Enter a valid email address.';
    if (form.message.trim().length < 10) er.message = 'Tell us a little more (at least 10 characters).';
    setErrors(er);
    if (Object.keys(er).length) return;
    setForm({ name: '', email: '', phone: '', message: '' });
    toast('Message sent — we’ll reply within 24 hours');
  };

  const cls = (k) => `field ${errors[k] ? 'field--error' : ''}`;

  return (
    <div className="container">
      <div className="page-head">
        <h1>We’re listening.</h1>
        <p>Order questions, scent advice, gift help — the AZ care team answers every message, usually within a day.</p>
      </div>

      <div className="two-col">
        <form onSubmit={submit} noValidate>
          <div className="co__fields">
            <div>
              <input className={cls('name')} placeholder="Name" value={form.name} onChange={set('name')} aria-label="Name" />
              {errors.name && <p className="field-error" role="alert">{errors.name}</p>}
            </div>
            <div>
              <input className={cls('email')} placeholder="Email" type="email" value={form.email} onChange={set('email')} aria-label="Email" />
              {errors.email && <p className="field-error" role="alert">{errors.email}</p>}
            </div>
            <input className="field" placeholder="Phone" value={form.phone} onChange={set('phone')} aria-label="Phone" inputMode="numeric" />
            <div>
              <textarea className={cls('message')} placeholder="Message" rows={4} value={form.message} onChange={set('message')} aria-label="Message" />
              {errors.message && <p className="field-error" role="alert">{errors.message}</p>}
            </div>
          </div>
          <button className="btn btn--primary" type="submit" style={{ marginTop: 24 }}>Send message</button>
        </form>

        <div className="info-list">
          {CONTACT_INFO.map((c) => (
            <a key={c.label} href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer noopener">
              <span>{c.label}</span>
              <span>{c.value}</span>
            </a>
          ))}
          <div><span>Hours</span><span>Sat to Thu, 10:00 – 20:00</span></div>
        </div>
      </div>
    </div>
  );
}
