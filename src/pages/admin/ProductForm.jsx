import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import ImageManager from '../../components/admin/ImageManager.jsx';
import { useStore } from '../../store/StoreContext.jsx';
import * as catalog from '../../services/productService.js';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

const blank = (categories) => ({
  name: '', sku: '', category: categories[0]?.name || '', brand: 'AZ',
  tagline: '', description: '',
  price: 450, compareAtPrice: '', discount: 0,
  stock: 10, lowStockThreshold: 6, available: true,
  volume: '220 ml', weight: '265 g', scent: '', scentFamily: categories[0]?.name || '',
  ingredients: '', howToUse: '', benefits: '',
  type: 'mist', badge: '', accentHex: '#e2ad55',
  status: 'active',
  images: [],
  variations: [{ id: 'v1', label: '220 ml / 7.4 fl oz', price: 450, stock: 10, sku: '', image: 0 }],
});

const fromProduct = (p) => ({
  name: p.name, sku: p.sku, category: p.category, brand: p.brand || 'AZ',
  tagline: p.tagline || '', description: p.description || '',
  price: p.price, compareAtPrice: p.compareAtPrice || '', discount: p.discount || 0,
  stock: p.stock, lowStockThreshold: p.lowStockThreshold ?? 6, available: p.stock > 0,
  volume: p.volume || '', weight: p.weight || '', scent: (p.scentNotes || []).join(', '), scentFamily: p.scentFamily || p.category,
  ingredients: (p.ingredients || []).join('\n'), howToUse: p.howToUse || '', benefits: (p.benefits || []).join('\n'),
  type: p.type || 'mist', badge: p.badge || '', accentHex: p.accentHex || '#e2ad55',
  status: p.status,
  images: p.images.map((i) => ({ ...i })),
  variations: p.variations.map((v) => ({ ...v })),
});

