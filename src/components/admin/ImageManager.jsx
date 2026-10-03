import { useRef } from 'react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

// Product photos live inside Firestore documents in this Spark-plan setup.
const MAX_SIDE = 640;

export const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('not-image'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode'));
      img.onload = () => {
        const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.62));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

export default function ImageManager({ images, onChange, onError, altBase = 'product' }) {
  const { t } = useLanguage();
  const inputRef = useRef(null);

  const upload = async (files) => {
    const added = [];
    for (const file of files) {
      try {
        const src = await fileToDataUrl(file);
        added.push({ src, alt: `${altBase} image` });
      } catch {
      onError(t('Image upload failed. Please try again.'));
        return;
      }
    }
    if (added.length) onChange([...images, ...added]);
  };

  const move = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const setPrimary = (index) => {
    const next = [...images];
    next.unshift(next.splice(index, 1)[0]);
    onChange(next);
  };

  const remove = (index) => {
    if (images.length === 1) {
      onError(t('A product needs at least one image.'));
      return;
    }
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="imgs">
        {images.map((img, i) => (
          <div className="imgs__item" key={img.src.slice(-24) + i}>
            <div className={`imgs__thumb ${i === 0 ? 'imgs__thumb--primary' : ''}`}>
              <img src={img.src} alt={img.alt || `${altBase} image ${i + 1}`} />
              {i === 0 && <span className="imgs__primary-tag">{t('Primary')}</span>}
            </div>
            <div className="imgs__ctrl">
              {i !== 0 && <button type="button" onClick={() => setPrimary(i)} title={t('Make primary')}>★</button>}
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title={t('Move earlier')}>←</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} title={t('Move later')}>→</button>
              <button type="button" className="danger" onClick={() => remove(i)} title={t('Delete image')}>✕</button>
            </div>
          </div>
        ))}
        <div className="imgs__item">
          <button
            type="button"
            className="btn btn--ghost btn--block"
            style={{ aspectRatio: '3/4', borderRadius: '12px 12px 6px 6px' }}
            onClick={() => inputRef.current?.click()}
          >
            + {t('Add')}
          </button>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          upload([...e.target.files]);
          e.target.value = '';
        }}
      />
      <p className="hint" style={{ marginTop: 8, fontSize: 12, color: 'rgba(244,234,217,0.45)' }}>
        {t('The first image is the main image customers see. Images are resized to fit the store database limit.')}
      </p>
    </div>
  );
}
