import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import { useStore } from '../../store/StoreContext.jsx';
import * as catalog from '../../services/productService.js';
import { egp } from '../../utils/format.js';
import { basePrice, getVariations, totalStock } from '../../data/products.js';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

const STATUS_BADGE = { active: ['badge--ok', 'Active'], draft: ['badge--mute', 'Draft'], archived: ['badge--info', 'Archived'] };

export default function Products() {
  const { t } = useLanguage();
  const { allProducts, refreshCatalog, toast, addToCart } = useStore();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [stock, setStock] = useState('all');
  const [price, setPrice] = useState('any');
  const [discount, setDiscount] = useState('any');
  const [confirm, setConfirm] = useState(null); // { kind: 'delete'|'archive', product }
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const categories = useMemo(() => [...new Set(allProducts.map((p) => p.category))], [allProducts]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return allProducts.filter((p) => {
      if (term && ![p.name, p.sku, p.category, p.brand, p.id, ...getVariations(p).map((v) => v.sku)]
        .join(' ').toLowerCase().includes(term)) return false;
      if (category !== 'all' && p.category !== category) return false;
      if (status !== 'all' && p.status !== status) return false;
      const total = totalStock(p);
      const threshold = p.lowStockThreshold ?? 6;
      if (stock === 'in' && !(total > threshold)) return false;
      if (stock === 'low' && !(total > 0 && total <= threshold)) return false;
      if (stock === 'out' && total !== 0) return false;
      if (price === 'u300' && basePrice(p) >= 300) return false;
      if (price === '300-600' && (basePrice(p) < 300 || basePrice(p) > 600)) return false;
      if (price === 'o600' && basePrice(p) <= 600) return false;
      if (discount === 'yes' && !(p.compareAtPrice || p.discount)) return false;
      if (discount === 'no' && (p.compareAtPrice || p.discount)) return false;
      return true;
    });
  }, [allProducts, q, category, status, stock, price, discount]);

  const run = async (fn, message) => {
    setBusy(true);
    const result = await fn();
    setBusy(false);
    if (!result.ok) {
      toast(t(result.message || 'Unable to save product.'));
      return;
    }
    await refreshCatalog();
    toast(t(message));
  };

  const onConfirm = () => {
    const { kind, product } = confirm;
    setConfirm(null);
    if (kind === 'delete') {
      run(() => catalog.deleteProduct(product.id), 'Product deleted successfully.');
    } else {
      run(() => catalog.updateProduct(product.id, { status: 'archived' }), 'Product archived successfully.');
    }
  };

  const restore = (product) => run(() => catalog.updateProduct(product.id, { status: 'active' }), 'Product restored to the store.');
  const duplicate = (product) => run(() => catalog.duplicateProduct(product.id), `Duplicated as a draft: ${product.name} (Copy)`);

  return (
    <AdminLayout
      title="Products"
      actions={<Link className="btn btn--primary" to="/admin/products/new">+ {t('Add Product')}</Link>}
    >
      <div className="adbar">
        <div className="adfield grow" style={{ margin: 0 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('Search by name, SKU, category, brand or ID…')}
            aria-label={t('Search products')}
          />
        </div>
        <div className="adfield" style={{ margin: 0, width: 150 }}>
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label={t('Filter by category')}>
            <option value="all">{t('All categories')}</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="adfield" style={{ margin: 0, width: 130 }}>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t('Filter by status')}>
            <option value="all">{t('Any status')}</option>
            <option value="active">{t('Active')}</option>
            <option value="draft">{t('Draft')}</option>
            <option value="archived">{t('Archived')}</option>
          </select>
        </div>
        <div className="adfield" style={{ margin: 0, width: 140 }}>
          <select value={stock} onChange={(e) => setStock(e.target.value)} aria-label={t('Filter by stock')}>
            <option value="all">{t('Any stock')}</option>
            <option value="in">{t('In stock')}</option>
            <option value="low">{t('Low stock')}</option>
            <option value="out">{t('Out of stock')}</option>
          </select>
        </div>
        <div className="adfield" style={{ margin: 0, width: 140 }}>
          <select value={price} onChange={(e) => setPrice(e.target.value)} aria-label={t('Filter by price')}>
            <option value="any">{t('Any price')}</option>
            <option value="u300">{t('Under EGP 300')}</option>
            <option value="300-600">{t('EGP 300 – 600')}</option>
            <option value="o600">{t('Over EGP 600')}</option>
          </select>
        </div>
        <div className="adfield" style={{ margin: 0, width: 150 }}>
          <select value={discount} onChange={(e) => setDiscount(e.target.value)} aria-label={t('Filter by discount')}>
            <option value="any">{t('Discount: any')}</option>
            <option value="yes">{t('On discount')}</option>
            <option value="no">{t('No discount')}</option>
          </select>
        </div>
      </div>

      <section className="adsec" style={{ marginTop: 0 }}>
        <div className="adsec__head"><h2>{rows.length} {t(rows.length === 1 ? 'product' : 'products')}</h2></div>
        <div className="adtable-wrap">
          <table className="adtable responsive">
            <thead>
              <tr>
                <th>{t('Image')}</th><th>{t('Product')}</th><th>{t('Category')}</th><th>{t('Price')}</th><th>{t('Discount')}</th>
                <th>{t('Stock')}</th><th>{t('Status')}</th><th>{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const total = totalStock(p);
                const threshold = p.lowStockThreshold ?? 6;
                const [badgeClass, badgeLabel] = STATUS_BADGE[p.status] || STATUS_BADGE.draft;
                return (
                  <tr key={p.id}>
                    <td data-label={t('Image')}><img src={p.images[0]?.src} alt="" loading="lazy" /></td>
                    <td data-label={t('Product')}>
                      <span className="prod-name">{p.name}</span>
                      <span className="prod-sku">{p.sku} · {p.id}</span>
                    </td>
                    <td data-label={t('Category')}>{t(p.category)}</td>
                    <td data-label={t('Price')}>
                      {egp(basePrice(p))}
                      {p.compareAtPrice && <s>{egp(p.compareAtPrice)}</s>}
                    </td>
                    <td data-label={t('Discount')}>{p.discount ? `${p.discount}%` : '—'}</td>
                    <td data-label={t('Stock')}>
                      {total}{' '}
                      <span className={`badge ${total === 0 ? 'badge--bad' : total <= threshold ? 'badge--warn' : 'badge--ok'}`}>
                        {t(total === 0 ? 'Out' : total <= threshold ? 'Low' : 'In')}
                      </span>
                    </td>
                    <td data-label={t('Status')}><span className={`badge ${badgeClass}`}>{t(badgeLabel)}</span></td>
                    <td data-label={t('Actions')}>
                      <div className="ad__actions">
                        <Link to={`/admin/products/edit/${p.id}`}>{t('Edit')}</Link>
                        <button onClick={() => setPreview(p)}>{t('Preview')}</button>
                        <button onClick={() => duplicate(p)}>{t('Duplicate')}</button>
                        {p.status === 'archived' ? (
                          <button onClick={() => restore(p)}>{t('Restore')}</button>
                        ) : (
                          <button onClick={() => setConfirm({ kind: 'archive', product: p })}>{t('Archive')}</button>
                        )}
                        <button className="danger" onClick={() => setConfirm({ kind: 'delete', product: p })}>{t('Delete')}</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={8}><div className="adempty">{t('No products match these filters.')}</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog
        open={!!confirm}
        title={t(confirm?.kind === 'delete' ? 'Delete Product?' : 'Archive Product?')}
        confirmLabel={t(confirm?.kind === 'delete' ? 'Delete Product' : 'Archive')}
        body={
          confirm && (
            <p>
              {confirm.kind === 'delete'
                ? <>{t('Are you sure you want to delete')} <b>“{confirm.product.name}”</b>? {t('This action cannot be undone.')}</>
                : <>{t('Archive')} <b>“{confirm.product.name}”</b>? {t('It will disappear from the customer store but stay here, and can be restored later.')}</>}
            </p>
          )
        }
        onConfirm={onConfirm}
        onCancel={() => setConfirm(null)}
      />

      {preview && (
        <div className="admodal admodal--wide" role="dialog" aria-modal="true" aria-label={`Preview ${preview.name}`}>
          <div className="admodal__box">
            <h3>{t('Customer preview')}</h3>
            <div className="adpreview">
              <img src={preview.images[0]?.src} alt={preview.images[0]?.alt || preview.name} />
              <div>
              <span className="badge badge--mute">{t(preview.category)}</span>
                <h4 style={{ color: preview.accentHex }}>{preview.name}</h4>
                <div className="price">
                  {egp(basePrice(preview))}
                  {preview.compareAtPrice && <s style={{ fontSize: 15, opacity: 0.55, marginInlineStart: 8 }}>{egp(preview.compareAtPrice)}</s>}
                  {preview.discount ? <span className="badge badge--warn" style={{ marginInlineStart: 8 }}>{t('Save')} {preview.discount}%</span> : null}
                </div>
                <p style={{ marginBottom: 14 }}>{preview.description}</p>
                <p style={{ fontSize: 12.5, marginBottom: 14 }}>
                  {getVariations(preview).map((v) => `${t(v.label)} · ${v.stock ? `${v.stock} ${t('in stock')}` : t('sold out')} · ${v.sku}`).join('  |  ')}
                </p>
                <button
                  className="btn btn--primary"
                  disabled={totalStock(preview) === 0}
                  onClick={() => { addToCart(preview.id, getVariations(preview)[0].id, 1); }}
                >
                  {t(totalStock(preview) === 0 ? 'Sold out' : 'Add to Bag')}
                </button>
              </div>
            </div>
            <div className="admodal__actions">
              <button className="btn btn--ghost" onClick={() => setPreview(null)}>{t('Close')}</button>
              <Link className="btn btn--dark" to={`/product/${preview.id}`}>{t('Open in store')}</Link>
            </div>
          </div>
        </div>
      )}
      {busy && null}
    </AdminLayout>
  );
}
