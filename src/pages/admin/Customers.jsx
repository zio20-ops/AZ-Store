import { useMemo } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { useStore } from '../../store/StoreContext.jsx';
import { egp } from '../../utils/format.js';

export default function Customers() {
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
        <div className="adsec__head"><h2>{rows.length} customers</h2></div>
        <p className="hint" style={{ fontSize: 12.5, color: 'rgba(244,234,217,0.5)', marginBottom: 12 }}>
          Payment card numbers, CVVs and banking passwords are never collected or shown here.
        </p>
        <div className="adtable-wrap">
          <table className="adtable responsive">
            <thead>
              <tr><th>Customer</th><th>Email</th><th>Phone</th><th className="num">Orders</th><th className="num">Total spent</th><th>Last order</th></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.phone + c.email}>
                  <td data-label="Customer"><span className="prod-name">{c.name}</span></td>
                  <td data-label="Email">{c.email}</td>
                  <td data-label="Phone">{c.phone}</td>
                  <td data-label="Orders" className="num">{c.orders}</td>
                  <td data-label="Total spent" className="num">{egp(c.spent)}</td>
                  <td data-label="Last order">{new Date(c.last).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6}><div className="adempty">No customers yet.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}
