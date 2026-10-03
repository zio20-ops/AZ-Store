import { useLanguage } from '../i18n/LanguageContext.jsx';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { useSeo } from '../hooks/useSeo.js';
import { egp } from '../utils/format.js';
import { ORDER_STEPS } from '../data/content.js';
import LanguageToggle from '../components/LanguageToggle.jsx';

export default function OrderConfirmation() {
  const { t } = useLanguage();
  useSeo('Thank you for your order | AZ Store', 'Your AZ order has been received.');
  const { lastOrder } = useStore();
  const location = useLocation();
  const [params] = useSearchParams();

  const id = location.state?.id || params.get('order');
  const order = location.state?.order || (lastOrder?.id === id ? lastOrder : null);

  if (!order) {
    return (
      <div className="confirm">
        <h1>{t("No order found.")}</h1>
        <p>{t("We couldn’t find an order for this session. Head back to the store whenever you’re ready.")}</p>
        <div className="confirm__actions">
          {order.customerUid && <Link className="btn btn--ghost" to="/account">{t("View your orders")}</Link>}
          <Link className="btn btn--dark" to="/shop">{t("Continue shopping")}</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="cohead">
        <Link to="/" className="logo" aria-label={t("AZ Store home")}>AZ</Link>
        <span>{t("Order")} {order.id}</span>
        <LanguageToggle />
        <Link to="/contact">{t("Need help?")}</Link>
      </div>

      <div className="confirm">
        <h1>{t("Thank you for your order.")}</h1>
        <p>{t("We’ve received your order. Keep the order number above and contact us if you need help.")}</p>
        {order.paymentRef && (
          <p className="confirm__note">
            {t("We received your reference")} <b>{order.paymentRef}</b>{t(". Your order will be confirmed after payment verification.")}
          </p>
        )}
        {order.paymentProofUrl && (
          <p className="confirm__note">{t("We received your transfer screenshot. The store will verify your payment before preparing the order.")}</p>
        )}

        <div className="confirm__card">
          <span className="confirm__status">{order.cancelled ? t("Cancelled") : t(ORDER_STEPS[order.status])}</span>
          <dl className="confirm__rows">
            <div className="confirm__row"><dt>{t("Order number")}</dt><dd>{order.id}</dd></div>
            <div className="confirm__row"><dt>{t("Customer")}</dt><dd>{order.name}</dd></div>
            <div className="confirm__row">
              <dt>{t("Products")}</dt>
              <dd>{order.items.map((i) => `${t(i.name)} × ${i.qty}`).join(', ')}</dd>
            </div>
            <div className="confirm__row"><dt>{t("Payment method")}</dt><dd>{t(order.payment)}</dd></div>
            <div className="confirm__row"><dt>{t("Delivery")}</dt><dd>{t(order.deliveryMethod)}</dd></div>
            <div className="confirm__row"><dt>{t("Address")}</dt><dd>{order.address}</dd></div>
            <div className="confirm__row"><dt>{t("Order status")}</dt><dd>{order.cancelled ? t("Cancelled") : t(ORDER_STEPS[order.status])}</dd></div>
            <div className="confirm__row"><dt>{t("Total")}</dt><dd><b>{egp(order.total)}</b></dd></div>
          </dl>
        </div>

        <div className="confirm__actions">
          <Link className="btn btn--dark" to="/shop">{t("Continue shopping")}</Link>
        </div>
      </div>
    </>
  );
}
