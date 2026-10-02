import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { useStore } from '../../store/StoreContext.jsx';
import * as catalog from '../../services/productService.js';
import { ADMIN_EMAIL } from '../../services/firebaseConfig.js';
import { isFirebase } from '../../services/backend.js';

export default function Settings() {
  const { settings, refreshCatalog, toast } = useStore();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings && Object.keys(settings).length) {
      setForm({
        announcement: settings.announcement ?? '',
        freeDeliveryThreshold: settings.freeDeliveryThreshold ?? 1800,
        defaultLowStockThreshold: settings.defaultLowStockThreshold ?? 6,
        paymentMethods: {
          cod: { enabled: settings.paymentMethods?.cod?.enabled ?? true },
          instapay: { enabled: settings.paymentMethods?.instapay?.enabled ?? false, account: settings.paymentMethods?.instapay?.account || '', accountName: settings.paymentMethods?.instapay?.accountName || '' },
          vodafone: { enabled: settings.paymentMethods?.vodafone?.enabled ?? false, number: settings.paymentMethods?.vodafone?.number || '' },
        },
      });
    }
  }, [settings]);

  if (!form) return <AdminLayout title="Settings"><div className="adempty">Loading…</div></AdminLayout>;

  const save = async (e) => {
    e.preventDefault();
    const threshold = Number(form.freeDeliveryThreshold);
    const low = Number(form.defaultLowStockThreshold);
    if (!Number.isFinite(threshold) || threshold < 0 || !Number.isFinite(low) || low < 0) {
      toast('Thresholds must be valid numbers of 0 or more.');
      return;
    }
    if (form.paymentMethods.instapay.enabled && !form.paymentMethods.instapay.account.trim()) { toast('Add the InstaPay account before enabling it.'); return; }
    if (form.paymentMethods.vodafone.enabled && !form.paymentMethods.vodafone.number.trim()) { toast('Add the Vodafone Cash number before enabling it.'); return; }
    setSaving(true);
    const result = await catalog.saveSettings({
      announcement: form.announcement.trim(),
      freeDeliveryThreshold: threshold,
      defaultLowStockThreshold: low,
      paymentMethods: {
        cod: { enabled: Boolean(form.paymentMethods.cod.enabled) },
        instapay: { ...form.paymentMethods.instapay, account: form.paymentMethods.instapay.account.trim(), accountName: form.paymentMethods.instapay.accountName.trim() },
        vodafone: { ...form.paymentMethods.vodafone, number: form.paymentMethods.vodafone.number.trim() },
      },
    });
    setSaving(false);
    if (!result.ok) {
      toast(result.message || 'Unable to save settings.');
      return;
    }
    await refreshCatalog();
    toast('Settings saved.');
  };

  return (
    <AdminLayout title="Settings">
      <form onSubmit={save}>
        <section className="adsec" style={{ marginTop: 0 }}>
          <h2>Storefront</h2>
          <div className="adfield">
            <label htmlFor="set-ann">Announcement bar</label>
            <input id="set-ann" value={form.announcement} onChange={(e) => setForm({ ...form, announcement: e.target.value })} />
            <span className="hint">Shown at the top of every customer page. Leave this empty and save to hide the announcement completely.</span>
          </div>
          <div className="adgrid">
            <div className="adfield">
              <label htmlFor="set-free">Free delivery threshold (EGP)</label>
              <input id="set-free" type="number" min="0" value={form.freeDeliveryThreshold} onChange={(e) => setForm({ ...form, freeDeliveryThreshold: e.target.value })} />
            </div>
            <div className="adfield">
              <label htmlFor="set-low">Default low stock threshold</label>
              <input id="set-low" type="number" min="0" value={form.defaultLowStockThreshold} onChange={(e) => setForm({ ...form, defaultLowStockThreshold: e.target.value })} />
              <span className="hint">Applied to new products; existing products keep their own threshold.</span>
            </div>
          </div>
        </section>
        <section className="adsec">
          <h2>Payment methods</h2>
          <p className="hint">For InstaPay and Vodafone Cash, shoppers transfer from their own app and enter the transfer reference. Verify transfers in Orders before marking them paid. These options do not charge or confirm payments automatically.</p>
          <label className="adcheck"><input type="checkbox" checked={form.paymentMethods.cod.enabled} onChange={(e) => setForm({ ...form, paymentMethods: { ...form.paymentMethods, cod: { enabled: e.target.checked } } })} /> Cash on delivery</label>
          <div className="adgrid" style={{ marginTop: 16 }}>
            <div className="adfield">
              <label className="adcheck"><input type="checkbox" checked={form.paymentMethods.instapay.enabled} onChange={(e) => setForm({ ...form, paymentMethods: { ...form.paymentMethods, instapay: { ...form.paymentMethods.instapay, enabled: e.target.checked } } })} /> Enable InstaPay</label>
              <label htmlFor="set-instapay-account">InstaPay account / payment address</label>
              <input id="set-instapay-account" value={form.paymentMethods.instapay.account} onChange={(e) => setForm({ ...form, paymentMethods: { ...form.paymentMethods, instapay: { ...form.paymentMethods.instapay, account: e.target.value } } })} placeholder="e.g. account address or phone" />
              <label htmlFor="set-instapay-name">Account holder name</label>
              <input id="set-instapay-name" value={form.paymentMethods.instapay.accountName} onChange={(e) => setForm({ ...form, paymentMethods: { ...form.paymentMethods, instapay: { ...form.paymentMethods.instapay, accountName: e.target.value } } })} placeholder="Name shown in InstaPay" />
            </div>
            <div className="adfield">
              <label className="adcheck"><input type="checkbox" checked={form.paymentMethods.vodafone.enabled} onChange={(e) => setForm({ ...form, paymentMethods: { ...form.paymentMethods, vodafone: { ...form.paymentMethods.vodafone, enabled: e.target.checked } } })} /> Enable Vodafone Cash</label>
              <label htmlFor="set-vodafone-number">Vodafone Cash wallet number</label>
              <input id="set-vodafone-number" type="tel" inputMode="tel" value={form.paymentMethods.vodafone.number} onChange={(e) => setForm({ ...form, paymentMethods: { ...form.paymentMethods, vodafone: { ...form.paymentMethods.vodafone, number: e.target.value } } })} placeholder="01xxxxxxxxx" />
            </div>
          </div>
          <p className="hint" style={{ marginTop: 14 }}>
            Card payments (Visa / Mastercard) are intentionally not enabled: they require a licensed payment provider (for example Stripe, Paymob or Checkout.com). We never collect or store card numbers, CVVs or banking passwords. When you sign up with a provider, connect it in <code>api/orders.js</code> and add its option here — the checkout UI is already built to show a configured provider.
          </p>
        </section>
        <section className="adsec">
          <h2>Authentication</h2>
          <p style={{ fontSize: 13.5, color: 'rgba(244,234,217,0.65)' }}>
            {isFirebase
              ? <>Administrator sign-in is handled by Firebase Authentication. Access is limited to the verified {ADMIN_EMAIL} owner plus any admins you add. Manage admins and change your password from <Link to="/admin/users" style={{ color: 'var(--gold)' }}>Admin access</Link>.</>
              : <>This demo runs on local authentication. Manage admins and change your password from <Link to="/admin/users" style={{ color: 'var(--gold)' }}>Admin access</Link>. On the live deployment, sign-in is handled securely by Firebase Authentication.</>}
          </p>
        </section>
        <div className="adbar" style={{ marginTop: 18 }}>
          <button className="btn btn--primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
        </div>
      </form>
    </AdminLayout>
  );
}
