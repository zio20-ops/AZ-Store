import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import { useStore } from '../../store/StoreContext.jsx';
import * as catalog from '../../services/productService.js';
import { egp } from '../../utils/format.js';
import { basePrice, getVariations, totalStock } from '../../data/products.js';

const STATUS_BADGE = { active: ['badge--ok', 'Active'], draft: ['badge--mute', 'Draft'], archived: ['badge--info', 'Archived'] };

export default function Products() {
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
      toast(result.message || 'Unable to save product.');
      return;
    }
    await refreshCatalog();
    toast(message);
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
      actions={<Link className="btn btn--primary" to="/admin/products/new">+ Add Product</Link>}
    >
      <div className="adbar">
        <div className="adfield grow" style={{ margin: 0 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, SKU, category, brand or ID…"
            aria-label="Search products"
          />
        </div>
        <div className="adfield" style={{ margin: 0, width: 150 }}>
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="adfield" style={{ margin: 0, width: 130 }}>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="all">Any status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="adfield" style={{ margin: 0, width: 140 }}>
          <select value={stock} onChange={(e) => setStock(e.target.value)} aria-label="Filter by stock">
            <option value="all">Any stock</option>
            <option value="in">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
        </div>
        <div className="adfield" style={{ margin: 0, width: 140 }}>
          <select value={price} onChange={(e) => setPrice(e.target.value)} aria-label="Filter by price">
            <option value="any">Any price</option>
            <option value="u300">Under EGP 300</option>
            <option value="300-600">EGP 300 – 600</option>
            <option value="o600">Over EGP 600</option>
          </select>
        </div>
        <div className="adfield" style={{ margin: 0, width: 150 }}>
          <select value={discount} onChange={(e) => setDiscount(e.target.value)} aria-label="Filter by discount">
            <option value="any">Discount: any</option>
            <option value="yes">On discount</option>
            <option value="no">No discount</option>
          </select>
        </div>
      </div>

      <section className="adsec" style={{ marginTop: 0 }}>
        <div className="adsec__head"><h2>{rows.length} {rows.length === 1 ? 'product' : 'products'}</h2></div>
        <div className="adtable-wrap">
          <table className="adtable responsive">
            <thead>
              <tr>
                <th>Image</th><th>Product</th><th>Category</th><th>Price</th><th>Discount</th>
                <th>Stock</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const total = totalStock(p);
                const threshold = p.lowStockThreshold ?? 6;
                const [badgeClass, badgeLabel] = STATUS_BADGE[p.status] || STATUS_BADGE.draft;
                return (
                  <tr key={p.id}>
                    <td data-label="Image"><img src={p.images[0]?.src} alt="" loading="lazy" /></td>
                    <td data-label="Product">
                      <span className="prod-name">{p.name}</span>
                      <span className="prod-sku">{p.sku} · {p.id}</span>
                    </td>
                    <td data-label="Category">{p.category}</td>
                    <td data-label="Price">
                      {egp(basePrice(p))}
                      {p.compareAtPrice && <s>{egp(p.compareAtPrice)}</s>}
                    </td>
                    <td data-label="Discount">{p.discount ? `${p.discount}%` : '—'}</td>
                    <td data-label="Stock">
                      {total}{' '}
                      <span className={`badge ${total === 0 ? 'badge--bad' : total <= threshold ? 'badge--warn' : 'badge--ok'}`}>
                        {total === 0 ? 'Out' : total <= threshold ? 'Low' : 'In'}
                      </span>
                    </td>
                    <td data-label="Status"><span className={`badge ${badgeClass}`}>{badgeLabel}</span></td>
                    <td data-label="Actions">
                      <div className="ad__actions">
                        <Link to={`/admin/products/edit/${p.id}`}>Edit</Link>
                        <button onClick={() => setPreview(p)}>Preview</button>
                        <button onClick={() => duplicate(p)}>Duplicate</button>
                        {p.status === 'archived' ? (
                          <button onClick={() => restore(p)}>Restore</button>
                        ) : (
                          <button onClick={() => setConfirm({ kind: 'archive', product: p })}>Archive</button>
                        )}
                        <button className="danger" onClick={() => setConfirm({ kind: 'delete', product: p })}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={8}><div className="adempty">No products match these filters.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.kind === 'delete' ? 'Delete Product?' : 'Archive Product?'}
        confirmLabel={confirm?.kind === 'delete' ? 'Delete Product' : 'Archive'}
        body={
          confirm && (
            <p>
              {confirm.kind === 'delete'
                ? <>Are you sure you want to delete <b>“{confirm.product.name}”</b>? This action cannot be undone.</>
                : <>Archive <b>“{confirm.product.name}”</b>? It will disappear from the customer store but stay here, and can be restored later.</>}
            </p>
          )
        }
        onConfirm={onConfirm}
        onCancel={() => setConfirm(null)}
      />

      {preview && (
        <div className="admodal admodal--wide" role="dialog" aria-modal="true" aria-label={`Preview ${preview.name}`}>
          <div className="admodal__box">
            <h3>Customer preview</h3>
            <div className="adpreview">
              <img src={preview.images[0]?.src} alt={preview.images[0]?.alt || preview.name} />
              <div>
                <span className="badge badge--mute">{preview.category}</span>
                <h4 style={{ color: preview.accentHex }}>{preview.name}</h4>
                <div className="price">
                  {egp(basePrice(preview))}
                  {preview.compareAtPrice && <s style={{ fontSize: 15, opacity: 0.55, marginInlineStart: 8 }}>{egp(preview.compareAtPrice)}</s>}
                  {preview.discount ? <span className="badge badge--warn" style={{ marginInlineStart: 8 }}>Save {preview.discount}%</span> : null}
                </div>
                <p style={{ marginBottom: 14 }}>{preview.description}</p>
                <p style={{ fontSize: 12.5, marginBottom: 14 }}>
                  {getVariations(preview).map((v) => `${v.label} · ${v.stock ? `${v.stock} in stock` : 'sold out'} · ${v.sku}`).join('  |  ')}
                </p>
                <button
                  className="btn btn--primary"
                  disabled={totalStock(preview) === 0}
                  onClick={() => { addToCart(preview.id, getVariations(preview)[0].id, 1); }}
                >
                  {totalStock(preview) === 0 ? 'Sold out' : 'Add to Bag'}
                </button>
              </div>
            </div>
            <div className="admodal__actions">
              <button className="btn btn--ghost" onClick={() => setPreview(null)}>Close</button>
              <Link className="btn btn--dark" to={`/product/${preview.id}`}>Open in store</Link>
            </div>
          </div>
        </div>
      )}
      {busy && null}
    </AdminLayout>
  );
}
