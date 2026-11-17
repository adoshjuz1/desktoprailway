import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000';
const GUARANTEE_RATE = 0.08;    // как на сервере: «Гарантия возврата денег»
const FAST_REFUND_RATE = 0.05;  // как на сервере: «Быстрый возврат средств»
const DOC_TYPES = ['Удостоверение личности', 'Паспорт', 'Свидетельство о рождении'];

// Достаём вошедшего пользователя, сохранённого при входе (App.jsx кладёт его в localStorage)
const readSavedUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

const money = (n) => `${Math.round(n).toLocaleString('ru-RU')} ₸`;

const cardStyle = { backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' };

// Поле формы вынесено за пределы страницы, иначе при вводе оно пересоздаётся и теряет фокус
function Field({ label, error, children, className = '' }) {
  return (
    <div className={`mb-3 ${className}`}>
      <label className="form-label small text-muted mb-1">{label}</label>
      {children}
      {error && <div className="text-danger small mt-1">{error}</div>}
    </div>
  );
}

function Steps() {
  const items = ['Результаты поиска', 'Выбор места', 'Бронирование', 'Оплата', 'Ваш заказ'];
  return (
    <div className="d-flex flex-wrap gap-2 align-items-center small mb-4">
      {items.map((item, i) => (
        <React.Fragment key={item}>
          <span className={i < 2 ? 'text-success' : i === 2 ? 'fw-bold' : 'text-muted'}
                style={i === 2 ? { color: 'var(--accent-teal)' } : undefined}>
            {i < 2 && <i className="bi bi-check-lg me-1"></i>}{item}
          </span>
          {i < items.length - 1 && <i className="bi bi-chevron-right text-muted"></i>}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function BookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const order = location.state;

  const savedUser = readSavedUser();
  const userLogin = savedUser?.username || null;

  const [email, setEmail] = useState(userLogin && userLogin.includes('@') ? userLogin : '');
  const [phone, setPhone] = useState('');
  const [passengers, setPassengers] = useState(
    (order?.seats || []).map(s => ({
      seatNumber: s.number,
      firstName: '',
      lastName: '',
      documentType: DOC_TYPES[0],
      documentNumber: '',
      citizenship: 'Казахстан',
      iin: ''
    }))
  );
  const [refundGuarantee, setRefundGuarantee] = useState(false);
  const [fastRefund, setFastRefund] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  // Если страницу открыли напрямую, без выбора мест
  if (!order || !order.seats || order.seats.length === 0) {
    return (
      <div className="container my-5 text-center">
        <div className="alert alert-warning d-inline-block">Сначала выберите поезд и места.</div>
        <div><Link to="/" className="btn btn-teal mt-3">На главную</Link></div>
      </div>
    );
  }

  const ticketsTotal = order.seats.reduce((sum, s) => sum + s.price, 0);
  const guaranteePrice = refundGuarantee ? Math.round(ticketsTotal * GUARANTEE_RATE) : 0;
  const fastRefundPrice = fastRefund ? Math.round(ticketsTotal * FAST_REFUND_RATE) : 0;
  const total = ticketsTotal + guaranteePrice + fastRefundPrice;

  const updatePassenger = (index, field, value) => {
    setPassengers(prev => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const validate = () => {
    const e = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) e.email = 'Введите корректную почту';
    if (phone.length !== 10) e.phone = 'Введите 10 цифр номера';
    passengers.forEach((p, i) => {
      if (!p.firstName.trim()) e[`p${i}_firstName`] = 'Укажите имя';
      if (!p.lastName.trim()) e[`p${i}_lastName`] = 'Укажите фамилию';
      if (!p.documentNumber.trim()) e[`p${i}_documentNumber`] = 'Укажите номер документа';
      if (p.iin.length !== 12) e[`p${i}_iin`] = 'ИИН — 12 цифр';
    });
    return e;
  };

  const handleSubmit = async () => {
    setApiError('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/api/bookings`, {
        train_id: order.trainId,
        travel_date: order.date,
        carriage_number: order.carriageNumber,
        contact_email: email.trim(),
        contact_phone: `+7${phone}`,
        passengers: passengers.map(p => ({
          seat_number: p.seatNumber,
          first_name: p.firstName.trim(),
          last_name: p.lastName.trim(),
          document_type: p.documentType,
          document_number: p.documentNumber.trim(),
          citizenship: p.citizenship.trim() || 'Казахстан',
          iin: p.iin
        })),
        refund_guarantee: refundGuarantee,
        fast_refund: fastRefund,
        user_email: userLogin
      });
      setCreated(response.data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') setApiError(detail);
      else if (Array.isArray(detail)) setApiError('Проверьте правильность заполнения всех полей.');
      else setApiError('Не удалось связаться с сервером. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (key) => `form-control ${errors[key] ? 'is-invalid' : ''}`;

  // ---------- Экран «Ваш заказ» ----------
  if (created) {
    return (
      <div className="container my-5" style={{ maxWidth: '760px' }}>
        <div className="card p-4 p-md-5 border rounded-4 shadow-sm" style={cardStyle}>
          <div className="text-center mb-4">
            <i className="bi bi-check-circle-fill" style={{ fontSize: '3rem', color: 'var(--accent-teal)' }}></i>
            <h2 className="fw-bold mt-2">Заказ №{created.booking_id} оформлен</h2>
            <p className="text-muted mb-0">Электронные билеты отправим на {email}</p>
          </div>

          <div className="border rounded-3 p-3 mb-3" style={{ borderColor: 'var(--border-color)' }}>
            <div className="fw-bold">{order.fromCity} → {order.toCity}</div>
            <div className="small text-muted">
              Поезд {created.train_number}, вагон {created.carriage_number} ({order.carriageType}) · {order.departureDate}, {order.departureTime}
            </div>
          </div>

          {created.tickets.map(t => (
            <div key={t.seat_number} className="d-flex justify-content-between border-bottom py-2" style={{ borderColor: 'var(--border-color)' }}>
              <span>Место {t.seat_number} · {t.passenger}</span>
              <span className="fw-semibold">{money(t.price)}</span>
            </div>
          ))}
          {created.extras_price > 0 && (
            <div className="d-flex justify-content-between py-2 text-muted">
              <span>Дополнительные услуги</span><span>{money(created.extras_price)}</span>
            </div>
          )}
          <div className="d-flex justify-content-between fs-5 fw-bold pt-3">
            <span>Итого</span><span>{money(created.total_price)}</span>
          </div>

          <div className="alert alert-info small mt-4 mb-3">
            В учебной версии оплата имитируется: заказ сохраняется как оплаченный без списания денег.
          </div>
          <button className="btn btn-teal w-100 py-2" onClick={() => navigate('/')}>На главную</button>
        </div>
      </div>
    );
  }

  // ---------- Страница бронирования ----------
  return (
    <div className="container my-4">
      <Steps />

      <div className="row g-4">
        <div className="col-lg-8">
          {/* Контактная информация */}
          <div className="card p-4 border rounded-4 mb-4" style={cardStyle}>
            <h4 className="fw-bold mb-3">Контактная информация</h4>
            <div className="row">
              <Field label="Электронная почта (отправим билет)" error={errors.email} className="col-md-6">
                <input type="email" className={inputClass('email')} placeholder="name@mail.com"
                       value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Номер телефона (сообщим об изменениях)" error={errors.phone} className="col-md-6">
                <div className="input-group">
                  <span className="input-group-text">+7</span>
                  <input type="text" className={inputClass('phone')} placeholder="000 000 00 00"
                         inputMode="numeric" maxLength={10} value={phone}
                         onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
                </div>
              </Field>
            </div>
          </div>

          {/* Данные пассажиров: по одной форме на каждое место */}
          {passengers.map((p, i) => (
            <div key={p.seatNumber} className="card p-4 border rounded-4 mb-4" style={cardStyle}>
              <h5 className="fw-bold mb-3">
                Данные пассажира {i + 1} <span className="text-muted fw-normal small">· место {p.seatNumber}</span>
              </h5>
              <div className="row">
                <Field label="Имя" error={errors[`p${i}_firstName`]} className="col-md-6">
                  <input type="text" className={inputClass(`p${i}_firstName`)} value={p.firstName}
                         onChange={(e) => updatePassenger(i, 'firstName', e.target.value)} />
                </Field>
                <Field label="Фамилия" error={errors[`p${i}_lastName`]} className="col-md-6">
                  <input type="text" className={inputClass(`p${i}_lastName`)} value={p.lastName}
                         onChange={(e) => updatePassenger(i, 'lastName', e.target.value)} />
                </Field>
                <Field label="Тип документа" className="col-md-6">
                  <select className="form-select" value={p.documentType}
                          onChange={(e) => updatePassenger(i, 'documentType', e.target.value)}>
                    {DOC_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Серия, № документа" error={errors[`p${i}_documentNumber`]} className="col-md-6">
                  <input type="text" className={inputClass(`p${i}_documentNumber`)} value={p.documentNumber}
                         onChange={(e) => updatePassenger(i, 'documentNumber', e.target.value)} />
                </Field>
                <Field label="Гражданство" className="col-md-6">
                  <input type="text" className="form-control" value={p.citizenship}
                         onChange={(e) => updatePassenger(i, 'citizenship', e.target.value)} />
                </Field>
                <Field label="ИИН (12 цифр)" error={errors[`p${i}_iin`]} className="col-md-6">
                  <input type="text" className={inputClass(`p${i}_iin`)} inputMode="numeric" maxLength={12}
                         value={p.iin}
                         onChange={(e) => updatePassenger(i, 'iin', e.target.value.replace(/\D/g, ''))} />
                </Field>
              </div>
            </div>
          ))}

          {/* Дополнительные услуги */}
          <h5 className="fw-bold mb-3">Дополнительно</h5>

          <div className="card p-4 border rounded-4 mb-3" style={cardStyle}>
            <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
              <div style={{ maxWidth: '520px' }}>
                <h5 className="fw-bold">Быстрый возврат средств</h5>
                <p className="text-muted small mb-0">
                  Заявку на возврат обработаем в приоритетном порядке, средства вернутся в течение 48 часов.
                  Без этой услуги срок возврата может составлять до 10 дней.
                </p>
              </div>
              <div className="text-end">
                <div className="fw-bold">{money(Math.round(ticketsTotal * FAST_REFUND_RATE))}</div>
                <div className="small text-muted mb-2">для всех пассажиров</div>
                <button type="button" className={`btn btn-sm ${fastRefund ? 'btn-success' : 'btn-outline-secondary'}`}
                        onClick={() => setFastRefund(v => !v)}>
                  {fastRefund ? <>Добавлено <i className="bi bi-x-lg ms-1"></i></> : <>Добавить <i className="bi bi-plus-lg ms-1"></i></>}
                </button>
              </div>
            </div>
          </div>

          <div className="card p-4 border rounded-4 mb-4" style={cardStyle}>
            <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
              <div style={{ maxWidth: '520px' }}>
                <h5 className="fw-bold">Гарантия возврата денег</h5>
                <p className="text-muted small mb-0">
                  Вернём 100% стоимости билета при оформлении возврата, причина значения не имеет.
                </p>
              </div>
              <div className="text-end">
                <div className="fw-bold">{money(Math.round(ticketsTotal * GUARANTEE_RATE))}</div>
                <div className="small text-muted mb-2">для всех пассажиров</div>
                <button type="button" className={`btn btn-sm ${refundGuarantee ? 'btn-success' : 'btn-outline-secondary'}`}
                        onClick={() => setRefundGuarantee(v => !v)}>
                  {refundGuarantee ? <>Добавлено <i className="bi bi-x-lg ms-1"></i></> : <>Добавить <i className="bi bi-plus-lg ms-1"></i></>}
                </button>
              </div>
            </div>
          </div>

          {Object.keys(errors).length > 0 && (
            <div className="alert alert-danger">Проверьте поля, отмеченные красным.</div>
          )}
          {apiError && <div className="alert alert-danger">{apiError}</div>}

          <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap">
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
              <i className="bi bi-arrow-left me-1"></i>Назад к выбору мест
            </button>
            <button type="button" className="btn btn-teal px-4 py-2" disabled={submitting} onClick={handleSubmit}>
              {submitting ? 'Оформляем...' : 'Перейти к оплате'}
            </button>
          </div>
        </div>

        {/* Правая панель: маршрут, пассажиры, итог */}
        <div className="col-lg-4">
          <div className="card border rounded-4 p-4 position-sticky" style={{ ...cardStyle, top: '20px' }}>
            <h6 className="fw-bold mb-3">Маршрут</h6>
            <div className="fw-semibold">{order.fromCity} → {order.toCity}</div>
            <div className="small text-muted mb-1">
              {order.departureDate}, {order.departureTime} → {order.arrivalDate}, {order.arrivalTime}
            </div>
            <div className="small text-muted mb-3">
              Поезд {order.trainNumber} · вагон {order.carriageNumber} ({order.carriageType})
            </div>

            <hr style={{ borderColor: 'var(--border-color)' }} />
            <h6 className="fw-bold mb-2">Пассажиры</h6>
            {order.seats.map((s, i) => (
              <div key={s.number} className="d-flex justify-content-between small mb-1">
                <span>Пассажир {i + 1} · место {s.number}</span>
                <span>{money(s.price)}</span>
              </div>
            ))}

            {(refundGuarantee || fastRefund) && (
              <>
                <hr style={{ borderColor: 'var(--border-color)' }} />
                <h6 className="fw-bold mb-2">Дополнительные услуги</h6>
                {refundGuarantee && (
                  <div className="d-flex justify-content-between small mb-1">
                    <span>Гарантия возврата денег</span><span>{money(guaranteePrice)}</span>
                  </div>
                )}
                {fastRefund && (
                  <div className="d-flex justify-content-between small mb-1">
                    <span>Быстрый возврат средств</span><span>{money(fastRefundPrice)}</span>
                  </div>
                )}
              </>
            )}

            <hr style={{ borderColor: 'var(--border-color)' }} />
            <div className="d-flex justify-content-between fs-5 fw-bold">
              <span>Всего</span><span>{money(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}