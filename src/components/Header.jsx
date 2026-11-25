import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { categorySlug } from '../data/products.js';
import * as auth from '../services/authService.js';
import { AccountIcon, BagIcon, SearchIcon } from './icons.jsx';
import LanguageToggle from './LanguageToggle.jsx';

export default function Header() {
  const { t, localize, language } = useLanguage();
  const { count, setCartOpen, setSearchOpen, announcement, categories, settings } = useStore();
  const [customerLoginOverride, setCustomerLoginOverride] = useState(null);
  const customerLoginEnabled = customerLoginOverride ?? settings.showCustomerLogin !== false;
  const [accountOpen, setAccountOpen] = useState(false);
  const [user, setUser] = useState(() => auth.getCurrentUser());
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const accountRef = useRef(null);
  const navLinks = [
    { label: 'Shop all', to: '/shop' },
    ...categories.filter((category) => category.showInNavigation).sort((a, b) => (a.navigationOrder ?? a.sortOrder ?? 0) - (b.navigationOrder ?? b.sortOrder ?? 0)).slice(0, 3).map((category) => ({ label: localize(category), to: `/shop?category=${encodeURIComponent(categorySlug(category) || category.id)}` })),
  ];

  useEffect(() => {
    setAccountOpen(false);
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    setMenuOpen(false);
  }, [language]);

  useEffect(() => {
    const receiveSetting = (value) => {
      if (typeof value?.showCustomerLogin === 'boolean') setCustomerLoginOverride(value.showCustomerLogin);
    };
    const onStorage = (event) => {
      if (event.key === 'az.storefront.showCustomerLogin' && (event.newValue === 'true' || event.newValue === 'false')) {
        receiveSetting({ showCustomerLogin: event.newValue === 'true' });
      }
    };
    window.addEventListener('storage', onStorage);
    const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('az-store-settings');
    if (channel) channel.onmessage = (event) => receiveSetting(event.data);
    return () => {
      window.removeEventListener('storage', onStorage);
      channel?.close();
    };
  }, []);

  useEffect(() => {
    if (!customerLoginEnabled) setAccountOpen(false);
  }, [customerLoginEnabled]);

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
      {announcement && <p className="ann">{t(announcement)}</p>}
      <header className="header">
        <div className="header__in">
          <Link to="/" className="logo logo--header" aria-label={t("AZ Store home")}>AZ</Link>

          <nav className="header__nav" aria-label={t("Primary")}>
            {navLinks.map((l) => (
              <NavLink key={l.label} to={l.to} className={({ isActive }) => (isActive && !l.to.includes('?') ? 'active' : '')}>
                {t(l.label)}
              </NavLink>
            ))}
          </nav>

          <div className="header__icons">
            <div className="header__desktop-tools">
            <LanguageToggle />
            <button className="header__icon-btn desktop-only" onClick={() => setSearchOpen(true)} aria-label={t("Search products")} title={t("Search")}>
              <SearchIcon />
            </button>
            {customerLoginEnabled && <div className="account desktop-only" ref={accountRef}>
              <button className="header__icon-btn" aria-label={t("Account menu")} title={t("Account")} aria-haspopup="true" aria-expanded={accountOpen} onClick={() => setAccountOpen((v) => !v)}>
                <AccountIcon />
              </button>
              {accountOpen && (
                <div className="account__panel" role="menu">
                  <Link to="/account" role="menuitem">{user ? t("My account") : t("Sign in / Create account")}</Link>
                  <Link to="/track-order" role="menuitem">{t("Track your order")}</Link>
                  <Link to="/wishlist" role="menuitem">{t("Wishlist")}</Link>
                </div>
              )}
            </div>}
            </div>
            <button className="header__icon-btn bag-icon-btn" onClick={() => setCartOpen(true)} aria-label={`Open shopping bag, ${count} items`} title={t("Shopping bag")}>
              <BagIcon />
              {count > 0 && <span className="bag-count" aria-hidden="true">{count}</span>}
            </button>
            <div className="header__mobile-tools">
              <button className="header__icon-btn header__search-btn" onClick={() => setSearchOpen(true)} aria-label={t("Search products")} title={t("Search")}><SearchIcon /></button>
              <button className="header__icon-btn header__menu-btn" onClick={() => setMenuOpen(true)} aria-label={t("Open menu")} aria-expanded={menuOpen}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className={`mmenu-scrim ${menuOpen ? 'mmenu-scrim--on' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <nav className={`mmenu ${menuOpen ? 'mmenu--open' : ''}`} aria-label={t("Mobile")}>
        <div className="mmenu__top">
          <button className="mmenu__close" onClick={() => setMenuOpen(false)} aria-label={t("Close")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
          <Link to="/" className="logo logo--header mmenu__logo" aria-label={t("AZ Store home")}>AZ</Link>
          <span aria-hidden="true" />
        </div>
        <div className="mmenu__language"><LanguageToggle /></div>
        {navLinks.filter((link) => link.label !== 'Shop all').map((l) => (
          <Link key={l.label} to={l.to}>{t(l.label)}</Link>
        ))}
        {customerLoginEnabled && <Link to={user ? '/account' : '/account/login'}>{user ? t("My account") : t("Sign in / Create account")}</Link>}
        <Link to="/track-order">{t("Track your order")}</Link>
        <Link to="/faq#shipping">{t("Shipping policy")}</Link>
        <Link to="/faq#returns">{t("Exchange & return policy")}</Link>
        <div className="mmenu__foot">
          <span>{t("AZ Store — Cairo, Egypt")}</span>
        </div>
      </nav>
    </>
  );
}
