import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { useStore } from '../../store/StoreContext.jsx';
import * as catalog from '../../services/productService.js';
import { ADMIN_EMAIL } from '../../services/firebaseConfig.js';
import { fileToDataUrl } from '../../components/admin/ImageManager.jsx';

const DEFAULT_HOMEPAGE_IMAGES = {
  hero: '/images/az-watch-hero.png',
  gift: '/images/az-watch-gift.png',
};

export default function Settings() {
  const { settings, refreshCatalog, toast } = useStore();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState('');

  useEffect(() => {
    if (settings && Object.keys(settings).length) {
      setForm({
        announcement: settings.announcement ?? '',
        freeDeliveryThreshold: settings.freeDeliveryThreshold ?? 1800,
        defaultLowStockThreshold: settings.defaultLowStockThreshold ?? 6,
        homepageImages: {
          hero: settings.homepageImages?.hero || '',
          gift: settings.homepageImages?.gift || '',
        },
        paymentMethods: {
          cod: { enabled: settings.paymentMethods?.cod?.enabled ?? true },
          instapay: { enabled: settings.paymentMethods?.instapay?.enabled ?? false, account: settings.paymentMethods?.instapay?.account || '', accountName: settings.paymentMethods?.instapay?.accountName || '' },
          vodafone: { enabled: settings.paymentMethods?.vodafone?.enabled ?? false, number: settings.paymentMethods?.vodafone?.number || '' },
        },
      });
    }
  }, [settings]);

  if (!form) return <AdminLayout title="Settings"><div className="adempty">Loading…</div></AdminLayout>;

  const chooseHomepageImage = async (key, file) => {
    if (!file) return;
    setUploadingImage(key);
    try {
      const image = await fileToDataUrl(file);
      setForm((current) => ({ ...current, homepageImages: { ...current.homepageImages, [key]: image } }));
    } catch {
      toast('Image upload failed. Please choose a valid image and try again.');
    } finally {
      setUploadingImage('');
    }
  };

  const resetHomepageImage = (key) =>
    setForm((current) => ({ ...current, homepageImages: { ...current.homepageImages, [key]: '' } }));

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
      homepageImages: form.homepageImages,
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
            <span className="hint">Shown at the top of every customer page.</span>
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
          <h2>Homepage images</h2>
          <p className="hint">Choose the photos shown in the homepage hero and gift section. Images are resized before saving. Remove a custom image to restore the AZ default.</p>
          <div className="adgrid" style={{ marginTop: 16 }}>
            {[
              { key: 'hero', label: 'Hero banner', fallback: DEFAULT_HOMEPAGE_IMAGES.hero, ratio: '4 / 5' },
              { key: 'gift', label: 'Gift section', fallback: DEFAULT_HOMEPAGE_IMAGES.gift, ratio: '4 / 3' },
            ].map(({ key, label, fallback, ratio }) => (
              <div className="adfield" key={key}>
                <label htmlFor={`set-home-${key}`}>{label}</label>
                <img src={form.homepageImages[key] || fallback} alt={`${label} preview`} style={{ display: 'block', width: '100%', maxWidth: 360, aspectRatio: ratio, objectFit: 'cover', borderRadius: 12, marginBottom: 10, background: '#211812' }} />
                <input id={`set-home-${key}`} type="file" accept="image/*" onChange={(e) => { chooseHomepageImage(key, e.target.files?.[0]); e.target.value = ''; }} />
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
                  <span className="hint">{form.homepageImages[key] ? 'Custom image selected' : 'Using AZ default image'}</span>
                  {form.homepageImages[key] && <button className="btn btn--ghost" type="button" onClick={() => resetHomepageImage(key)}>Restore default</button>}
                  {uploadingImage === key && <span className="hint">Preparing image…</span>}
                </div>
              </div>
            ))}
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
        </section>
        <section className="adsec">
          <h2>Authentication</h2>
          <p style={{ fontSize: 13.5, color: 'rgba(244,234,217,0.65)' }}>
            Administrator access is managed by Firebase Authentication and restricted to the verified {ADMIN_EMAIL} account.
            Use “Forgot password?” on the admin login page to change a forgotten password.
          </p>
        </section>
        <div className="adbar" style={{ marginTop: 18 }}>
          <button className="btn btn--primary" type="submit" disabled={saving || Boolean(uploadingImage)}>{uploadingImage ? 'Preparing image…' : saving ? 'Saving…' : 'Save settings'}</button>
        </div>
      </form>
    </AdminLayout>
  );
}
