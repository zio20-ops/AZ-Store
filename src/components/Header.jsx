import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { NAV_LINKS } from '../data/content.js';
import * as auth from '../services/authService.js';
import { AccountIcon, BagIcon, SearchIcon } from './icons.jsx';
import LanguageToggle from './LanguageToggle.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function Header() {
  const { t } = useLanguage();
  const { count, setCartOpen, setSearchOpen, announcement } = useStore();
  const [accountOpen, setAccountOpen] = useState(false);
  const [user, setUser] = useState(() => auth.getCurrentUser());
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const accountRef = useRef(null);

  useEffect(() => {
    setAccountOpen(false);
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const update = () => setUser(auth.getCurrentUser());
    window.addEventListener('az-auth-changed', update);
    return () => window.removeEventListener('az-auth-changed', update);
  }, []);

  useEffect(() => {
    if (!accountOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!accountRef.current?.contains(event.target)) setAccountOpen(false);
    };
    const closeOnEscape = (event) => { if (event.key === 'Escape') setAccountOpen(false); };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [accountOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <>
      <p className="ann">{t(announcement)}</p>
      <header className="header">
        <div className="header__in">
          <Link to="/" className="logo logo--header" aria-label={t('AZ Store home')}>AZ</Link>

          <nav className="header__nav" aria-label={t('Primary')}>
            {NAV_LINKS.map((l) => (
              <NavLink key={l.label} to={l.to} className={({ isActive }) => (isActive && !l.to.includes('?') ? 'active' : '')}>
                {t(l.label)}
              </NavLink>
            ))}
          </nav>

          <div className="header__icons">
            <LanguageToggle className="desktop-only" />
            <button className="header__icon-btn desktop-only" onClick={() => setSearchOpen(true)} aria-label={t('Search products')} title={t('Search')}>
              <SearchIcon />
            </button>
            <div className="account desktop-only" ref={accountRef}>
              <button className="header__icon-btn" aria-label={t('Account menu')} title={t('Account')} aria-haspopup="true" aria-expanded={accountOpen} onClick={() => setAccountOpen((v) => !v)}>
                <AccountIcon />
              </button>
              {accountOpen && (
                <div className="account__panel" role="menu">
                  <Link to="/account" role="menuitem">{user ? t('My account') : t('Sign in / Create account')}</Link>
                  <Link to="/wishlist" role="menuitem">{t('Wishlist')}</Link>
                  <Link to="/contact" role="menuitem">{t('Contact us')}</Link>
                </div>
              )}
            </div>
            <button className="header__icon-btn bag-icon-btn" onClick={() => setCartOpen(true)} aria-label={`${t('Open shopping bag')}, ${count} ${t('items')}`} title={t('Shopping bag')}>
              <BagIcon />
              <span className="bag-count" aria-hidden="true">{count}</span>
            </button>
            <button className="header__menu-btn" onClick={() => setMenuOpen(true)} aria-label={t('Open menu')}>{t('Menu')}</button>
          </div>
        </div>
      </header>

      <div className={`mmenu-scrim ${menuOpen ? 'mmenu-scrim--on' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <nav className={`mmenu ${menuOpen ? 'mmenu--open' : ''}`} aria-label={t('Mobile')}>
        <button className="mmenu__close" onClick={() => setMenuOpen(false)}>{t('Close')}</button>
        {NAV_LINKS.map((l) => (
          <Link key={l.label} to={l.to}>{t(l.label)}</Link>
        ))}
        <Link to={user ? '/account' : '/account/login'}>{user ? t('My account') : t('Sign in / Create account')}</Link>
        <Link to="/wishlist">{t('Wishlist')}</Link>
        <Link to="/contact">{t('Contact')}</Link>
        <div className="mmenu__foot">
          <LanguageToggle />
          <button className="btn--text" style={{ textAlign: 'start' }} onClick={() => { setMenuOpen(false); setSearchOpen(true); }}>
            {t('Search the collection')}
          </button>
          <span>{t('AZ Store — Cairo, Egypt')}</span>
        </div>
      </nav>
    </>
  );
}
