export default function QuantitySelector({ value, onChange, max = 99, label = 'quantity' }) {
  return (
    <div className="qty" role="group" aria-label={`Select ${label}`}>
      <button onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label={`Decrease ${label}`}>−</button>
      <output aria-live="polite">{value}</output>
      <button onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`Increase ${label}`}>+</button>
    </div>
  );
}
