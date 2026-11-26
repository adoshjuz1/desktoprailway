import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { trainsApi, apiErrorMessage } from '../api';
import { useToast } from '../toast';

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

// «1 пассажир», «2 пассажира», «5 пассажиров»
const passengersText = (n) => {
  const last = n % 10;
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return `${n} пассажиров`;
  if (last === 1) return `${n} пассажир`;
  if (last >= 2 && last <= 4) return `${n} пассажира`;
  return `${n} пассажиров`;
};

// Логин вошедшего пользователя (App.jsx сохраняет его в localStorage при входе)
const readUserEmail = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.email || user?.username || null;
  } catch {
    return null;
  }
};

export default function Mytickets() {
  const toast = useToast();
  const [email] = useState(readUserEmail);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(Boolean(email));
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
  // Окно возврата: { booking, info, error }, info приходит с сервера
  const [refund, setRefund] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!email) return;
    trainsApi
      .get('/api/bookings', { params: { user_email: email } })
      .then((res) => setBookings(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError('Не удалось загрузить заказы'))
      .finally(() => setLoading(false));
  }, [email]);

  const openRefund = (b) => {
    setRefund({ booking: b, info: null, error: '' });
    trainsApi
      .get(`/api/bookings/${b.booking_id}/refund`, { params: { user_email: email } })
      .then(({ data }) => setRefund((r) => (r ? { ...r, info: data } : r)))
      .catch((err) =>
        setRefund((r) => (r ? { ...r, error: apiErrorMessage(err, 'Не удалось получить условия возврата') } : r))
      );
  };

  const confirmRefund = async () => {
    const id = refund.booking.booking_id;
    setCancelling(true);
    try {
      const { data } = await trainsApi.post(`/api/bookings/${id}/cancel`, { user_email: email });
      setBookings((list) =>
        list.map((b) => (b.booking_id === id ? { ...b, status: 'cancelled', refund_amount: data.refund_amount } : b))
      );
      toast.success(`Заказ №${id} отменён. Вернём ${money(data.refund_amount)} ${data.eta}.`);
      setRefund(null);
    } catch (err) {
      setRefund((r) => (r ? { ...r, error: apiErrorMessage(err, 'Не удалось оформить возврат') } : r));
    } finally {
      setCancelling(false);
    }
  };

  if (!email) {
    return (
      <div className="card border rounded-4 p-5 text-center" style={cardStyle}>
        <div style={{ fontSize: '3rem' }}>🔒</div>
        <h5 className="fw-bold mt-3 mb-2">Войдите в аккаунт</h5>
        <p className="text-muted small mb-0">Заказы отображаются после входа.</p>
      </div>
    );
  }

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
        const isCancelled = b.status === 'cancelled';
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
                  {b.passengers_count ? `, ${passengersText(b.passengers_count)}` : ''}
                </div>
              </div>
              <div className="text-end">
                <div className={`fw-semibold ${st.className}`}>{st.text}</div>
                <div className="fw-bold">{money(b.total_price)}</div>
                {isCancelled && b.refund_amount != null && (
                  <div className="small text-muted">Возврат: {money(b.refund_amount)}</div>
                )}
              </div>
              <div className="d-flex gap-2">
                {b.status === 'paid' && (
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => openRefund(b)}>
                    Вернуть билеты
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setExpanded(isOpen ? null : b.booking_id)}
                >
                  {isOpen ? 'Скрыть' : 'Подробнее'}
                </button>
              </div>
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

      {/* Окно подтверждения возврата */}
      {refund && (
        <>
          <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Возврат билетов</h5>
                  <button type="button" className="btn-close" aria-label="Закрыть" onClick={() => setRefund(null)}></button>
                </div>
                <div className="modal-body">
                  <div className="small text-muted mb-3">
                    Заказ № {refund.booking.booking_id}: {refund.booking.from_city} → {refund.booking.to_city}, {refund.booking.travel_date}
                  </div>

                  {!refund.info && !refund.error && <div className="text-muted">Считаем сумму возврата…</div>}

                  {refund.error && <div className="alert alert-danger mb-0">{refund.error}</div>}

                  {refund.info && !refund.info.allowed && (
                    <div className="alert alert-warning mb-0">{refund.info.reason}</div>
                  )}

                  {refund.info && refund.info.allowed && (
                    <>
                      <div className="fs-5 fw-bold">Вернём {money(refund.info.refund_amount)}</div>
                      <div className="text-muted small mb-3">
                        {refund.info.percent}% от стоимости билетов, {refund.info.eta}.
                        Дополнительные услуги не возвращаются.
                      </div>
                      <div className="small">Места освободятся, отменить возврат будет нельзя.</div>
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setRefund(null)}>
                    {refund.info && refund.info.allowed ? 'Оставить билеты' : 'Закрыть'}
                  </button>
                  {refund.info && refund.info.allowed && (
                    <button type="button" className="btn btn-danger" disabled={cancelling} onClick={confirmRefund}>
                      {cancelling ? 'Оформляем…' : 'Вернуть билеты'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop show"></div>
        </>
      )}
    </div>
  );
}