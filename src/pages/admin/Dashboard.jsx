import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { useStore } from '../../store/StoreContext.jsx';
import { egp } from '../../utils/format.js';
import { getVariations, totalStock } from '../../data/products.js';
import * as auth from '../../services/authService.js';

export default function Dashboard() {
  const { allProducts, orders } = useStore();
  const [customerLogins, setCustomerLogins] = useState([]);
  const [customerLoginsError, setCustomerLoginsError] = useState(false);

  useEffect(() => {
    let active = true;
    auth.listCustomerActivity().then((result) => {
      if (!active) return;
      if (result.ok) setCustomerLogins(result.users);
      else setCustomerLoginsError(true);
    });
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => {
    const pending = orders.filter((o) => !o.cancelled && o.status < 4).length;
    const revenue = orders.filter((o) => !o.cancelled).reduce((n, o) => n + o.total, 0);
    const paid = orders.filter((o) => !o.cancelled && o.paymentStatus === 'Paid').length;
    const completed = orders.filter((o) => !o.cancelled && o.status === 4).length;
    const lowStock = allProducts.filter((p) =>
      p.status !== 'archived' && getVariations(p).some((v) => v.stock <= (p.lowStockThreshold ?? 6)),
    ).length;
    return { pending, revenue, paid, completed, lowStock };
  }, [allProducts, orders]);

  const recent = orders.slice(0, 6);
  const lowRows = allProducts
    .filter((p) => p.status !== 'archived')
    .flatMap((p) => getVariations(p).filter((v) => v.stock <= (p.lowStockThreshold ?? 6)).map((v) => ({ p, v })))
    .slice(0, 6);

  return (
    <AdminLayout title="Dashboard">
      <div className="ad__cards">
        <div className="adcard"><span>Products</span><b>{allProducts.length}</b><small>{allProducts.filter((p) => p.status === 'active').length} live in store</small></div>
        <div className="adcard"><span>Orders</span><b>{orders.length}</b><small>all time</small></div>
        <div className="adcard"><span>Pending</span><b className={stats.pending ? 'adcard--warn' : ''}>{stats.pending}</b><small>not yet delivered</small></div>
        <div className="adcard"><span>Paid orders</span><b>{stats.paid}</b><small>manually marked as paid</small></div>
        <div className="adcard"><span>Completed</span><b>{stats.completed}</b><small>delivered orders</small></div>
        <div className="adcard"><span>Revenue</span><b>{egp(stats.revenue)}</b><small>excludes cancelled</small></div>
        <div className="adcard"><span>Low Stock</span><b className={stats.lowStock ? 'adcard--warn' : ''}>{stats.lowStock}</b><small>products at or below threshold</small></div>
        <div className="adcard"><span>Customer accounts</span><b>{customerLogins.length}</b><small>customers who signed in</small></div>
      </div>

      <section className="adsec">
        <div className="adsec__head">
          <h2>Recent customer sign-ins</h2>
          <Link className="btn btn--text" to="/admin/customers">View customers</Link>
        </div>
        <div className="adtable-wrap">
          <table className="adtable responsive">
            <thead><tr><th>Customer</th><th>Email</th><th>Sign-in method</th><th>Last sign-in</th></tr></thead>
            <tbody>
              {customerLogins.slice(0, 6).map((user) => (
                <tr key={user.uid}>
                  <td data-label="Customer"><span className="prod-name">{user.name || 'Customer'}</span></td>
                  <td data-label="Email">{user.email || '—'}</td>
                  <td data-label="Sign-in method">{user.provider === 'google.com' ? 'Google' : 'Email and password'}</td>
                  <td data-label="Last sign-in">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                </tr>
              ))}
              {customerLogins.length === 0 && <tr><td colSpan={4}><div className="adempty">{customerLoginsError ? 'Could not load customer sign-ins. Check the server configuration.' : 'No customer sign-ins recorded yet. New sign-ins will appear here.'}</div></td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="adsec">
        <div className="adsec__head">
          <h2>Recent orders</h2>
          <Link className="btn btn--text" to="/admin/orders">View all</Link>
        </div>
        <div className="adtable-wrap">
          <table className="adtable responsive">
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Date</th><th className="num">Total</th><th>Status</th></tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id}>
                  <td data-label="Order"><span className="prod-name">{o.id}</span></td>
                  <td data-label="Customer">{o.name}</td>
                  <td data-label="Date">{new Date(o.placedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                  <td data-label="Total" className="num">{egp(o.total)}</td>
                  <td data-label="Status">
                    <span className={`badge ${o.cancelled ? 'badge--bad' : o.status === 4 ? 'badge--ok' : 'badge--warn'}`}>
                      {o.cancelled ? 'Cancelled' : ['Received', 'Payment', 'Preparing', 'Out for delivery', 'Delivered'][o.status]}
                    </span>
                  </td>
                </tr>
              ))}
              {recent.length === 0 && <tr><td colSpan={5}><div className="adempty">No orders yet.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="adsec">
        <div className="adsec__head">
          <h2>Low stock alerts</h2>
          <Link className="btn btn--text" to="/admin/inventory">Manage inventory</Link>
        </div>
        {lowRows.length === 0 ? (
          <div className="adempty">Every size is comfortably in stock.</div>
        ) : (
          <div className="adtable-wrap">
            <table className="adtable responsive">
              <thead>
                <tr><th>Product</th><th>SKU</th><th className="num">Stock</th><th>Status</th></tr>
              </thead>
              <tbody>
                {lowRows.map(({ p, v }) => (
                  <tr key={p.id + v.sku}>
                    <td data-label="Product"><span className="prod-name">{p.name}</span><span className="prod-sku">{v.label}</span></td>
                    <td data-label="SKU">{v.sku}</td>
                    <td data-label="Stock" className="num">{v.stock}</td>
                    <td data-label="Status">
                      <span className={`badge ${v.stock === 0 ? 'badge--bad' : 'badge--warn'}`}>{v.stock === 0 ? 'Out of stock' : 'Low stock'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="adsec">
        <div className="adsec__head"><h2>Catalog health</h2></div>
        <p style={{ fontSize: 13.5, color: 'rgba(244,234,217,0.65)' }}>
          {allProducts.filter((p) => p.status === 'draft').length} draft · {allProducts.filter((p) => p.status === 'archived').length} archived ·{' '}
          {allProducts.reduce((n, p) => n + totalStock(p), 0)} units on hand across {allProducts.length} products.
        </p>
      </section>
    </AdminLayout>
  );
}
