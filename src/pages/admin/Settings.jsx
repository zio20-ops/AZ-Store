import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { useStore } from '../../store/StoreContext.jsx';
import * as catalog from '../../services/productService.js';

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
    setSaving(true);
    const result = await catalog.saveSettings({
      announcement: form.announcement.trim(),
      freeDeliveryThreshold: threshold,
      defaultLowStockThreshold: low,
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
          <h2>Authentication</h2>
          <p style={{ fontSize: 13.5, color: 'rgba(244,234,217,0.65)' }}>
            This deployment uses the development mock auth layer (hashed demo credentials, expiring local session tokens).
            Production must connect <code>POST /api/admin/login</code>, <code>POST /api/admin/logout</code> and <code>GET /api/admin/me</code>
            with server-side hashing, http-only cookies, authorization and rate limiting.
          </p>
        </section>
        <div className="adbar" style={{ marginTop: 18 }}>
          <button className="btn btn--primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
        </div>
      </form>
    </AdminLayout>
  );
}
