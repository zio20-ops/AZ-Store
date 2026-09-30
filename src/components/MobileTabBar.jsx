import { NavLink } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { HomeIcon, GridIcon, SearchIcon, BagIcon } from './icons.jsx';

export default function MobileTabBar() {
  const { count, setCartOpen, setSearchOpen } = useStore();

  return (
    <nav className="tabbar" aria-label="Quick navigation">
      <NavLink to="/" end>
        <HomeIcon />
        Home
      </NavLink>
      <NavLink to="/shop">
        <GridIcon />
        Shop
      </NavLink>
      <button onClick={() => setSearchOpen(true)}>
        <SearchIcon />
        Search
      </button>
      <button onClick={() => setCartOpen(true)} aria-label={`Open bag, ${count} items`}>
        <BagIcon />
        {count > 0 && <span className="bagpill">{count}</span>}
        Bag
      </button>
    </nav>
  );
}
