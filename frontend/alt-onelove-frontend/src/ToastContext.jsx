import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ToastContext, FLASH_KEY } from './toast';

const TYPES = {
  success: { icon: 'bi-check-circle-fill', color: 'var(--bs-success)' },
  error: { icon: 'bi-exclamation-triangle-fill', color: 'var(--bs-danger)' },
  info: { icon: 'bi-info-circle-fill', color: 'var(--accent-teal)' },
};

// Только читаем (без удаления), удаляем в эффекте: так сообщение не теряется в StrictMode.
function readFlash() {
  try {
    const raw = sessionStorage.getItem(FLASH_KEY);
    if (!raw) return [];
    const { type, text } = JSON.parse(raw);
    return [{ id: 0, type, text }];
  } catch {
    return [];
  }
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState(readFlash);
  const nextId = useRef(1);

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (type, text) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, type, text }]);
      setTimeout(() => remove(id), type === 'error' ? 6000 : 4000);
    },
    [remove]
  );

  // Сообщение, оставшееся после перезагрузки: убираем из хранилища и прячем через 4 секунды
  useEffect(() => {
    sessionStorage.removeItem(FLASH_KEY);
    const timer = setTimeout(() => remove(0), 4000);
    return () => clearTimeout(timer);
  }, [remove]);

  const api = useMemo(
    () => ({
      success: (text) => show('success', text),
      error: (text) => show('error', text),
      info: (text) => show('info', text),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 2000 }}>
        {toasts.map((t) => {
          const meta = TYPES[t.type] || TYPES.info;
          return (
            <div
              key={t.id}
              className="toast show mb-2"
              role="alert"
              style={{
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-color)',
                border: '1px solid var(--border-color)',
                borderLeft: `4px solid ${meta.color}`,
              }}
            >
              <div className="d-flex align-items-start gap-2 p-3">
                <i className={`bi ${meta.icon}`} style={{ color: meta.color }}></i>
                <div className="flex-grow-1 small">{t.text}</div>
                <button type="button" className="btn-close btn-sm" aria-label="Закрыть" onClick={() => remove(t.id)}></button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}