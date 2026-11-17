import React from 'react';
import { Link } from 'react-router-dom';

const cardStyle = {
  backgroundColor: 'var(--card-bg)',
  color: 'var(--text-color)',
  borderColor: 'var(--border-color)',
};

export default function InsurancePage() {
  return (
    <div className="card border rounded-4 p-5 text-center" style={cardStyle}>
      <div style={{ fontSize: '3rem' }}>🛡️</div>
      <h5 className="fw-bold mt-3 mb-2">Заказы отсутствуют</h5>
      <p className="text-muted small mb-4">
        После бронирования билетов ваш заказ будет отображаться здесь
      </p>
      <Link to="/" className="btn btn-teal px-4">
        Перейти к поиску
      </Link>
    </div>
  );
}
