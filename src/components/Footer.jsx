import { Link } from 'react-router-dom';
import { FOOTER_COLUMNS, CONTACT_INFO } from '../data/content.js';

const socialIcons = {
  Instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" /></>,
  Facebook: <path d="M14.2 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.2v2.2H8.4V13h2.7v8h3.1Z" fill="currentColor" stroke="none" />,
  TikTok: <path d="M15.4 3h3.1c.2 2 1.4 3.5 3.5 4v3.2a9.4 9.4 0 0 1-3.5-1.1v6.5a6.1 6.1 0 1 1-6.1-6.1c.5 0 1 0 1.5.2V13a3 3 0 1 0 1.5 2.6V3Z" fill="currentColor" stroke="none" />,
  WhatsApp: <><path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.5L3.5 20l.9-4.2a8.5 8.5 0 1 1 16.1-4.1Z" /><path d="M8 7.7c.2-.5.5-.6.9-.6h.5c.2 0 .4.1.5.5l.8 1.9c.1.3.1.5-.1.7l-.6.7c-.2.2-.2.4-.1.6.5.9 1.3 1.7 2.2 2.2.2.1.4.1.6-.1l.8-.9c.2-.2.4-.3.7-.2l1.8.9c.3.1.4.3.4.5 0 .5-.2 1.1-.6 1.5-.5.5-1.2.7-1.9.6-1.1-.1-2.5-.8-3.8-1.9-1.1-1-2.1-2.4-2.4-3.5-.3-1.1.2-2.3.3-2.9Z" fill="currentColor" stroke="none" /></>,
};

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <span className="logo">AZ</span>
            <p>Fine fragrance mists and gift boxes, made in Egypt for every mood you wear.</p>
            <div className="footer__social" aria-label="Follow AZ Store">
              {CONTACT_INFO.filter((c) => socialIcons[c.label] && c.href).map((social) => (
                <a key={social.label} href={social.href} target="_blank" rel="noreferrer noopener" aria-label={social.label} title={social.label}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{socialIcons[social.label]}</svg>
                </a>
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
