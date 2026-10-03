import { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { useStore } from '../../store/StoreContext.jsx';
import * as catalog from '../../services/productService.js';
import { getVariations } from '../../data/products.js';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

export default function Inventory() {
  const { t } = useLanguage();
  const { allProducts, refreshCatalog, toast } = useStore();
  const [draft, setDraft] = useState({}); // `${productId}:${sku}` -> {stock, threshold}

  const rows = allProducts
    .filter((p) => p.status !== 'archived')
    .flatMap((p) => getVariations(p).map((v) => ({ p, v })));

  const key = (p, v) => `${p.id}:${v.sku}`;
  const value = (p, v, field) => draft[key(p, v)]?.[field] ?? (field === 'stock' ? v.stock : p.lowStockThreshold ?? 6);
  const set = (p, v, field, val) =>
    setDraft((d) => ({ ...d, [key(p, v)]: { ...(d[key(p, v)] || {}), [field]: val } }));

  const dirty = (p, v) => {
    const d = draft[key(p, v)];
    return !!d && (Number(d.stock ?? v.stock) !== v.stock || Number(d.threshold ?? p.lowStockThreshold ?? 6) !== (p.lowStockThreshold ?? 6));
  };

  const save = async (p, v) => {
    const d = draft[key(p, v)] || {};
    const stock = Number(d.stock ?? v.stock);
    const threshold = Number(d.threshold ?? p.lowStockThreshold ?? 6);
    if (!Number.isInteger(stock) || stock < 0 || !Number.isInteger(threshold) || threshold < 0) {
      toast(t('Stock and threshold must be whole numbers of 0 or more.'));
      return;
    }
    const variations = getVariations(p).map((x) => (x.sku === v.sku ? { ...x, stock } : x));
    const result = await catalog.updateProduct(p.id, { variations, lowStockThreshold: threshold });
    if (!result.ok) {
      toast(t(result.message || 'Unable to save inventory.'));
      return;
    }
    setDraft((cur) => {
      const next = { ...cur };
      delete next[key(p, v)];
      return next;
    });
    await refreshCatalog();
    toast(t('Inventory updated.'));
  };

  return (
    <AdminLayout title="Inventory">
      <section className="adsec" style={{ marginTop: 0 }}>
        <div className="adsec__head"><h2>{t('Stock by SKU')}</h2></div>
        <p className="hint" style={{ fontSize: 12.5, color: 'rgba(244,234,217,0.5)', marginBottom: 12 }}>
          {t('Status is calculated automatically: stock above the threshold is')} <b>{t('In Stock')}</b>, {t('at or below it is')} <b>{t('Low Stock')}</b>, {t('zero is')} <b>{t('Out of Stock')}</b>.
        </p>
        <div className="adtable-wrap">
          <table className="adtable responsive">
            <thead>
              <tr><th>{t('Product')}</th><th>SKU</th><th>{t('Current stock')}</th><th>{t('Low stock threshold')}</th><th>{t('Status')}</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map(({ p, v }) => {
                const stock = Number(value(p, v, 'stock'));
                const threshold = Number(value(p, v, 'threshold'));
                const status = stock <= 0 ? 'out' : stock <= threshold ? 'low' : 'in';
                return (
                  <tr key={key(p, v)}>
                    <td data-label={t('Product')}>
                      <span className="prod-name">{p.name}</span>
                      <span className="prod-sku">{v.label}</span>
                    </td>
                    <td data-label="SKU">{v.sku}</td>
                    <td data-label={t('Current stock')}>
                      <input
                        type="number" min="0" style={{ width: 90, background: 'rgba(244,234,217,0.05)', border: '1px solid var(--line-3)', borderRadius: 8, color: 'var(--pearl)', padding: '6px 8px', font: '400 13px var(--body)' }}
                        value={value(p, v, 'stock')}
                        onChange={(e) => set(p, v, 'stock', e.target.value)}
                        aria-label={`Stock for ${v.sku}`}
                      />
                    </td>
                    <td data-label={t('Threshold')}>
                      <input
                        type="number" min="0" style={{ width: 90, background: 'rgba(244,234,217,0.05)', border: '1px solid var(--line-3)', borderRadius: 8, color: 'var(--pearl)', padding: '6px 8px', font: '400 13px var(--body)' }}
                        value={value(p, v, 'threshold')}
                        onChange={(e) => set(p, v, 'threshold', e.target.value)}
                        aria-label={`Low stock threshold for ${v.sku}`}
                      />
                    </td>
                    <td data-label={t('Status')}>
                      <span className={`badge ${status === 'out' ? 'badge--bad' : status === 'low' ? 'badge--warn' : 'badge--ok'}`}>
                        {t(status === 'out' ? 'Out of Stock' : status === 'low' ? 'Low Stock' : 'In Stock')}
                      </span>
                    </td>
                    <td>
                      {dirty(p, v) && (
                        <div className="ad__actions"><button onClick={() => save(p, v)}>{t('Save')}</button></div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}
