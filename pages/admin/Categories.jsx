import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import { useStore } from '../../store/StoreContext.jsx';
import * as catalog from '../../services/productService.js';

export default function Categories() {
  const { allProducts, refreshCatalog, toast } = useStore();
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null); // { id, name }
  const [confirm, setConfirm] = useState(null);

  const load = () => catalog.listCategories().then(setCategories);
  useEffect(() => { load(); }, []);

  const countFor = (cat) => allProducts.filter((p) => p.category === cat.name).length;

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('Category name is required.');
      return;
    }
    const result = await catalog.saveCategory({ name });
    if (!result.ok) {
      toast(result.message);
      return;
    }
    setName('');
    await load();
    await refreshCatalog();
    toast('Category created.');
  };

  const saveEdit = async () => {
    const result = await catalog.saveCategory(editing);
    if (!result.ok) {
      toast(result.message);
      return;
    }
    // Keep products assigned when a category is renamed.
    if (result.created === false) {
      const before = categories.find((c) => c.id === editing.id);
      if (before && before.name !== editing.name) {
        for (const p of allProducts.filter((x) => x.category === before.name)) {
          await catalog.updateProduct(p.id, { category: editing.name });
        }
      }
    }
    setEditing(null);
    await load();
    await refreshCatalog();
    toast('Category updated.');
  };

  const remove = async () => {
    const target = confirm;
    setConfirm(null);
    const result = await catalog.deleteCategory(target.id);
    if (!result.ok) {
      toast(result.message);
      return;
    }
    await load();
    await refreshCatalog();
    toast('Category deleted.');
  };

  return (
    <AdminLayout title="Categories">
      <section className="adsec" style={{ marginTop: 0 }}>
        <h2>Create category</h2>
        <form onSubmit={create} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="adfield" style={{ margin: 0, flex: '1 1 220px' }}>
            <label htmlFor="cat-name">Category name</label>
            <input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="New Arrivals" />
          </div>
          <button className="btn btn--primary" type="submit">+ Add Category</button>
        </form>
      </section>

      <section className="adsec">
        <div className="adsec__head"><h2>{categories.length} categories</h2></div>
        <div className="adtable-wrap">
          <table className="adtable responsive">
            <thead>
              <tr><th>Category</th><th className="num">Products</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td data-label="Category"><span className="prod-name">{c.name}</span></td>
                  <td data-label="Products" className="num">{countFor(c)}</td>
                  <td data-label="Actions">
                    <div className="ad__actions">
                      <button onClick={() => setEditing({ ...c })}>Edit</button>
                      <button className="danger" onClick={() => setConfirm(c)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editing && (
        <div className="admodal" role="dialog" aria-modal="true" aria-label="Edit category">
          <div className="admodal__box">
            <h3>Edit category</h3>
            <div className="adfield">
              <label htmlFor="cat-edit-name">Name</label>
              <input id="cat-edit-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <span className="hint">Renaming also moves every product assigned to this category.</span>
            </div>
            <div className="admodal__actions">
              <button className="btn btn--ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn--primary" onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title="Delete Category?"
        confirmLabel="Delete Category"
        body={confirm && <p>Are you sure you want to delete <b>“{confirm.name}”</b>? Categories with products assigned cannot be deleted.</p>}
        onConfirm={remove}
        onCancel={() => setConfirm(null)}
      />
    </AdminLayout>
  );
}
