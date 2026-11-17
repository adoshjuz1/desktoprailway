import React from 'react';

const cardStyle = {
  backgroundColor: 'var(--card-bg)',
  color: 'var(--text-color)',
  borderColor: 'var(--border-color)',
};

export default function LoyaltyPage() {
  return (
    <div>
      <h5 className="fw-bold mb-3">Мои промокоды</h5>

      <div className="card border rounded-4 p-3 mb-4" style={cardStyle}>
        <div className="d-flex gap-2 align-items-start">
          <span
            className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
            style={{
              width: 32,
              height: 32,
              background: 'rgba(0, 180, 216, 0.15)',
              color: 'var(--accent-teal)',
            }}
          >
            <i className="bi bi-percent"></i>
          </span>
          <p className="small mb-0 text-muted">
            Покупая билеты у нас на сайте, вы можете получить промокод — уникальный 10-значный
            номер. При следующей покупке просто введите его в специальное поле и получите скидку.
          </p>
        </div>
      </div>

      <h6 className="fw-semibold mb-3">Мои промокоды</h6>
      <div className="card border rounded-4 overflow-hidden" style={cardStyle}>
        <div className="table-responsive">
          <table className="table table-borderless mb-0 small">
            <thead>
              <tr className="text-muted">
                <th className="px-3 py-3">Скидка</th>
                <th className="py-3">Промокод</th>
                <th className="py-3">Статус</th>
                <th className="py-3">Срок действия</th>
                <th className="py-3">Сервис</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="text-center text-muted py-4">
                  У вас пока нет промокодов
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
