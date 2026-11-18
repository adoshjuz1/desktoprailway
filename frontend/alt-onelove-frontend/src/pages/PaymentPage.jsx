import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Steps from '../components/Steps';

const API_URL = 'http://127.0.0.1:8000';

const money = (n) => `${Math.round(n).toLocaleString('ru-RU')} ₸`;

const cardStyle = {
  backgroundColor: 'var(--card-bg)',
  color: 'var(--text-color)',
  borderColor: 'var(--border-color)',
};

const PAYMENT_METHODS = [
  {
    id: 'card',
    title: 'Банковской картой',
    icon: 'bi-credit-card-2-front',
    color: '#00B4D8',
  },
  {
    id: 'kaspi',
    title: 'Kaspi.kz',
    icon: 'bi-phone',
    color: '#F14635',
  },
  {
    id: 'installment',
    title: 'В рассрочку на 4 месяца',
    icon: 'bi-calendar3',
    color: '#22C55E',
    badge: 'узнай свой лимит',
  },
  {
    id: 'mobile',
    title: 'С баланса мобильного (Kcell, Tele2, Altel)',
    icon: 'bi-phone-fill',
    color: '#8B5CF6',
  },
];

function formatTimer(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const payload = location.state; // данные из BookingPage

  const [method, setMethod] = useState('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(35 * 60); // 35 минут
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [cardErrors, setCardErrors] = useState({});

  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Нет данных — пользователь зашёл напрямую
  if (!payload || !payload.order || !payload.passengers) {
    return (
      <div className="container my-5 text-center">
        <div className="alert alert-warning d-inline-block">
          Сначала заполните данные бронирования.
        </div>
        <div>
          <Link to="/" className="btn btn-teal mt-3">
            На главную
          </Link>
        </div>
      </div>
    );
  }

  const { order, passengers, email, phone, refundGuarantee, fastRefund, total, ticketsTotal, guaranteePrice, fastRefundPrice, userLogin } = payload;

  const validateCard = () => {
    if (method !== 'card') return {};
    const e = {};
    const digits = cardNumber.replace(/\s/g, '');
    if (digits.length < 16) e.cardNumber = 'Введите 16 цифр номера карты';
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) e.cardExpiry = 'Формат ММ/ГГ';
    if (cardCvv.length < 3) e.cardCvv = 'Введите CVV';
    if (!cardName.trim()) e.cardName = 'Укажите имя владельца';
    return e;
  };

  const handlePay = async () => {
    setApiError('');
    const e = validateCard();
    setCardErrors(e);
    if (Object.keys(e).length > 0) return;

    if (secondsLeft <= 0) {
      setApiError('Время на оплату истекло. Вернитесь и оформите заказ заново.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/api/bookings`, {
        train_id: order.trainId,
        travel_date: order.date,
        carriage_number: order.carriageNumber,
        contact_email: email.trim(),
        contact_phone: phone.startsWith('+') ? phone : `+7${phone}`,
        passengers: passengers.map((p) => ({
          seat_number: p.seatNumber,
          first_name: p.firstName.trim(),
          last_name: p.lastName.trim(),
          document_type: p.documentType,
          document_number: p.documentNumber.trim(),
          citizenship: p.citizenship.trim() || 'Казахстан',
          iin: p.iin,
        })),
        refund_guarantee: refundGuarantee,
        fast_refund: fastRefund,
        user_email: userLogin || null,
      });
      clearInterval(timerRef.current);
      navigate('/order-success', {
        state: {
          booking: response.data,
          order,
          email: email.trim(),
          total,
        },
        replace: true,
      });
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') setApiError(detail);
      else if (Array.isArray(detail)) setApiError('Проверьте правильность заполнения всех полей.');
      else setApiError('Не удалось связаться с сервером. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Форма оплаты ----------
  return (
    <div className="container my-4 my-md-5">
      <Steps current={3} onStepClick={(i) => navigate(i - 3)} />

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <h4 className="fw-bold mb-0">Оплата</h4>
        <div
          className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-3 small"
          style={{
            background: secondsLeft < 300 ? 'rgba(220, 53, 69, 0.15)' : 'var(--accent-soft)',
            color: secondsLeft < 300 ? '#dc3545' : 'var(--accent-teal)',
          }}
        >
          <i className="bi bi-clock"></i>
          <span>
            Время на оплату: <strong>{formatTimer(secondsLeft)}</strong>
          </span>
        </div>
      </div>

      <div className="row g-4">
        {/* Левая колонка — способы оплаты */}
        <div className="col-lg-8">
          <div className="card border rounded-4 p-3 p-md-4 mb-4" style={cardStyle}>
            <div className="d-flex flex-column gap-2">
              {PAYMENT_METHODS.map((m) => {
                const selected = method === m.id;
                return (
                  <label
                    key={m.id}
                    className="d-flex align-items-center gap-3 p-3 rounded-3 mb-0"
                    style={{
                      cursor: 'pointer',
                      border: selected
                        ? '2px solid var(--accent-teal)'
                        : '1px solid var(--border-color)',
                      background: selected
                        ? 'var(--accent-soft)'
                        : 'transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      className="form-check-input m-0"
                      checked={selected}
                      onChange={() => setMethod(m.id)}
                      style={{ accentColor: 'var(--accent-teal)' }}
                    />
                    <span
                      className="d-inline-flex align-items-center justify-content-center rounded-circle"
                      style={{
                        width: 36,
                        height: 36,
                        background: `${m.color}22`,
                        color: m.color,
                        flexShrink: 0,
                      }}
                    >
                      <i className={`bi ${m.icon}`}></i>
                    </span>
                    <span className="flex-grow-1 fw-medium">{m.title}</span>
                    {m.badge && (
                      <span className="badge rounded-pill border small fw-normal" style={{ backgroundColor: 'var(--card-inset)', color: 'var(--text-color)' }}>
                        {m.badge}
                      </span>
                    )}
                    <span className="fw-semibold text-nowrap">{money(total)}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Форма карты — только при выборе «Банковской картой» */}
          {method === 'card' && (
            <div className="card border rounded-4 p-3 p-md-4 mb-4" style={cardStyle}>
              <h6 className="fw-bold mb-3">Данные вашей карты</h6>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small text-muted mb-1">Номер карты</label>
                  <input
                    type="text"
                    className={`form-control ${cardErrors.cardNumber ? 'is-invalid' : ''}`}
                    placeholder="ACCT-000003"
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
                      const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
                      setCardNumber(formatted);
                    }}
                  />
                  {cardErrors.cardNumber && (
                    <div className="text-danger small mt-1">{cardErrors.cardNumber}</div>
                  )}
                </div>
                <div className="col-6 col-md-4">
                  <label className="form-label small text-muted mb-1">Срок действия</label>
                  <input
                    type="text"
                    className={`form-control ${cardErrors.cardExpiry ? 'is-invalid' : ''}`}
                    placeholder="ММ/ГГ"
                    maxLength={5}
                    value={cardExpiry}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                      if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
                      setCardExpiry(v);
                    }}
                  />
                  {cardErrors.cardExpiry && (
                    <div className="text-danger small mt-1">{cardErrors.cardExpiry}</div>
                  )}
                </div>
                <div className="col-6 col-md-4">
                  <label className="form-label small text-muted mb-1">CVV/CVC</label>
                  <input
                    type="password"
                    className={`form-control ${cardErrors.cardCvv ? 'is-invalid' : ''}`}
                    placeholder="•••"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  />
                  {cardErrors.cardCvv && (
                    <div className="text-danger small mt-1">{cardErrors.cardCvv}</div>
                  )}
                </div>
                <div className="col-12 col-md-8">
                  <label className="form-label small text-muted mb-1">Имя владельца карты</label>
                  <input
                    type="text"
                    className={`form-control ${cardErrors.cardName ? 'is-invalid' : ''}`}
                    placeholder="IVAN IVANOV"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  />
                  {cardErrors.cardName && (
                    <div className="text-danger small mt-1">{cardErrors.cardName}</div>
                  )}
                </div>
              </div>

              <div className="d-flex flex-wrap align-items-center gap-3 mt-4 small text-muted">
                <span>
                  <i className="bi bi-shield-lock me-1"></i>
                  Передача информации защищена SSL
                </span>
                <span className="opacity-75">Visa · Mastercard · PCI DSS</span>
              </div>
            </div>
          )}

          {method === 'kaspi' && (
            <div className="card border rounded-4 p-4 mb-4 text-center" style={cardStyle}>
              <i className="bi bi-qr-code" style={{ fontSize: '3rem', color: '#F14635' }}></i>
              <p className="mt-3 mb-1 fw-medium">Оплата через Kaspi.kz</p>
              <p className="small text-muted mb-0">
                После нажатия «Оплатить» откроется приложение Kaspi или страница оплаты.
              </p>
            </div>
          )}

          {method === 'installment' && (
            <div className="card border rounded-4 p-4 mb-4" style={cardStyle}>
              <p className="mb-2 fw-medium">Рассрочка на 4 месяца</p>
              <p className="small text-muted mb-0">
                Примерный платёж:{' '}
                <strong>{money(Math.ceil(total / 4))}</strong> × 4 мес. Точные условия
                зависят от банка.
              </p>
            </div>
          )}

          {method === 'mobile' && (
            <div className="card border rounded-4 p-4 mb-4" style={cardStyle}>
              <p className="mb-2 fw-medium">Оплата с баланса мобильного</p>
              <p className="small text-muted mb-0">
                Доступно для абонентов Kcell, Tele2 и Altel. После подтверждения сумма
                будет списана с баланса телефона.
              </p>
            </div>
          )}

          {/* Промокоды */}
          <div className="card border rounded-4 p-3 p-md-4 mb-4" style={cardStyle}>
            <div className="d-flex align-items-center justify-content-between gap-3">
              <div className="d-flex align-items-center gap-2">
                <span
                  className="d-inline-flex align-items-center justify-content-center rounded-circle"
                  style={{
                    width: 32,
                    height: 32,
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#22C55E',
                  }}
                >
                  <i className="bi bi-gift"></i>
                </span>
                <div>
                  <div className="fw-medium small">У меня есть промокод или подарочный сертификат</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                    Можно использовать только одну программу за раз
                  </div>
                </div>
              </div>
              <div className="form-check form-switch m-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  checked={promoEnabled}
                  onChange={(e) => setPromoEnabled(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
              </div>
            </div>
            {promoEnabled && (
              <div className="mt-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Введите промокод"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                />
                <button type="button" className="btn btn-sm btn-outline-secondary mt-2" disabled>
                  Применить
                </button>
              </div>
            )}
          </div>

          {apiError && (
            <div className="alert alert-danger py-2 small">{apiError}</div>
          )}

          <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              <i className="bi bi-arrow-left me-1"></i>
              Назад к бронированию
            </button>
            <button
              type="button"
              className="btn btn-teal px-4 py-2 fw-semibold"
              style={{ minWidth: 200 }}
              disabled={submitting || secondsLeft <= 0}
              onClick={handlePay}
            >
              {submitting ? 'Оплачиваем...' : `Оплатить ${money(total)}`}
            </button>
          </div>
        </div>

        {/* Правая панель — итог */}
        <div className="col-lg-4">
          <div
            className="card border rounded-4 p-4 position-sticky"
            style={{ ...cardStyle, top: '20px' }}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h6 className="fw-bold mb-0">Маршрут</h6>
              <i className="bi bi-chevron-up text-muted small"></i>
            </div>
            <div className="fw-semibold">
              {order.fromCity} → {order.toCity}
            </div>
            <div className="small text-muted mb-1">
              {order.departureDate}, {order.departureTime} → {order.arrivalDate},{' '}
              {order.arrivalTime}
            </div>
            <div className="small text-muted mb-3">
              Поезд {order.trainNumber} · вагон {order.carriageNumber} (
              {order.carriageType})
            </div>

            <hr style={{ borderColor: 'var(--border-color)' }} />
            <h6 className="fw-bold mb-2">Пассажиры</h6>
            {order.seats.map((s, i) => (
              <div key={s.number} className="d-flex justify-content-between small mb-1">
                <span>
                  Пассажир {i + 1} · место {s.number}
                </span>
                <span>{money(s.price)}</span>
              </div>
            ))}

            {(refundGuarantee || fastRefund) && (
              <>
                <hr style={{ borderColor: 'var(--border-color)' }} />
                <h6 className="fw-bold mb-2">Дополнительные услуги</h6>
                {refundGuarantee && (
                  <div className="d-flex justify-content-between small mb-1">
                    <span>Гарантия возврата денег</span>
                    <span>{money(guaranteePrice)}</span>
                  </div>
                )}
                {fastRefund && (
                  <div className="d-flex justify-content-between small mb-1">
                    <span>Быстрый возврат средств</span>
                    <span>{money(fastRefundPrice)}</span>
                  </div>
                )}
              </>
            )}

            <hr style={{ borderColor: 'var(--border-color)' }} />
            <div className="d-flex justify-content-between fs-5 fw-bold">
              <span>Всего</span>
              <span>{money(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}