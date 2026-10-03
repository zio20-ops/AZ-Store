import { useState } from 'react';
import { useSeo } from '../hooks/useSeo.js';
import { CONTACT_INFO } from '../data/content.js';
import { isValidEmail } from '../utils/format.js';

export default function Contact() {
  useSeo('Contact | AZ Store', 'Questions about an order, a scent or a gift? Talk to the AZ care team.');
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('');

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
    setStatus('');
  };

  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (form.name.trim().length < 2) er.name = 'Please tell us your name.';
    if (!isValidEmail(form.email)) er.email = 'Enter a valid email address.';
    if (form.message.trim().length < 10) er.message = 'Tell us a little more (at least 10 characters).';
    setErrors(er);
    if (Object.keys(er).length) return;
    const subject = `AZ Store contact from ${form.name.trim()}`;
    const body = [
      `Name: ${form.name.trim()}`,
      `Email: ${form.email.trim()}`,
      form.phone.trim() ? `Phone: ${form.phone.trim()}` : '',
      '',
      form.message.trim(),
    ].filter(Boolean).join('\n');
    window.location.href = `mailto:azstore700@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setStatus('Your email app is opening with the message. Press Send there to deliver it to AZ Store.');
  };

  const cls = (k) => `field ${errors[k] ? 'field--error' : ''}`;

  return (
    <div className="container">
      <div className="page-head">
        <h1>We’re listening.</h1>
        <p>Order questions, scent advice, gift help — the AZ care team answers every message, usually within a day.</p>
      </div>

      <div className="two-col">
        <form onSubmit={submit} method="post" noValidate>
          <div className="co__fields">
            <div>
              <input className={cls('name')} name="name" placeholder="Name" value={form.name} onChange={set('name')} aria-label="Name" required minLength={2} aria-invalid={Boolean(errors.name)} />
              {errors.name && <p className="field-error" role="alert">{errors.name}</p>}
            </div>
            <div>
              <input className={cls('email')} name="email" placeholder="Email" type="email" value={form.email} onChange={set('email')} aria-label="Email" required aria-invalid={Boolean(errors.email)} />
              {errors.email && <p className="field-error" role="alert">{errors.email}</p>}
            </div>
            <input className="field" name="phone" placeholder="Phone (optional)" value={form.phone} onChange={set('phone')} aria-label="Phone" inputMode="tel" />
            <div>
              <textarea className={cls('message')} name="message" placeholder="Message" rows={4} value={form.message} onChange={set('message')} aria-label="Message" required minLength={10} aria-invalid={Boolean(errors.message)} />
              {errors.message && <p className="field-error" role="alert">{errors.message}</p>}
            </div>
          </div>
          <button className="btn btn--primary" type="submit" style={{ marginTop: 24 }}>Send message</button>
          {status && <p role="status" className="field-hint">{status}</p>}
        </form>

        <div className="info-list">
          {CONTACT_INFO.map((c) => c.href ? (
            <a key={c.label} href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer noopener">
              <span>{c.label}</span>
              <span>{c.value}</span>
            </a>
          ) : <div key={c.label}><span>{c.label}</span><span>{c.value}</span></div>)}
          <div><span>Hours</span><span>Sat to Thu, 10:00 – 20:00</span></div>
        </div>
      </div>
    </div>
  );
}
