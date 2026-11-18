import { Fragment } from 'react';

const STEPS = ['Результаты поиска', 'Выбор места', 'Бронирование', 'Оплата', 'Ваш заказ'];

// Хлебные крошки оформления заказа, один компонент на все страницы.
// current — номер активного шага (0–4).
// onStepClick(i) — необязательный: если передан, пройденные шаги становятся кнопками.
export default function Steps({ current, onStepClick, className = 'mb-4' }) {
  return (
    <nav
      aria-label="Шаги оформления заказа"
      className={`d-flex flex-wrap gap-2 align-items-center small ${className}`}
    >
      {STEPS.map((title, i) => {
        const done = i < current;
        const active = i === current;
        const content = (
          <>
            {done && <i className="bi bi-check-lg me-1"></i>}
            {title}
          </>
        );

        return (
          <Fragment key={title}>
            {done && onStepClick ? (
              <button
                type="button"
                className="btn btn-link p-0 text-success text-decoration-none"
                style={{ fontSize: 'inherit' }}
                onClick={() => onStepClick(i)}
              >
                {content}
              </button>
            ) : (
              <span
                className={done ? 'text-success' : active ? 'fw-bold' : 'text-muted'}
                style={active ? { color: 'var(--accent-teal)' } : undefined}
                aria-current={active ? 'step' : undefined}
              >
                {content}
              </span>
            )}
            {i < STEPS.length - 1 && <i className="bi bi-chevron-right text-muted"></i>}
          </Fragment>
        );
      })}
    </nav>
  );
}