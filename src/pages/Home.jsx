import { Link } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { useSeo } from '../hooks/useSeo.js';
import { Reveal } from '../hooks/Reveal.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { TRUST_ITEMS } from '../data/content.js';

const MOODS = [
  { id: 'through-the-night', cls: 'mood--night', no: '01' },
  { id: 'black-kiss', cls: 'mood--bold', no: '02' },
  { id: 'million-dreams', cls: 'mood--soft', no: '03' },
];

export default function Home() {
  useSeo(
    'AZ Store | Fine Fragrance & Beauty in Egypt',
    'Fine fragrance mists, 220 ml. Three moods, one you — Through The Night, Black Kiss and Million Dreams. Gift-ready boxes, delivery across Egypt.',
  );
  const { products } = useStore();
  const byId = (id) => products.find((p) => p.id === id);

  return (
    <>
      <section className="container hero">
        <div>
          <h1>Three moods.<br />One you.</h1>
          <p>Fine fragrance mists, 220 ml. Pick a scent for tonight or give all three in one box.</p>
          <div className="hero__cta">
            <Link className="btn btn--primary btn--lg" to="/product/trio-gift-box">Shop the trio</Link>
            <a className="btn btn--text" href="#moods">Find my scent</a>
          </div>
        </div>
        <div className="hero__media">
          <img
            src="/images/trio-satin.jpg"
            alt="The three AZ fine fragrance mists standing on bronze satin under golden light"
            fetchpriority="high"
          />
        </div>
      </section>

      <section className="container">
        <ul className="trust">
          {TRUST_ITEMS.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </section>

      <section className="container sec">
        <Reveal className="sec__head">
          <div>
            <h2 className="sec__title">The collection</h2>
            <p className="sec__sub">Four ways to wear AZ — three mists and the box that holds them all.</p>
          </div>
          <Link className="btn btn--text" to="/shop">View all</Link>
        </Reveal>
        <div className="grid">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      <section className="container sec" id="moods">
        <Reveal className="sec__head">
          <div>
            <h2 className="sec__title">Find my scent</h2>
            <p className="sec__sub">Three fragrances, three personalities. Choose the one that matches tonight.</p>
          </div>
        </Reveal>
        <div className="moods">
          {MOODS.map((m) => {
            const p = byId(m.id);
            if (!p) return null;
            return (
              <Reveal className={`mood ${m.cls}`} key={m.id}>
                <span className="mood__no">{m.no}</span>
                <h3 style={{ color: p.accentHex }}>{p.name}</h3>
                <p>{p.story}</p>
                <ul>{(p.scentNotes || p.notes || []).map((n) => <li key={n}>{n}</li>)}</ul>
                <Link className="btn btn--text" to={`/product/${p.id}`}>View details</Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="container gift">
        <Reveal className="gift__media">
          <img src="/images/gift-box.jpg" alt="Open AZ gift box with three mists and thank-you cards on bronze satin" loading="lazy" />
        </Reveal>
        <Reveal>
          <h2>Gift-ready,<br />every time.</h2>
          <p>The trio arrives in a black velvet-touch box with a thank-you card and a dedication card — wrapped, sealed and ready to give.</p>
          <ul>
            <li>All three 220 ml mists in one box</li>
            <li>Two gift cards included with every trio</li>
            <li>Save 11% versus buying separately</li>
          </ul>
          <Link className="btn btn--primary" to="/product/trio-gift-box">Shop the trio</Link>
        </Reveal>
      </section>

      <section className="container statement">
        <Reveal>
          <p>Scent is the most honest thing you wear.</p>
          <small>AZ Store — Cairo</small>
        </Reveal>
      </section>
    </>
  );
}
