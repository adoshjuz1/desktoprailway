import React from 'react';

const cardStyle = {
  backgroundColor: 'var(--card-bg)',
  color: 'var(--text-color)',
  borderColor: 'var(--border-color)',
};

export default function PaymentCardsPage() {
  return (
    <div className="card border rounded-4 p-5 text-center" style={cardStyle}>
      <div style={{ fontSize: '3rem' }}>💳</div>
      <h5 className="fw-bold mt-3 mb-2">У вас нет сохранённых карт</h5>
      <p className="text-muted small mb-4">
        Добавьте и сохраните данные платёжной карты для быстрой оплаты ваших заказов
      </p>
      <button type="button" className="btn btn-teal px-4" disabled>
        Добавить карту
      </button>
      <p className="small text-muted mt-3 mb-0">
        В учебной версии сохранение карт отключено
      </p>
    </div>
  );
}
