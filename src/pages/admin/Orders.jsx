import { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { useStore } from '../../store/StoreContext.jsx';
import { ORDER_STEPS } from '../../data/content.js';
import { egp } from '../../utils/format.js';

const PAYMENT_STATUSES = ['Pending', 'Paid', 'Verification Required', 'Failed', 'Refunded'];
const PAY_BADGE = {
  Pending: 'badge--warn', Paid: 'badge--ok', 'Verification Required': 'badge--info', Failed: 'badge--bad', Refunded: 'badge--mute',
};

export default function Orders() {
  const { orders, updateOrder, toast } = useStore();
  const [filter, setFilter] = useState('all');

  const rows = orders.filter((o) => {
    if (filter === 'all') return true;
    if (filter === 'cancelled') return !!o.cancelled;
    if (filter === 'pending') return !o.cancelled && o.status < 4;
    return !o.cancelled && o.status === Number(filter);
  });

  const setStatus = (order, value) => {
    if (value === 'cancelled') {
      updateOrder(order.id, { cancelled: true });
      toast(`Order ${order.id} cancelled.`);
      return;
    }
    updateOrder(order.id, { cancelled: false, status: Number(value) });
    toast('Order status updated.');
  };

  const setPayment = (order, value) => {
    updateOrder(order.id, { paymentStatus: value });
    toast(value === 'Paid' ? `Payment for ${order.id} marked as paid.` : `Payment status: ${value}.`);
  };

  return (
    <AdminLayout title="Orders">
      <div className="adbar">
        <div className="adfield" style={{ margin: 0, width: 190 }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter orders">
            <option value="all">All orders</option>
            <option value="pending">Pending fulfilment</option>
            {ORDER_STEPS.map((s, i) => <option key={s} value={i}>{s}</option>)}
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <section className="adsec" style={{ marginTop: 0 }}>
        <div className="adsec__head"><h2>{rows.length} {rows.length === 1 ? 'order' : 'orders'}</h2></div>
        <div className="adtable-wrap">
          <table className="adtable responsive">
            <thead>
              <tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Items</th><th className="num">Total</th><th>Payment</th><th>Status</th><th>Payment status</th></tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td data-label="Order ID"><span className="prod-name">{o.id}</span></td>
                  <td data-label="Customer">
                    {o.name}
                    <span className="prod-sku">{o.phone}</span>
                  </td>
                  <td data-label="Date">{new Date(o.placedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td data-label="Items">{o.items.reduce((n, i) => n + i.qty, 0)} items</td>
                  <td data-label="Total" className="num">{egp(o.total)}</td>
                  <td data-label="Payment">
                    {o.payment}
                    {o.paymentRef && <span className="prod-sku">Ref: {o.paymentRef}</span>}
                  </td>
                  <td data-label="Status">
                    <select
                      className="badge"
                      style={{ background: 'rgba(244,234,217,0.06)', border: '1px solid var(--line-3)', color: 'var(--pearl)', borderRadius: 99, padding: '4px 8px', font: '600 12px var(--body)' }}
                      value={o.cancelled ? 'cancelled' : String(o.status)}
                      onChange={(e) => setStatus(o, e.target.value)}
                      aria-label={`Status of order ${o.id}`}
                    >
                      {ORDER_STEPS.map((s, i) => <option key={s} value={i}>{s}</option>)}
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td data-label="Payment status">
                    <span className={`badge ${PAY_BADGE[o.paymentStatus] || 'badge--mute'}`}>{o.paymentStatus || 'Pending'}</span>
                    <div className="ad__actions" style={{ marginTop: 6 }}>
                      <select
                        value={o.paymentStatus || 'Pending'}
                        onChange={(e) => setPayment(o, e.target.value)}
                        aria-label={`Payment status of order ${o.id}`}
                        style={{ background: 'none', border: '1px solid var(--line-3)', color: 'rgba(244,234,217,0.8)', borderRadius: 99, padding: '4px 8px', font: '600 11.5px var(--body)' }}
                      >
                        {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {o.paymentRef && o.paymentStatus === 'Verification Required' && (
                        <button onClick={() => setPayment(o, 'Paid')}>Verify payment</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8}><div className="adempty">No orders in this view.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}
