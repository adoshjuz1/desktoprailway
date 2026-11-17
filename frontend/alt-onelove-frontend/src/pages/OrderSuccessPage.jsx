import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

const money = (n) => `${Math.round(n).toLocaleString('ru-RU')} ₸`;

const cardStyle = {
  backgroundColor: 'var(--card-bg)',
  color: 'var(--text-color)',
  borderColor: 'var(--border-color)',
};

function Steps() {
  const items = ['Результаты поиска', 'Выбор места', 'Бронирование', 'Оплата', 'Ваш заказ'];
  return (
    <div className="d-flex flex-wrap gap-2 align-items-center small mb-4">
      {items.map((item, i) => (
        <React.Fragment key={item}>
          <span
            className={i < 4 ? 'text-success' : 'fw-bold'}
            style={i === 4 ? { color: 'var(--accent-teal)' } : undefined}
          >
            {i < 4 && <i className="bi bi-check-lg me-1"></i>}
            {item}
          </span>
          {i < items.length - 1 && <i className="bi bi-chevron-right text-muted"></i>}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function OrderSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state;

  if (!data || !data.booking) {
    return (
      <div className="container my-5 text-center">
        <div className="alert alert-warning d-inline-block">
          Информация о заказе не найдена.
        </div>
        <div>
          <Link to="/" className="btn btn-teal mt-3">
            На главную
          </Link>
        </div>
      </div>
    );
  }

  const { booking, order, email, total } = data;

  return (
    <div className="container my-4 my-md-5" style={{ maxWidth: '760px' }}>
      <Steps />

      <div className="card p-4 p-md-5 border rounded-4 shadow-sm" style={cardStyle}>
        <div className="text-center mb-4">
          <i
            className="bi bi-check-circle-fill"
            style={{ fontSize: '3rem', color: 'var(--accent-teal)' }}
          ></i>
          <h2 className="fw-bold mt-2">Заказ №{booking.booking_id} оплачен</h2>
          <p className="text-muted mb-0">
            Электронные билеты отправлены на {email}
          </p>
        </div>

        <div className="rounded-3 p-3 mb-4" style={{ background: 'var(--bg-light)' }}>
          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted">Маршрут</span>
            <span className="fw-semibold">
              {order.fromCity} → {order.toCity}
            </span>
          </div>
          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted">Поезд</span>
            <span>
              {order.trainNumber} · вагон {order.carriageNumber}
              {order.carriageType ? ` (${order.carriageType})` : ''}
            </span>
          </div>
          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted">Дата</span>
            <span>
              {order.departureDate}, {order.departureTime}
            </span>
          </div>
          {booking.tickets && booking.tickets.length > 0 && (
            <>
              <hr style={{ borderColor: 'var(--border-color)' }} />
              {booking.tickets.map((t) => (
                <div
                  key={t.seat_number}
                  className="d-flex justify-content-between small mb-1"
                >
                  <span>
                    Место {t.seat_number}
                    {t.passenger ? ` · ${t.passenger}` : ''}
                  </span>
                  <span>{money(t.price)}</span>
                </div>
              ))}
            </>
          )}
          {booking.extras_price > 0 && (
            <div className="d-flex justify-content-between small mb-1 text-muted">
              <span>Дополнительные услуги</span>
              <span>{money(booking.extras_price)}</span>
            </div>
          )}
          <hr style={{ borderColor: 'var(--border-color)' }} />
          <div className="d-flex justify-content-between fs-5 fw-bold">
            <span>Итого</span>
            <span>{money(booking.total_price ?? total)}</span>
          </div>
        </div>

        <div className="alert alert-info small mb-4">
          В учебной версии оплата имитируется: заказ сохранён как оплаченный без
          реального списания денег.
        </div>

        <div className="d-flex flex-wrap gap-2 justify-content-center">
          <Link to="/" className="btn btn-teal px-4">
            На главную
          </Link>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate('/my-tickets')}
          >
            Мои билеты
          </button>
        </div>
      </div>
    </div>
  );
}
