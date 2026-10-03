import { useEffect, useRef, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import { fileToDataUrl } from '../../components/admin/ImageManager.jsx';
import { useStore } from '../../store/StoreContext.jsx';
import * as catalog from '../../services/productService.js';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

export default function Categories() {
  const { t } = useLanguage();
  const { allProducts, toast } = useStore();
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [editing, setEditing] = useState(null); // { id, name, image }
  const [confirm, setConfirm] = useState(null);
  const fileRef = useRef(null);
  const editFileRef = useRef(null);

  const load = () => catalog.listCategories().then(setCategories);
  useEffect(() => { load(); }, []);

  const countFor = (cat) => allProducts.filter((p) => p.category === cat.name).length;

  const pickImage = async (file, setter) => {
    try {
      setter(await fileToDataUrl(file));
    } catch {
      toast(t('Image upload failed. Please try again.'));
    }
  };

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast(t('Category name is required.'));
      return;
    }
    const result = await catalog.saveCategory({ name, image });
    if (!result.ok) {
      toast(t(result.message));
      return;
    }
    setName('');
    setImage('');
    await load();
    toast(t('Category created.'));
  };

  const saveEdit = async () => {
    const result = await catalog.saveCategory(editing);
    if (!result.ok) {
      toast(t(result.message));
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
    toast(t('Category updated.'));
  };

  const remove = async () => {
    const target = confirm;
    setConfirm(null);
    const result = await catalog.deleteCategory(target.id);
    if (!result.ok) {
      toast(t(result.message));
      return;
    }
    await load();
    toast(t('Category deleted.'));
  };

  return (
    <AdminLayout title="Categories">
      <section className="adsec" style={{ marginTop: 0 }}>
        <h2>{t('Create category')}</h2>
        <form onSubmit={create} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="adfield" style={{ margin: 0, flex: '1 1 220px' }}>
            <label htmlFor="cat-name">{t('Category name')}</label>
            <input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('New Arrivals')} />
          </div>
          <div className="adfield" style={{ margin: 0 }}>
            <label>{t('Category image')}</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {image && <img src={image} alt="" style={{ width: 34, height: 44, objectFit: 'cover', borderRadius: 6 }} />}
              <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
                {t(image ? 'Replace' : 'Upload')}
              </button>
              {image && <button type="button" className="btn btn--text" onClick={() => setImage('')}>{t('Clear')}</button>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files[0] && pickImage(e.target.files[0], setImage)} />
          </div>
          <button className="btn btn--primary" type="submit">+ {t('Add Category')}</button>
        </form>
      </section>

      <section className="adsec">
        <div className="adsec__head"><h2>{categories.length} {t('categories')}</h2></div>
        <div className="adtable-wrap">
          <table className="adtable responsive">
            <thead>
              <tr><th>{t('Image')}</th><th>{t('Category')}</th><th className="num">{t('Products')}</th><th>{t('Actions')}</th></tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td data-label="Image">{c.image ? <img src={c.image} alt="" /> : <span className="badge badge--mute">—</span>}</td>
                  <td data-label="Category"><span className="prod-name">{c.name}</span></td>
                  <td data-label="Products" className="num">{countFor(c)}</td>
                  <td data-label="Actions">
                    <div className="ad__actions">
                      <button onClick={() => setEditing({ ...c })}>{t('Edit')}</button>
                      <button className="danger" onClick={() => setConfirm(c)}>{t('Delete')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editing && (
        <div className="admodal" role="dialog" aria-modal="true" aria-label={t('Edit category')}>
          <div className="admodal__box">
            <h3>{t('Edit category')}</h3>
            <div className="adfield">
              <label htmlFor="cat-edit-name">{t('Name')}</label>
              <input id="cat-edit-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <span className="hint">{t('Renaming also moves every product assigned to this category.')}</span>
            </div>
            <div className="adfield">
              <label>{t('Image')}</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {editing.image && <img src={editing.image} alt="" style={{ width: 44, height: 56, objectFit: 'cover', borderRadius: 8 }} />}
                <button type="button" className="btn btn--ghost" onClick={() => editFileRef.current?.click()}>{t('Upload')}</button>
                {editing.image && <button type="button" className="btn btn--text" onClick={() => setEditing({ ...editing, image: '' })}>{t('Remove')}</button>}
              </div>
              <input ref={editFileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files[0] && pickImage(e.target.files[0], (img) => setEditing({ ...editing, image: img }))} />
            </div>
            <div className="admodal__actions">
              <button className="btn btn--ghost" onClick={() => setEditing(null)}>{t('Cancel')}</button>
              <button className="btn btn--primary" onClick={saveEdit}>{t('Save')}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={t('Delete Category?')}
        confirmLabel={t('Delete Category')}
        body={confirm && <p>{t('Are you sure you want to delete')} <b>“{confirm.name}”</b>? {t('Categories with products assigned cannot be deleted.')}</p>}
        onConfirm={remove}
        onCancel={() => setConfirm(null)}
      />
    </AdminLayout>
  );
}
