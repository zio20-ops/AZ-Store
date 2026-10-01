import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { NAV_LINKS } from '../data/content.js';
import * as auth from '../services/authService.js';
import { AccountIcon, BagIcon, SearchIcon } from './icons.jsx';

export default function Header() {
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
      <p className="ann">{announcement}</p>
      <header className="header">
        <div className="header__in">
          <Link to="/" className="logo logo--header" aria-label="AZ Store home">AZ</Link>

          <nav className="header__nav" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <NavLink key={l.label} to={l.to} className={({ isActive }) => (isActive && !l.to.includes('?') ? 'active' : '')}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="header__icons">
            <button className="header__icon-btn desktop-only" onClick={() => setSearchOpen(true)} aria-label="Search products" title="Search">
              <SearchIcon />
            </button>
            <div className="account desktop-only" ref={accountRef}>
              <button className="header__icon-btn" aria-label="Account menu" title="Account" aria-haspopup="true" aria-expanded={accountOpen} onClick={() => setAccountOpen((v) => !v)}>
                <AccountIcon />
              </button>
              {accountOpen && (
                <div className="account__panel" role="menu">
                  <Link to="/account" role="menuitem">{user ? 'My account' : 'Sign in / Create account'}</Link>
                  <Link to="/track-order" role="menuitem">Track order</Link>
                  <Link to="/wishlist" role="menuitem">Wishlist</Link>
                  <Link to="/contact" role="menuitem">Contact us</Link>
                </div>
              )}
            </div>
            <button className="header__icon-btn bag-icon-btn" onClick={() => setCartOpen(true)} aria-label={`Open shopping bag, ${count} items`} title="Shopping bag">
              <BagIcon />
              <span className="bag-count" aria-hidden="true">{count}</span>
            </button>
            <button className="header__menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">Menu</button>
          </div>
        </div>
      </header>

      <div className={`mmenu-scrim ${menuOpen ? 'mmenu-scrim--on' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <nav className={`mmenu ${menuOpen ? 'mmenu--open' : ''}`} aria-label="Mobile">
        <button className="mmenu__close" onClick={() => setMenuOpen(false)}>Close</button>
        {NAV_LINKS.map((l) => (
          <Link key={l.label} to={l.to}>{l.label}</Link>
        ))}
        <Link to={user ? '/account' : '/account/login'}>{user ? 'My account' : 'Sign in / Create account'}</Link>
        <Link to="/track-order">Track order</Link>
        <Link to="/wishlist">Wishlist</Link>
        <Link to="/contact">Contact</Link>
        <div className="mmenu__foot">
          <button className="btn--text" style={{ textAlign: 'start' }} onClick={() => { setMenuOpen(false); setSearchOpen(true); }}>
            Search the collection
          </button>
          <span>AZ Store — Cairo, Egypt</span>
        </div>
      </nav>
    </>
  );
}
