import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { NAV_LINKS } from '../data/content.js';

export default function Header() {
  const { count, setCartOpen, setSearchOpen, announcement } = useStore();
  const [accountOpen, setAccountOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setAccountOpen(false);
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <>
      <p className="ann">{announcement}</p>
      <header className="header">
        <div className="header__in">
          <Link to="/" className="logo" aria-label="AZ Store home">AZ</Link>

          <nav className="header__nav" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <NavLink key={l.label} to={l.to} className={({ isActive }) => (isActive && !l.to.includes('?') ? 'active' : '')}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="header__icons">
            <button className="desktop-only" onClick={() => setSearchOpen(true)}>Search</button>
            <div className="account desktop-only">
              <button aria-haspopup="true" aria-expanded={accountOpen} onClick={() => setAccountOpen((v) => !v)}>
                Account
              </button>
              {accountOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 59 }} onClick={() => setAccountOpen(false)} aria-hidden="true" />
                  <div className="account__panel" role="menu">
                    <Link to="/track-order" role="menuitem">Track order</Link>
                    <Link to="/wishlist" role="menuitem">Wishlist</Link>
                    <Link to="/contact" role="menuitem">Contact us</Link>
                  </div>
                </>
              )}
            </div>
            <button className="bagpill" onClick={() => setCartOpen(true)} aria-label={`Open bag, ${count} items`}>
              Bag {count}
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
