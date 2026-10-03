import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { useStore } from '../../store/StoreContext.jsx';
import * as catalog from '../../services/productService.js';
import { ADMIN_EMAIL } from '../../services/firebaseConfig.js';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

export default function Settings() {
  const { t } = useLanguage();
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

  if (!form) return <AdminLayout title="Settings"><div className="adempty">{t('Loading…')}</div></AdminLayout>;

  const save = async (e) => {
    e.preventDefault();
    const threshold = Number(form.freeDeliveryThreshold);
    const low = Number(form.defaultLowStockThreshold);
    if (!Number.isFinite(threshold) || threshold < 0 || !Number.isFinite(low) || low < 0) {
      toast(t('Thresholds must be valid numbers of 0 or more.'));
      return;
    }
    if (form.paymentMethods.instapay.enabled && !form.paymentMethods.instapay.account.trim()) { toast(t('Add the InstaPay account before enabling it.')); return; }
    if (form.paymentMethods.vodafone.enabled && !form.paymentMethods.vodafone.number.trim()) { toast(t('Add the Vodafone Cash number before enabling it.')); return; }
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
      toast(t(result.message || 'Unable to save settings.'));
      return;
    }
    await refreshCatalog();
    toast(t('Settings saved.'));
  };

  return (
    <AdminLayout title="Settings">
      <form onSubmit={save}>
        <section className="adsec" style={{ marginTop: 0 }}>
          <h2>{t('Storefront')}</h2>
          <div className="adfield">
            <label htmlFor="set-ann">{t('Announcement bar')}</label>
            <input id="set-ann" value={form.announcement} onChange={(e) => setForm({ ...form, announcement: e.target.value })} />
            <span className="hint">{t('Shown at the top of every customer page.')}</span>
          </div>
          <div className="adgrid">
            <div className="adfield">
              <label htmlFor="set-free">{t('Free delivery threshold (EGP)')}</label>
              <input id="set-free" type="number" min="0" value={form.freeDeliveryThreshold} onChange={(e) => setForm({ ...form, freeDeliveryThreshold: e.target.value })} />
            </div>
            <div className="adfield">
              <label htmlFor="set-low">{t('Default low stock threshold')}</label>
              <input id="set-low" type="number" min="0" value={form.defaultLowStockThreshold} onChange={(e) => setForm({ ...form, defaultLowStockThreshold: e.target.value })} />
              <span className="hint">{t('Applied to new products; existing products keep their own threshold.')}</span>
            </div>
          </div>
        </section>
        <section className="adsec">
          <h2>{t('Payment methods')}</h2>
          <p className="hint">{t('For InstaPay and Vodafone Cash, shoppers transfer from their own app and enter the transfer reference. Verify transfers in Orders before marking them paid. These options do not charge or confirm payments automatically.')}</p>
          <label className="adcheck"><input type="checkbox" checked={form.paymentMethods.cod.enabled} onChange={(e) => setForm({ ...form, paymentMethods: { ...form.paymentMethods, cod: { enabled: e.target.checked } } })} /> {t('Cash on delivery')}</label>
          <div className="adgrid" style={{ marginTop: 16 }}>
            <div className="adfield">
              <label className="adcheck"><input type="checkbox" checked={form.paymentMethods.instapay.enabled} onChange={(e) => setForm({ ...form, paymentMethods: { ...form.paymentMethods, instapay: { ...form.paymentMethods.instapay, enabled: e.target.checked } } })} /> {t('Enable InstaPay')}</label>
              <label htmlFor="set-instapay-account">{t('InstaPay account / payment address')}</label>
              <input id="set-instapay-account" value={form.paymentMethods.instapay.account} onChange={(e) => setForm({ ...form, paymentMethods: { ...form.paymentMethods, instapay: { ...form.paymentMethods.instapay, account: e.target.value } } })} placeholder={t('e.g. account address or phone')} />
              <label htmlFor="set-instapay-name">{t('Account holder name')}</label>
              <input id="set-instapay-name" value={form.paymentMethods.instapay.accountName} onChange={(e) => setForm({ ...form, paymentMethods: { ...form.paymentMethods, instapay: { ...form.paymentMethods.instapay, accountName: e.target.value } } })} placeholder={t('Name shown in InstaPay')} />
            </div>
            <div className="adfield">
              <label className="adcheck"><input type="checkbox" checked={form.paymentMethods.vodafone.enabled} onChange={(e) => setForm({ ...form, paymentMethods: { ...form.paymentMethods, vodafone: { ...form.paymentMethods.vodafone, enabled: e.target.checked } } })} /> {t('Enable Vodafone Cash')}</label>
              <label htmlFor="set-vodafone-number">{t('Vodafone Cash wallet number')}</label>
              <input id="set-vodafone-number" type="tel" inputMode="tel" value={form.paymentMethods.vodafone.number} onChange={(e) => setForm({ ...form, paymentMethods: { ...form.paymentMethods, vodafone: { ...form.paymentMethods.vodafone, number: e.target.value } } })} placeholder="01xxxxxxxxx" />
            </div>
          </div>
        </section>
        <section className="adsec">
          <h2>{t('Authentication')}</h2>
          <p style={{ fontSize: 13.5, color: 'rgba(244,234,217,0.65)' }}>
            {t('Administrator access is managed by Firebase Authentication and restricted to the verified')} {ADMIN_EMAIL} {t('account. Use “Forgot password?” on the admin login page to change a forgotten password.')}
          </p>
        </section>
        <div className="adbar" style={{ marginTop: 18 }}>
          <button className="btn btn--primary" type="submit" disabled={saving}>{t(saving ? 'Saving…' : 'Save settings')}</button>
        </div>
      </form>
    </AdminLayout>
  );
}
