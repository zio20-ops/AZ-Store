import { useState } from 'react';

export default function Accordion({ items }) {
  const [open, setOpen] = useState(null);

  return (
    <div>
      {items.map((item, i) => (
        <div className={`acc ${open === i ? 'acc--open' : ''}`} key={item.q}>
          <button
            className="acc__head"
            aria-expanded={open === i}
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span>{item.q}</span>
            <span className="acc__icon" aria-hidden="true">+</span>
          </button>
          <div className="acc__body" role="region" aria-label={item.q}>
            <div>{item.a}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
