import { useLanguage } from '../i18n/LanguageContext.jsx';
import { NavLink } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { HomeIcon, GridIcon, SearchIcon, BagIcon } from './icons.jsx';

export default function MobileTabBar() {
  const { t } = useLanguage();
  const { count, setCartOpen, setSearchOpen } = useStore();

  return (
    <nav className="tabbar" aria-label={t("Quick navigation")}>
      <NavLink to="/" end>
        <HomeIcon />
        {t("Home")}
      </NavLink>
      <NavLink to="/shop">
        <GridIcon />
        {t("Shop")}
      </NavLink>
      <button onClick={() => setSearchOpen(true)}>
        <SearchIcon />
        {t("Search")}
      </button>
      <button onClick={() => setCartOpen(true)} aria-label={`Open bag, ${count} items`}>
        <BagIcon />
        {count > 0 && <span className="bagpill">{count}</span>}
        {t("Bag")}
      </button>
    </nav>
  );
}
