import { useMemo } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { useStore } from '../../store/StoreContext.jsx';
import { egp } from '../../utils/format.js';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

export default function Customers() {
  const { t } = useLanguage();
  const { orders } = useStore();

  const rows = useMemo(() => {
    const map = new Map();
    orders.filter((o) => !o.cancelled).forEach((o) => {
      const key = (o.email || '').trim().toLowerCase() || o.phone;
      const cur = map.get(key) || { name: o.name, email: o.email || '—', phone: o.phone, orders: 0, spent: 0, last: o.placedAt };
      cur.orders += 1;
      cur.spent += o.total;
      cur.name = o.name || cur.name;
      if (o.placedAt > cur.last) cur.last = o.placedAt;
      map.set(key, cur);
    });
    return [...map.values()].sort((a, b) => b.spent - a.spent);
  }, [orders]);

  return (
    <AdminLayout title="Customers">
      <section className="adsec" style={{ marginTop: 0 }}>
        <div className="adsec__head"><h2>{rows.length} {t('customers')}</h2></div>
        <p className="hint" style={{ fontSize: 12.5, color: 'rgba(244,234,217,0.5)', marginBottom: 12 }}>
          {t('Payment card numbers, CVVs and banking passwords are never collected or shown here.')}
        </p>
        <div className="adtable-wrap">
          <table className="adtable responsive">
            <thead>
              <tr><th>{t('Customer')}</th><th>{t('Email')}</th><th>{t('Phone')}</th><th className="num">{t('Orders')}</th><th className="num">{t('Total spent')}</th><th>{t('Last order')}</th></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.phone + c.email}>
                  <td data-label={t('Customer')}><span className="prod-name">{c.name}</span></td>
                  <td data-label={t('Email')}>{c.email}</td>
                  <td data-label={t('Phone')}>{c.phone}</td>
                  <td data-label={t('Orders')} className="num">{c.orders}</td>
                  <td data-label={t('Total spent')} className="num">{egp(c.spent)}</td>
                  <td data-label={t('Last order')}>{new Date(c.last).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6}><div className="adempty">{t('No customers yet.')}</div></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}
