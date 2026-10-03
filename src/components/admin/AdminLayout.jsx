import { useEffect, useState } from 'react';
import { NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import * as auth from '../../services/authService.js';
import '../../styles/admin.css';
import LanguageToggle from '../LanguageToggle.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true, icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
  { to: '/admin/products', label: 'Products', icon: 'M20 7l-8-4-8 4v10l8 4 8-4V7zm-8 2L6 6l6-3 6 3-6 3zm-6 .8l6 3v7.4l-6-3V8.8zm8 9.4v-7.4l6-3v7.4l-6 3z' },
  { to: '/admin/orders', label: 'Orders', icon: 'M7 3h10v2H7V3zm-2 4h14v14H5V7zm2 3v2h10v-2H7zm0 4v2h7v-2H7z' },
  { to: '/admin/categories', label: 'Categories', icon: 'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z' },
  { to: '/admin/inventory', label: 'Inventory', icon: 'M3 5h18v4H3V5zm0 6h18v4H3v-4zm0 6h18v4H3v-4z' },
  { to: '/admin/customers', label: 'Customers', icon: 'M8 10a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm8 1a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM2 20c0-3.3 2.7-6 6-6s6 2.7 6 6v1H2v-1zm14 1v-1c0-1.8-.8-3.4-2-4.5.6-.3 1.3-.5 2-.5 2.8 0 5 2.2 5 5v1h-5z' },
  { to: '/admin/settings', label: 'Settings', icon: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm9 4a9 9 0 0 1-.1 1.3l2 1.6-2 3.4-2.4-1a9 9 0 0 1-2.2 1.3L15.9 21H8.1l-.4-2.4a9 9 0 0 1-2.2-1.3l-2.4 1-2-3.4 2-1.6A9 9 0 0 1 3 12c0-.4 0-.9.1-1.3l-2-1.6 2-3.4 2.4 1a9 9 0 0 1 2.2-1.3L8.1 3h7.8l.4 2.4a9 9 0 0 1 2.2 1.3l2.4-1 2 3.4-2 1.6c.1.4.1.9.1 1.3z' },
];

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={d} /></svg>
);

export default function AdminLayout({ title, actions, children }) {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState(() => auth.me());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  const onLogout = async () => {
    await auth.logout();
    setSession(null);
    navigate('/admin/login');
  };

  return (
    <div className="ad">
      <div className={`ad__scrim ${menuOpen ? 'ad__scrim--on' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <aside className={`ad__side ${menuOpen ? 'ad__side--open' : ''}`} aria-label={t('Admin navigation')}>
        <div className="ad__brand">AZ<small>{t('Admin Portal')}</small></div>
        <nav className="ad__nav">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              <Icon d={item.icon} />
              {t(item.label)}
            </NavLink>
          ))}
        </nav>
        <div className="ad__side-foot">
          <div className="ad__profile">
            <b>{session.name}</b>
            {session.email}
          </div>
          <button className="btn btn--text" style={{ justifyContent: 'flex-start', paddingInline: 12 }} onClick={onLogout}>
            {t('Logout')}
          </button>
        </div>
      </aside>

      <div className="ad__main">
        <header className="ad__top">
          <button className="ad__menu-btn" onClick={() => setMenuOpen(true)} aria-label={t('Open admin menu')}>{t('Menu')}</button>
          <h1>{t(title)}</h1>
          <div className="ad__top-right">
            <LanguageToggle />
            {actions}
            <NavLink to="/" className="btn btn--text">{t('View store')}</NavLink>
          </div>
        </header>
        <main className="ad__content">{children}</main>
      </div>
    </div>
  );
}
