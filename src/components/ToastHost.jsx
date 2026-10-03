import { useStore } from '../store/StoreContext.jsx';

export default function ToastHost() {
  const { toasts } = useStore();
  if (!toasts.length) return null;
  return (
    <div className="toast" aria-live="polite">
      {toasts.map((t) => (
        <div className="toast__inner" key={t.id}>{t.message}</div>
      ))}
    </div>
  );
}
