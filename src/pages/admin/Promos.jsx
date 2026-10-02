import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { useStore } from '../../store/StoreContext.jsx';
import * as catalog from '../../services/productService.js';
import { egp } from '../../utils/format.js';

const blank = { code: '', label: '', type: 'percent', value: 10, appliesTo: 'products', shippingMethod: 'standard', productIds: [], minSubtotal: 0, active: true };

export default function Promos() {
  const { allProducts, promoOffers, refreshPromos, toast } = useStore();
  const [draft, setDraft] = useState(blank);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { refreshPromos(); }, [refreshPromos]);
  const set = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const reset = () => { setDraft(blank); setEditing(false); };
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    const result = await catalog.savePromo(draft);
    setBusy(false);
    if (!result.ok) { toast(result.message || 'Could not save promo.'); return; }
    toast(`${result.promo.code} saved.`);
    reset();
    refreshPromos();
  };
  const edit = (promo) => {
    setDraft({ ...blank, ...promo, shippingMethod: promo.shippingMethod || 'standard', active: promo.active !== false, productIds: promo.productIds || [] });
    setEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const remove = async (code) => {
    if (!window.confirm(`Remove promo code ${code}?`)) return;
    const result = await catalog.deletePromo(code);
    if (!result.ok) { toast(result.message || 'Could not remove promo.'); return; }
    toast(`${code} removed.`);
    refreshPromos();
  };

  return (
    <AdminLayout title="Promo codes">
      <form className="adsec" style={{ marginTop: 0 }} onSubmit={submit}>
        <div className="adsec__head"><h2>{editing ? `Edit ${draft.code}` : 'Create promo code'}</h2></div>
        <div className="adgrid adgrid--3">
          <div className="adfield"><label htmlFor="promo-code">Code</label><input id="promo-code" value={draft.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="e.g. SUMMER15" required maxLength={24} /></div>
          <div className="adfield"><label htmlFor="promo-label">Internal note (optional)</label><input id="promo-label" value={draft.label} onChange={(e) => set('label', e.target.value)} placeholder="Summer launch" maxLength={80} /></div>
          <div className="adfield"><label htmlFor="promo-min">Minimum order products total (EGP)</label><input id="promo-min" type="number" min="0" value={draft.minSubtotal} onChange={(e) => set('minSubtotal', e.target.value)} /><span className="hint">Delivery cost is not counted toward this amount.</span></div>
          <div className="adfield"><label htmlFor="promo-type">Discount type</label><select id="promo-type" value={draft.type} onChange={(e) => set('type', e.target.value)}><option value="percent">Percentage</option><option value="fixed">Fixed amount (EGP)</option></select></div>
          <div className="adfield"><label htmlFor="promo-value">Discount {draft.type === 'percent' ? '(%)' : '(EGP)'}</label><input id="promo-value" type="number" min={draft.type === 'percent' ? 1 : 0} max={draft.type === 'percent' ? 100 : undefined} step="0.01" value={draft.value} onChange={(e) => set('value', e.target.value)} required /></div>
          <div className="adfield"><label htmlFor="promo-target">Applies to</label><select id="promo-target" value={draft.appliesTo} onChange={(e) => setDraft((d) => ({ ...d, appliesTo: e.target.value, shippingMethod: e.target.value === 'shipping' ? (d.shippingMethod || 'standard') : d.shippingMethod, productIds: e.target.value === 'shipping' ? [] : d.productIds }))}><option value="products">Products</option><option value="shipping">Delivery</option></select></div>
        </div>
        {draft.appliesTo === 'shipping' && <div className="adfield" style={{ maxWidth: 420 }}><label htmlFor="promo-shipping-method">Delivery option covered</label><select id="promo-shipping-method" value={draft.shippingMethod || 'standard'} onChange={(e) => set('shippingMethod', e.target.value)}><option value="standard">Standard delivery only</option><option value="express">Express delivery only</option><option value="any">Standard and Express</option></select><span className="hint">The discount applies to delivery only when the customer selects this option and meets the minimum products total.</span></div>}
        {draft.appliesTo === 'products' && <fieldset className="adfield" style={{ border: 0, padding: 0 }}><legend style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Eligible products <span className="hint">(leave all unchecked to include every product)</span></legend><div className="promo-products">{allProducts.filter((p) => p.status !== 'archived').map((product) => <label className="adcheck" key={product.id}><input type="checkbox" checked={draft.productIds.includes(product.id)} onChange={(e) => set('productIds', e.target.checked ? [...draft.productIds, product.id] : draft.productIds.filter((id) => id !== product.id))} />{product.name}</label>)}</div></fieldset>}
        <label className="adcheck" style={{ marginBottom: 16 }}><input type="checkbox" checked={draft.active} onChange={(e) => set('active', e.target.checked)} />Code is active</label>
        <div className="ad__actions"><button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create code'}</button>{editing && <button className="btn" type="button" onClick={reset}>Cancel</button>}</div>
      </form>

      <section className="adsec">
        <div className="adsec__head"><h2>{promoOffers.length} promo codes</h2></div>
        <div className="adtable-wrap"><table className="adtable responsive"><thead><tr><th>Code</th><th>Discount</th><th>Applies to</th><th>Eligible products</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {promoOffers.map((promo) => <tr key={promo.code}><td data-label="Code"><span className="prod-name">{promo.code}</span>{promo.label && <span className="prod-sku">{promo.label}</span>}</td><td data-label="Discount">{promo.type === 'percent' ? `${promo.value}%` : promo.value === 0 && promo.appliesTo === 'shipping' ? 'Free delivery' : egp(promo.value)}</td><td data-label="Applies to">{promo.appliesTo === 'shipping' ? `Delivery · ${promo.shippingMethod === 'express' ? 'Express' : promo.shippingMethod === 'any' ? 'Any option' : 'Standard'}` : 'Products'}{Number(promo.minSubtotal) > 0 && <span className="prod-sku">Min. {egp(promo.minSubtotal)}</span>}</td><td data-label="Eligible products">{promo.appliesTo === 'shipping' ? '—' : promo.productIds?.length ? promo.productIds.map((id) => allProducts.find((p) => p.id === id)?.name || id).join(', ') : 'All products'}</td><td data-label="Status"><span className={`badge ${promo.active === false ? 'badge--mute' : 'badge--ok'}`}>{promo.active === false ? 'Inactive' : 'Active'}</span></td><td data-label="Actions"><div className="ad__actions"><button type="button" onClick={() => edit(promo)}>Edit</button><button type="button" className="danger" onClick={() => remove(promo.code)}>Delete</button></div></td></tr>)}
          {promoOffers.length === 0 && <tr><td colSpan={6}><div className="adempty">No promo codes yet. Create the first one above.</div></td></tr>}
        </tbody></table></div>
      </section>
    </AdminLayout>
  );
}