export default function ProductForm() {
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const { allProducts, productsLoading, refreshCatalog, toast } = useStore();
  const editing = allProducts.find((p) => p.id === id);
  const categories = useMemo(() => [...new Set(allProducts.map((p) => p.category))], [allProducts]);

  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (productsLoading) return;
    if (id) {
      if (editing) setForm(fromProduct(editing));
    } else {
      setForm(blank(categories));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, productsLoading, !!editing]);

  if (productsLoading || !form) return <AdminLayout title="Product"><div className="adempty">{t('Loading…')}</div></AdminLayout>;
  if (id && !editing) return <AdminLayout title="Product"><div className="adempty">{t('Product not found.')} <Link to="/admin/products">{t('Back to products')}</Link></div></AdminLayout>;

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setPrimary = (key, value) => {
    setForm((f) => ({
      ...f,
      [key]: value,
      variations: f.variations.map((v, i) => (i === 0 ? { ...v, [key === 'price' ? 'price' : key === 'stock' ? 'stock' : 'sku']: value } : v)),
    }));
  };
  const setVariation = (index, key, value) =>
    setForm((f) => ({ ...f, variations: f.variations.map((v, i) => (i === index ? { ...v, [key]: value } : v)) }));

  const setAvailable = (on) =>
    setForm((f) => ({
      ...f,
      available: on,
      stock: on ? Math.max(1, f.stock) : 0,
      variations: f.variations.map((v, i) => (i === 0 ? { ...v, stock: on ? Math.max(1, v.stock || 10) : 0 } : v)),
    }));

  const addVariation = () =>
    setForm((f) => ({ ...f, variations: [...f.variations, { id: `v${f.variations.length + 1}-${Date.now() % 1000}`, label: '', price: f.price, stock: 0, sku: '', image: 0 }] }));
  const removeVariation = (index) =>
    setForm((f) => (f.variations.length === 1 ? f : { ...f, variations: f.variations.filter((_, i) => i !== index) }));

  const submit = async (e) => {
    e.preventDefault();
    const draft = {
      ...form,
      id: editing?.id,
      name: form.name.trim(),
      sku: (form.sku || form.variations[0]?.sku || '').trim(),
      category: form.category.trim(),
      tagline: form.tagline.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
      discount: Number(form.discount || 0),
      stock: Number(form.stock),
      lowStockThreshold: Number(form.lowStockThreshold),
      scentNotes: form.scent ? form.scent.split(',').map((s) => s.trim()).filter(Boolean) : [],
      scentFamily: form.scentFamily || form.category,
      ingredients: form.ingredients ? form.ingredients.split('\n').map((s) => s.trim()).filter(Boolean) : [],
      benefits: form.benefits ? form.benefits.split('\n').map((s) => s.trim()).filter(Boolean) : [],
      howToUse: form.howToUse.trim(),
      notes: form.scent ? form.scent.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 3) : [],
      badge: form.badge.trim() || null,
      variations: form.variations.map((v, i) => (i === 0 ? { ...v, sku: (form.sku || v.sku || '').trim() } : v)),
    };
    const found = catalog.validateProduct(draft, allProducts);
    setErrors(found);
    if (Object.keys(found).length) {
      toast(t('Unable to save product. Please check the required fields.'));
      return;
    }
    setSaving(true);
    const result = editing
      ? await catalog.updateProduct(editing.id, draft)
      : await catalog.createProduct(draft);
    setSaving(false);
    if (!result.ok) {
      toast(t(result.message || 'Unable to save product.'));
      return;
    }
    await refreshCatalog();
    toast(t(editing ? 'Product updated successfully.' : 'Product created successfully.'));
    navigate('/admin/products');
  };

  const fieldError = (key) => (errors[key] ? <span className="err">{t(errors[key])}</span> : null);

  return (
    <AdminLayout title={editing ? `${t('Edit product')} — ${editing.name}` : 'Add Product'}>
      <form onSubmit={submit} noValidate>
        <section className="adsec" style={{ marginTop: 0 }}>
          <h2>{t('Basic information')}</h2>
          <div className="adgrid">
            <div className={`adfield ${errors.name ? 'adfield--err' : ''}`}>
              <label htmlFor="pf-name">{t('Product name')} *</label>
              <input id="pf-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={t('Black Kiss Intense')} />
              {fieldError('name')}
            </div>
            <div className={`adfield ${errors.sku ? 'adfield--err' : ''}`}>
              <label htmlFor="pf-sku">{t('Primary SKU')} *</label>
              <input id="pf-sku" value={form.sku} onChange={(e) => setPrimary('sku', e.target.value)} placeholder="AZ-BLK-220" />
              {fieldError('sku')}
            </div>
            <div className={`adfield ${errors.category ? 'adfield--err' : ''}`}>
              <label htmlFor="pf-cat">{t('Category')} *</label>
              <input id="pf-cat" list="az-categories" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Bold" />
              <datalist id="az-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
              {fieldError('category')}
            </div>
            <div className="adfield">
              <label htmlFor="pf-brand">{t('Brand')}</label>
              <input id="pf-brand" value={form.brand} onChange={(e) => set('brand', e.target.value)} />
            </div>
          </div>
          <div className="adfield">
            <label htmlFor="pf-tag">{t('Short description')}</label>
            <input id="pf-tag" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder={t('Bold and enchanting, with a trace you won’t forget.')} />
          </div>
          <div className="adfield">
            <label htmlFor="pf-desc">{t('Full description')}</label>
            <textarea id="pf-desc" value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} />
          </div>
        </section>

        <section className="adsec">
          <h2>{t('Pricing')}</h2>
          <div className="adgrid--3 adgrid">
            <div className={`adfield ${errors.price ? 'adfield--err' : ''}`}>
              <label htmlFor="pf-price">{t('Price (EGP)')} *</label>
              <input id="pf-price" type="number" min="1" value={form.price} onChange={(e) => setPrimary('price', Number(e.target.value))} />
              {fieldError('price')}
            </div>
            <div className="adfield">
              <label htmlFor="pf-compare">{t('Compare-at price')}</label>
              <input id="pf-compare" type="number" min="0" value={form.compareAtPrice} onChange={(e) => set('compareAtPrice', e.target.value)} placeholder="500" />
            </div>
            <div className={`adfield ${errors.discount ? 'adfield--err' : ''}`}>
              <label htmlFor="pf-discount">{t('Discount %')}</label>
              <input id="pf-discount" type="number" min="0" max="90" value={form.discount} onChange={(e) => set('discount', e.target.value)} />
              {fieldError('discount')}
            </div>
          </div>
        </section>

        <section className="adsec">
          <h2>{t('Inventory')}</h2>
          <div className="adgrid">
            <div className={`adfield ${errors.stock ? 'adfield--err' : ''}`}>
              <label htmlFor="pf-stock">{t('Stock quantity (primary size)')} *</label>
              <input id="pf-stock" type="number" min="0" value={form.stock} onChange={(e) => setPrimary('stock', Number(e.target.value))} />
              {fieldError('stock')}
            </div>
            <div className={`adfield ${errors.lowStockThreshold ? 'adfield--err' : ''}`}>
              <label htmlFor="pf-threshold">{t('Low stock threshold')}</label>
              <input id="pf-threshold" type="number" min="0" value={form.lowStockThreshold} onChange={(e) => set('lowStockThreshold', Number(e.target.value))} />
              {fieldError('lowStockThreshold')}
            </div>
          </div>
          <label className="adcheck">
            <input type="checkbox" checked={form.available} onChange={(e) => setAvailable(e.target.checked)} />
            {t('Available for sale (primary size in stock)')}
          </label>
        </section>

        <section className="adsec">
          <h2>{t('Sizes & stock (variations)')}</h2>
          <p className="hint" style={{ fontSize: 12.5, color: 'rgba(244,234,217,0.5)', marginBottom: 12 }}>
            {t('The first size is the primary one shown on cards and used by the pricing fields above.')}
          </p>
          {form.variations.map((v, i) => (
            <div className="advar" key={v.id || i}>
              <div className="advar__row">
                <div className={`adfield ${errors[`variation-${i}`] ? 'adfield--err' : ''}`}>
                  <label>{t('Size label')}</label>
                  <input value={v.label} onChange={(e) => setVariation(i, 'label', e.target.value)} placeholder="220 ml / 7.4 fl oz" />
                </div>
                <div className="adfield">
                  <label>{t('Price')}</label>
                  <input type="number" min="1" value={v.price} onChange={(e) => setVariation(i, 'price', Number(e.target.value))} />
                </div>
                <div className="adfield">
                  <label>{t('Stock')}</label>
                  <input type="number" min="0" value={v.stock} onChange={(e) => setVariation(i, 'stock', Number(e.target.value))} />
                </div>
                <div className="adfield">
                  <label>SKU</label>
                  <input value={v.sku} onChange={(e) => setVariation(i, 'sku', e.target.value)} placeholder="AZ-BLK-220" />
                </div>
                <button type="button" className="btn btn--text danger" style={{ color: '#ff9a9a' }} onClick={() => removeVariation(i)} disabled={form.variations.length === 1}>
                  {t('Remove')}
                </button>
              </div>
              {errors[`variation-${i}`] && <span className="err" style={{ color: '#ff9a9a', fontSize: 12 }}>{errors[`variation-${i}`]}</span>}
            </div>
          ))}
          <button type="button" className="btn btn--ghost" onClick={addVariation}>+ {t('Add size')}</button>
        </section>

        <section className="adsec">
          <h2>{t('Product details')}</h2>
          <div className="adgrid">
            <div className="adfield"><label htmlFor="pf-volume">{t('Volume')}</label><input id="pf-volume" value={form.volume} onChange={(e) => set('volume', e.target.value)} /></div>
            <div className="adfield"><label htmlFor="pf-weight">{t('Weight')}</label><input id="pf-weight" value={form.weight} onChange={(e) => set('weight', e.target.value)} /></div>
            <div className="adfield"><label htmlFor="pf-scent">{t('Scent notes (comma separated)')}</label><input id="pf-scent" value={form.scent} onChange={(e) => set('scent', e.target.value)} placeholder={t('Warm vanilla, Seductive musk')} /></div>
            <div className="adfield"><label htmlFor="pf-family">{t('Scent family')}</label><input id="pf-family" value={form.scentFamily} onChange={(e) => set('scentFamily', e.target.value)} /></div>
          </div>
          <div className="adfield"><label htmlFor="pf-ing">{t('Ingredients (one per line)')}</label><textarea id="pf-ing" value={form.ingredients} onChange={(e) => set('ingredients', e.target.value)} rows={3} /></div>
          <div className="adfield"><label htmlFor="pf-use">{t('How to use')}</label><textarea id="pf-use" value={form.howToUse} onChange={(e) => set('howToUse', e.target.value)} rows={2} /></div>
          <div className="adfield"><label htmlFor="pf-ben">{t('Benefits (one per line)')}</label><textarea id="pf-ben" value={form.benefits} onChange={(e) => set('benefits', e.target.value)} rows={2} /></div>
          <div className="adgrid--3 adgrid">
            <div className="adfield">
              <label htmlFor="pf-type">{t('Product type')}</label>
              <select id="pf-type" value={form.type} onChange={(e) => set('type', e.target.value)}>
                <option value="mist">{t('Mist')}</option><option value="serum">{t('Serum')}</option><option value="gift">{t('Gift set')}</option>
              </select>
            </div>
            <div className="adfield"><label htmlFor="pf-badge">{t('Badge (e.g. Best seller)')}</label><input id="pf-badge" value={form.badge} onChange={(e) => set('badge', e.target.value)} /></div>
            <div className="adfield"><label htmlFor="pf-accent">{t('Accent colour')}</label><input id="pf-accent" type="color" value={form.accentHex} onChange={(e) => set('accentHex', e.target.value)} /></div>
          </div>
        </section>

        <section className="adsec">
          <h2>{t('Images')}</h2>
          {errors.images && <span className="err" style={{ color: '#ff9a9a', fontSize: 12.5, display: 'block', marginBottom: 10 }}>{errors.images}</span>}
          <ImageManager
            images={form.images}
            onChange={(images) => set('images', images)}
            onError={(message) => toast(message)}
            altBase={form.name || 'Product'}
          />
        </section>

        <section className="adsec">
          <h2>{t('Product status')}</h2>
          <div className="adradio" role="radiogroup" aria-label={t('Product status')}>
            {['active', 'draft', 'archived'].map((s) => (
              <label key={s}>
                <input type="radio" name="status" checked={form.status === s} onChange={() => set('status', s)} />
                {t(s[0].toUpperCase() + s.slice(1))}
              </label>
            ))}
          </div>
          <p className="hint" style={{ fontSize: 12.5, color: 'rgba(244,234,217,0.5)', marginTop: 10 }}>
            {t('Only active products appear in the customer store. Drafts and archived products stay here in the admin.')}
          </p>
        </section>

        <div className="adbar" style={{ marginTop: 18 }}>
          <button className="btn btn--primary" type="submit" disabled={saving}>
            {t(saving ? 'Saving…' : editing ? 'Save changes' : 'Create product')}
          </button>
          <Link className="btn btn--ghost" to="/admin/products">{t('Cancel')}</Link>
        </div>
      </form>
    </AdminLayout>
  );
}
