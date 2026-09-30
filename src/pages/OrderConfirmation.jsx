import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { useSeo } from '../hooks/useSeo.js';
import { egp } from '../utils/format.js';
import { ORDER_STEPS } from '../data/content.js';

export default function OrderConfirmation() {
  useSeo('Thank you for your order | AZ Store', 'Your AZ order has been received.');
  const { orders } = useStore();
  const location = useLocation();
  const [params] = useSearchParams();

  const id = location.state?.id || params.get('order');
  const order = orders.find((o) => o.id === id) || orders[0];

  if (!order) {
    return (
      <div className="confirm">
        <h1>No order found.</h1>
        <p>We couldn’t find an order for this session. Head back to the store whenever you’re ready.</p>
        <div className="confirm__actions">
          <Link className="btn btn--dark" to="/shop">Continue shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="cohead">
        <Link to="/" className="logo" aria-label="AZ Store home">AZ</Link>
        <span>Order {order.id}</span>
        <Link to="/track-order">Track order</Link>
      </div>

      <div className="confirm">
        <h1>Thank you for your order.</h1>
        <p>We’ve received your order and we’re already picking your bottles. A confirmation SMS is on its way to {order.phone}.</p>
        {order.paymentRef && (
          <p className="confirm__note">
            We received your reference <b>{order.paymentRef}</b>. Your order will be confirmed after payment verification.
          </p>
        )}

        <div className="confirm__card">
          <span className="confirm__status">{order.cancelled ? 'Cancelled' : ORDER_STEPS[order.status]}</span>
          <dl className="confirm__rows">
            <div className="confirm__row"><dt>Order number</dt><dd>{order.id}</dd></div>
            <div className="confirm__row"><dt>Customer</dt><dd>{order.name}</dd></div>
            <div className="confirm__row">
              <dt>Products</dt>
              <dd>{order.items.map((i) => `${i.name} × ${i.qty}`).join(', ')}</dd>
            </div>
            <div className="confirm__row"><dt>Payment method</dt><dd>{order.payment}</dd></div>
            <div className="confirm__row"><dt>Delivery</dt><dd>{order.deliveryMethod}</dd></div>
            <div className="confirm__row"><dt>Address</dt><dd>{order.address}</dd></div>
            <div className="confirm__row"><dt>Order status</dt><dd>{order.cancelled ? 'Cancelled' : ORDER_STEPS[order.status]}</dd></div>
            <div className="confirm__row"><dt>Total</dt><dd><b>{egp(order.total)}</b></dd></div>
          </dl>
        </div>

        <div className="confirm__actions">
          <Link className="btn btn--dark" to="/shop">Continue shopping</Link>
          <Link className="btn" to={`/track-order?order=${order.id}`}>Track order</Link>
        </div>
      </div>
    </>
  );
}
