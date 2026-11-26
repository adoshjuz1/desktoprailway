import { createContext, useContext } from 'react';

// Общая часть уведомлений: контекст, хук useToast и flashToast.
// Компонент ToastProvider лежит отдельно в ToastContext.jsx.
export const ToastContext = createContext(null);

export const FLASH_KEY = 'flash_toast';

// Сообщение, которое нужно показать после перезагрузки страницы (например, после входа).
export function flashToast(type, text) {
  sessionStorage.setItem(FLASH_KEY, JSON.stringify({ type, text }));
}

export const useToast = () => useContext(ToastContext);