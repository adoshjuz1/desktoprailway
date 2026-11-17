import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000';
const money = (n) => `${Math.round(n).toLocaleString('ru-RU')} ₸`;

const cardStyle = {
  backgroundColor: 'var(--card-bg)',
  color: 'var(--text-color)',
  borderColor: 'var(--border-color)',
};

const statusLabel = (s) => {
  if (s === 'paid') return { text: 'Оплачен', className: 'text-success' };
  if (s === 'cancelled' || s === 'canceled') return { text: 'Аннулирован', className: 'text-danger' };
  return { text: s || '—', className: 'text-muted' };
};

export default function Mytickets() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    let user = null;
    try {
      user = JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      user = null;
    }
    const email = user?.email || user?.username;
    if (!email) {
      setLoading(false);
      return;
    }

    axios
      .get(`${API_URL}/api/bookings`, { params: { user_email: email } })
      .then((res) => setBookings(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError('Не удалось загрузить заказы'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-muted py-5 text-center">Загрузка заказов…</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  if (bookings.length === 0) {
    return (
      <div className="card border rounded-4 p-5 text-center" style={cardStyle}>
        <div style={{ fontSize: '3rem' }}>🧳</div>
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

  return (
    <div className="d-flex flex-column gap-3">
      {bookings.map((b) => {
        const st = statusLabel(b.status);
        const isOpen = expanded === b.booking_id;
        return (
          <div key={b.booking_id} className="card border rounded-4 p-3 p-md-4" style={cardStyle}>
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <div className="small text-muted mb-1">№ {b.booking_id}</div>
                <div className="fw-bold">
                  {b.from_city} → {b.to_city}
                </div>
                <div className="small text-muted">
                  {b.departure_time}
                  {b.departure_time ? ', ' : ''}
                  {b.travel_date}
                  {b.passengers_count ? `, ${b.passengers_count} пассажир` : ''}
                </div>
              </div>
              <div className="text-end">
                <div className={`fw-semibold ${st.className}`}>{st.text}</div>
                <div className="fw-bold">{money(b.total_price)}</div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setExpanded(isOpen ? null : b.booking_id)}
              >
                {isOpen ? 'Скрыть' : 'Подробнее'}
              </button>
            </div>

            {isOpen && (
              <div className="mt-3 pt-3 border-top" style={{ borderColor: 'var(--border-color)' }}>
                <div className="small text-muted mb-2">
                  Поезд {b.train_number} · вагон {b.carriage_number}
                </div>
                {(b.tickets || []).map((t) => (
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
                {b.extras_price > 0 && (
                  <div className="d-flex justify-content-between small text-muted">
                    <span>Доп. услуги</span>
                    <span>{money(b.extras_price)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
