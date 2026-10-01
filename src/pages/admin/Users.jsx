import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import * as auth from '../../services/authService.js';
import { useStore } from '../../store/StoreContext.jsx';

const keyOf = (u) => u.uid || u.id;
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function Users() {
  const { toast } = useStore();
  const session = auth.me();
  const myKey = session?.uid;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(null);

  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [adding, setAdding] = useState(false);

  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [changing, setChanging] = useState(false);

  const [pending, setPending] = useState(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await auth.listUsers();
    setListError(result.ok ? null : result.message || 'Could not load admin users.');
    setUsers(result.users || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const submitAdd = async (e) => {
    e.preventDefault();
    setAdding(true);
    const result = await auth.addUser({ email: addEmail, password: addPassword });
    setAdding(false);
    if (!result.ok) { toast(result.message || 'Could not add that admin.'); return; }
    setAddEmail(''); setAddPassword('');
    toast(`Added ${result.user.email}. Share the temporary password securely.`);
    await load();
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    if (next !== confirm) { toast('The new passwords do not match.'); return; }
    setChanging(true);
    const result = await auth.changePassword({ currentPassword: cur, newPassword: next });
    setChanging(false);
    if (!result.ok) { toast(result.message || 'Could not change the password.'); return; }
    setCur(''); setNext(''); setConfirm('');
    toast('Password changed.');
  };

  const confirmRemove = async () => {
    if (!pending) return;
    setRemoving(true);
    const result = await auth.removeUser(keyOf(pending));
    setRemoving(false);
    setPending(null);
    if (!result.ok) { toast(result.message || 'Could not remove that admin.'); return; }
    toast(`Removed ${pending.email}.`);
    await load();
  };

  return (
    <AdminLayout title="Admin access">
      <section className="adsec" style={{ marginTop: 0 }}>
        <div className="adsec__head"><h2>Administrators</h2></div>
        <p className="hint" style={{ fontSize: 12.5, marginBottom: 12 }}>
          Admins can manage the whole store. Passwords are never stored or shown in plain text — only secure digests are kept. The owner account cannot be removed.
        </p>
        {listError && <p className="field-error" role="alert">{listError}</p>}
        <div className="adtable-wrap">
          <table className="adtable responsive">
            <thead>
              <tr><th>Email</th><th>Role</th><th>Added</th><th className="num">Actions</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4}><div className="adempty">Loading…</div></td></tr>}
              {!loading && users.map((u) => {
                const isOwner = u.role === 'owner';
                const isSelf = keyOf(u) === myKey;
                return (
                  <tr key={keyOf(u)}>
                    <td data-label="Email"><span className="prod-name">{u.email}</span>{isSelf && <span className="hint"> (you)</span>}</td>
                    <td data-label="Role">{isOwner ? 'Owner' : 'Admin'}</td>
                    <td data-label="Added">{fmtDate(u.createdAt)}</td>
                    <td data-label="Actions" className="num">
                      <button
                        className="btn btn--ghost"
                        disabled={isOwner || isSelf}
                        title={isOwner ? 'The owner account cannot be removed.' : isSelf ? 'You cannot remove your own account.' : 'Remove admin'}
                        onClick={() => setPending(u)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && users.length === 0 && <tr><td colSpan={4}><div className="adempty">No admins found.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="adsec">
        <h2>Add an administrator</h2>
        <p className="hint">Create a sign-in for a teammate. They use this email and temporary password on the admin login page, then change it here.</p>
        <form onSubmit={submitAdd}>
          <div className="adgrid">
            <div className="adfield">
              <label htmlFor="u-email">Email</label>
              <input id="u-email" type="email" autoComplete="off" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="teammate@example.com" required />
            </div>
            <div className="adfield">
              <label htmlFor="u-pass">Temporary password</label>
              <input id="u-pass" type="password" autoComplete="new-password" value={addPassword} onChange={(e) => setAddPassword(e.target.value)} placeholder="At least 8 characters" required />
              <span className="hint">Share it through a private channel; it is stored only as a secure digest.</span>
            </div>
          </div>
          <div className="adbar" style={{ marginTop: 16 }}>
            <button className="btn btn--primary" type="submit" disabled={adding}>{adding ? 'Adding…' : 'Add administrator'}</button>
          </div>
        </form>
      </section>

      <section className="adsec">
        <h2>Change my password</h2>
        <p className="hint">Confirm your current password, then choose a new one of at least 8 characters.</p>
        <form onSubmit={submitPassword}>
          <div className="adgrid">
            <div className="adfield">
              <label htmlFor="p-cur">Current password</label>
              <input id="p-cur" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} required />
            </div>
            <div className="adfield">
              <label htmlFor="p-new">New password</label>
              <input id="p-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
            </div>
            <div className="adfield">
              <label htmlFor="p-conf">Confirm new password</label>
              <input id="p-conf" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
          </div>
          <div className="adbar" style={{ marginTop: 16 }}>
            <button className="btn btn--primary" type="submit" disabled={changing}>{changing ? 'Updating…' : 'Update password'}</button>
          </div>
        </form>
      </section>

      <ConfirmDialog
        open={Boolean(pending)}
        title="Remove administrator"
        body={pending ? <p style={{ fontSize: 14, opacity: 0.8 }}>Remove admin access for <b>{pending.email}</b>? They will no longer be able to sign in to the admin portal.</p> : null}
        confirmLabel={removing ? 'Removing…' : 'Remove'}
        onConfirm={confirmRemove}
        onCancel={() => setPending(null)}
      />
    </AdminLayout>
  );
}
