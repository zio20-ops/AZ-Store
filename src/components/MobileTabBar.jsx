import { NavLink } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { HomeIcon, GridIcon, SearchIcon, BagIcon } from './icons.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function MobileTabBar() {
  const { count, setCartOpen, setSearchOpen } = useStore();
  const { t } = useLanguage();

  return (
    <nav className="tabbar" aria-label={t('Quick navigation')}>
      <NavLink to="/" end>
        <HomeIcon />
        {t('Home')}
      </NavLink>
      <NavLink to="/shop">
        <GridIcon />
        {t('Shop')}
      </NavLink>
      <button onClick={() => setSearchOpen(true)} aria-label={t('Search')}>
        <SearchIcon />
        {t('Search')}
      </button>
      <button onClick={() => setCartOpen(true)} aria-label={`${t('Open bag')}, ${count} ${t('items')}`}>
        <BagIcon />
        {count > 0 && <span className="bagpill">{count}</span>}
        {t('Bag')}
      </button>
    </nav>
  );
}
