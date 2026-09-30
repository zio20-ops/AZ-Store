import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FOOTER_COLUMNS, CONTACT_INFO } from '../data/content.js';
import { useStore } from '../store/StoreContext.jsx';
import { isValidEmail } from '../utils/format.js';

export default function Footer() {
  const { toast } = useStore();
  const [email, setEmail] = useState('');

  const subscribe = (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      toast('Please enter a valid email address');
      return;
    }
    setEmail('');
    toast('Welcome to the AZ community');
  };

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <span className="logo">AZ</span>
            <p>Fine fragrance mists and gift boxes, made in Egypt for every mood you wear.</p>
            <form className="news" onSubmit={subscribe}>
              <input
                className="field"
                type="email"
                placeholder="Join our beauty community"
                value={email}
                aria-label="Email address for newsletter"
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="btn btn--primary" type="submit" style={{ padding: '10px 18px' }}>Subscribe</button>
            </form>
            <div className="footer__social">
              {CONTACT_INFO.filter((c) => ['Instagram', 'Facebook', 'TikTok', 'WhatsApp'].includes(c.label)).map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer noopener">{s.label}</a>
              ))}
            </div>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.to.startsWith('http') ? (
                      <a href={l.to} target="_blank" rel="noreferrer noopener">{l.label}</a>
                    ) : (
                      <Link to={l.to}>{l.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer__base">
          <span>© 2026 AZ Store — Bodysplash &amp; Serum. All rights reserved.</span>
          <span>Three moods. One you.</span>
        </div>
      </div>
    </footer>
  );
}
