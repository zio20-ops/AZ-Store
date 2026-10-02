import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { useStore } from '../../store/StoreContext.jsx';
import { egp } from '../../utils/format.js';
import * as auth from '../../services/authService.js';

export default function Customers() {
  const { orders } = useStore();
  const [accounts, setAccounts] = useState([]);
  const [accountsError, setAccountsError] = useState(false);

  useEffect(() => {
    let active = true;
    auth.listCustomerActivity().then((result) => {
      if (!active) return;
      if (result.ok) setAccounts(result.users || []); else setAccountsError(true);
    }).catch(() => { if (active) setAccountsError(true); });
    return () => { active = false; };
  }, []);

  const rows = useMemo(() => {
    const map = new Map();
    orders.filter((o) => !o.cancelled).forEach((o) => {
      const key = (o.email || '').trim().toLowerCase() || o.phone;
      const cur = map.get(key) || { name: o.name, email: o.email || '—', phone: o.phone, orders: 0, paid: 0, completed: 0, spent: 0, last: o.placedAt };
      cur.orders += 1;
      if (o.paymentStatus === 'Paid') cur.paid += 1;
      if (o.status === 4) cur.completed += 1;
      cur.spent += o.total;
      cur.name = o.name || cur.name;
      if (o.placedAt > cur.last) cur.last = o.placedAt;
      map.set(key, cur);
    });
    accounts.forEach((user) => {
      const key = (user.email || '').trim().toLowerCase() || user.uid;
      const cur = map.get(key) || { name: user.name || 'Customer', email: user.email || '—', phone: '—', orders: 0, paid: 0, completed: 0, spent: 0, last: user.lastLoginAt || '' };
      cur.name = user.name || cur.name;
      if (user.lastLoginAt && user.lastLoginAt > cur.last) cur.last = user.lastLoginAt;
      map.set(key, cur);
    });
    return [...map.values()].sort((a, b) => b.spent - a.spent);
  }, [orders, accounts]);

  return (
    <AdminLayout title="Customers">
      <div className="ad__cards" style={{ marginBottom: 18 }}>
        <div className="adcard"><span>Customers</span><b>{rows.length}</b><small>accounts and order contacts</small></div>
        <div className="adcard"><span>Paid orders</span><b>{orders.filter((o) => !o.cancelled && o.paymentStatus === 'Paid').length}</b><small>manually confirmed in Orders</small></div>
        <div className="adcard"><span>Completed orders</span><b>{orders.filter((o) => !o.cancelled && o.status === 4).length}</b><small>marked as delivered</small></div>
      </div>
      <section className="adsec" style={{ marginTop: 0 }}>
        <div className="adsec__head"><h2>{rows.length} customers</h2></div>
        <p className="hint" style={{ fontSize: 12.5, color: 'rgba(244,234,217,0.5)', marginBottom: 12 }}>
          Payment card numbers, CVVs and banking passwords are never collected or shown here.
        </p>
        {accountsError && <p className="field-error" role="status">Customer account sign-ins could not be loaded; order contacts are still shown.</p>}
        <div className="adtable-wrap">
          <table className="adtable responsive">
            <thead>
              <tr><th>Customer</th><th>Email</th><th>Phone</th><th className="num">Orders</th><th className="num">Paid</th><th className="num">Completed</th><th className="num">Order total</th><th>Last activity</th></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.phone + c.email}>
                  <td data-label="Customer"><span className="prod-name">{c.name}</span></td>
                  <td data-label="Email">{c.email}</td>
                  <td data-label="Phone">{c.phone}</td>
                  <td data-label="Orders" className="num">{c.orders}</td>
                  <td data-label="Paid" className="num">{c.paid}</td>
                  <td data-label="Completed" className="num">{c.completed}</td>
                  <td data-label="Total spent" className="num">{egp(c.spent)}</td>
                  <td data-label="Last order">{new Date(c.last).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8}><div className="adempty">No customers yet.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}
