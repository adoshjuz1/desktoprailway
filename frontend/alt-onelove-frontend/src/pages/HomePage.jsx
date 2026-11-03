import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();
  
  const [depStation, setDepStation] = useState('Алматы');
  const [arrStation, setArrStation] = useState('Атырау');
  const [searchDate, setSearchDate] = useState('');
  const [returnDate, setReturnDate] = useState('');

  const [activeCalendarTab, setActiveCalendarTab] = useState(null); 
  const [trainPricesByDate, setTrainPricesByDate] = useState({});

  useEffect(() => {
    fetchCalendarPrices();
  }, [depStation, arrStation]);

  const fetchCalendarPrices = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/trains/available-dates?from_city=${encodeURIComponent(depStation)}&to_city=${encodeURIComponent(arrStation)}`);
      if (response.ok) {
        const data = await response.json();
        setTrainPricesByDate(data);
      }
    } catch (err) {
      console.error('Ошибка загрузки доступных дат:', err);
    }
  };

  const selectRoute = (dep, arr) => {
    setDepStation(dep);
    setArrStation(arr);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!depStation.trim() || !arrStation.trim()) {
      alert('Пожалуйста, укажите станции отправления и назначения');
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const dateToUse = searchDate || todayStr;
    let url = `/search?from=${encodeURIComponent(depStation.trim())}&to=${encodeURIComponent(arrStation.trim())}&date=${encodeURIComponent(dateToUse)}`;
    if (returnDate) {
      url += `&return_date=${encodeURIComponent(returnDate)}`;
    }
    navigate(url);
  };

  const handleSelectDate = (dateStr) => {
    if (activeCalendarTab === 'there') {
      setSearchDate(dateStr);
    } else if (activeCalendarTab === 'back') {
      setReturnDate(dateStr);
    }
    setActiveCalendarTab(null);
  };

  const handleOneWayClick = () => {
    setReturnDate('');
    setActiveCalendarTab(null);
  };

  const clearReturnDate = (e) => {
    e.stopPropagation();
    setReturnDate('');
  };

  // Расчет дат месяцев относительно текущего дня
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const firstMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const secondMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const renderMonthCalendar = (year, monthIndex) => {
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const monthStr = String(monthIndex + 1).padStart(2, '0');

    const cells = [];

    for (let i = 0; i < offset; i++) {
      cells.push(<div key={`empty-${i}`} />);
    }

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const formattedDay = String(dayNum).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${formattedDay}`;
      const cellDate = new Date(year, monthIndex, dayNum);

      const isPast = cellDate < today;
      const price = trainPricesByDate[dateStr];
      const isSelected = (activeCalendarTab === 'there' ? searchDate : returnDate) === dateStr;
      const isAvailable = Boolean(price) && !isPast;

      cells.push(
        <div 
          key={dayNum}
          onClick={() => isAvailable && handleSelectDate(dateStr)}
          className={`p-1 rounded ${isPast ? 'opacity-25' : (isAvailable ? 'cursor-pointer' : 'opacity-50')}`}
          style={{ 
            fontSize: '11px', 
            backgroundColor: isSelected ? '#0dcaf0' : (isAvailable ? 'rgba(13, 202, 240, 0.15)' : 'transparent'), 
            border: isSelected ? '1px solid #fff' : '1px solid transparent',
            color: isSelected ? '#12151c' : (isAvailable ? 'var(--bs-body-color)' : '#6c757d'),
            cursor: isPast ? 'not-allowed' : (isAvailable ? 'pointer' : 'default')
          }}
        >
          <div className="fw-bold">{dayNum}</div>
          <div style={{ fontSize: '8px', color: '#6c757d' }}>{!isPast && price ? price : ''}</div>
        </div>
      );
    }

    return cells;
  };

  return (
    <div>
      <div className="hero-section text-center">
        <div className="container">
          <h2 className="fw-bold mb-0">Поиск ЖД-билетов по Казахстану</h2>
        </div>
      </div>

      <div className="container">
        <div className="search-box position-relative">
          <form onSubmit={handleSearch} className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label small fw-semibold">
                <i className="bi bi-geo-alt-fill text-danger me-1"></i>Откуда
              </label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Например: Астана" 
                value={depStation} 
                onChange={(e) => setDepStation(e.target.value)} 
                required 
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">
                <i className="bi bi-geo-alt me-1" style={{ color: 'var(--accent-teal)' }}></i>Куда
              </label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Например: Алматы" 
                value={arrStation} 
                onChange={(e) => setArrStation(e.target.value)} 
                required 
              />
            </div>

            <div className="col-md-2 position-relative">
              <label className="form-label small fw-semibold">
                <i className="bi bi-calendar-event me-1"></i>Туда
              </label>
              <input 
                type="text" 
                className="form-control cursor-pointer" 
                value={searchDate} 
                placeholder="Туда"
                readOnly 
                onClick={() => setActiveCalendarTab(activeCalendarTab === 'there' ? null : 'there')} 
                style={{ backgroundColor: 'var(--bs-body-bg)', color: 'var(--bs-body-color)', border: '1px solid var(--border-color, #444)' }}
              />
            </div>

            <div className="col-md-2 position-relative">
              <label className="form-label small fw-semibold">
                <i className="bi bi-calendar-check me-1"></i>Обратно
              </label>
              <div className="position-relative">
                <input 
                  type="text" 
                  className="form-control cursor-pointer pe-4" 
                  value={returnDate} 
                  placeholder="В одну сторону"
                  readOnly 
                  onClick={() => setActiveCalendarTab(activeCalendarTab === 'back' ? null : 'back')} 
                  style={{ backgroundColor: 'var(--bs-body-bg)', color: 'var(--bs-body-color)', border: '1px solid var(--border-color, #444)' }}
                />
                {returnDate && (
                  <span 
                    onClick={clearReturnDate}
                    className="position-absolute top-50 end-0 translate-middle-y me-2 text-muted cursor-pointer"
                    style={{ fontSize: '14px', zIndex: 5 }}
                    title="Сбросить дату обратно"
                  >
                    ✕
                  </span>
                )}
              </div>
            </div>

            <div className="col-md-2">
              <button type="submit" className="btn btn-teal w-100 fw-bold">
                <i className="bi bi-search me-1"></i> Найти
              </button>
            </div>
          </form>

          {activeCalendarTab && (
            <div 
              className="card position-absolute p-4 shadow-lg border mt-2" 
              style={{ zIndex: 1050, width: '650px', right: 0, backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderRadius: '12px' }}
            >
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="fw-bold fs-6">
                  {activeCalendarTab === 'there' ? 'Выберите дату туда' : 'Выберите дату обратно'}
                </span>
                <button 
                  type="button" 
                  className="btn btn-sm btn-teal fw-bold px-3 py-1 rounded-pill" 
                  onClick={handleOneWayClick}
                >
                  В одну сторону
                </button>
              </div>

              <div className="text-muted small mb-2">Минимальная цена за билет:</div>
              
              <div className="row g-3">
                {/* Динамический текущий месяц */}
                <div className="col-6">
                  <div className="fw-bold small mb-2 text-center">
                    {monthNames[firstMonthDate.getMonth()]} {firstMonthDate.getFullYear()}
                  </div>
                  <div className="d-grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center' }}>
                    {['пн','вт','ср','чт','пт','сб','вс'].map(d => <span key={d} className="small text-muted fw-bold">{d}</span>)}
                    {renderMonthCalendar(firstMonthDate.getFullYear(), firstMonthDate.getMonth())}
                  </div>
                </div>

                {/* Динамический следующий месяц */}
                <div className="col-6">
                  <div className="fw-bold small mb-2 text-center">
                    {monthNames[secondMonthDate.getMonth()]} {secondMonthDate.getFullYear()}
                  </div>
                  <div className="d-grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center' }}>
                    {['пн','вт','ср','чт','пт','сб','вс'].map(d => <span key={d} className="small text-muted fw-bold">{d}</span>)}
                    {renderMonthCalendar(secondMonthDate.getFullYear(), secondMonthDate.getMonth())}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container my-5">
        <div className="ad-banner d-flex align-items-center justify-content-between flex-wrap gap-4">
          <div style={{ maxWidth: '650px' }}>
            <span className="badge bg-light text-dark fw-bold mb-2" style={{ fontSize: '12px' }}>Специальное предложение от ALT</span>
            <h2 className="fw-bold mb-2">Скидка до 20% на билеты «Тальго»</h2>
            <p className="mb-0 opacity-90 fs-6">Путешествуйте по Казахстану с максимальным комфортом. Бронируйте ж/д билеты за 45 дней до поездки и получайте гарантированную скидку на премиум-места и купе.</p>
          </div>
          <div>
            <button className="btn btn-light fw-bold px-4 py-3 shadow" style={{ color: '#0F2C59', fontSize: '16px' }} onClick={() => alert('Переход к акции')}>
              Узнать подробнее <i className="bi bi-arrow-right ms-1"></i>
            </button>
          </div>
        </div>
      </div>

      <div className="container my-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h4 className="fw-bold mb-0">
              <i className="bi bi-compass-fill me-2" style={{ color: 'var(--accent-teal)' }}></i>Популярные направления по Казахстану
            </h4>
            <p className="text-muted small mb-0">Самые частые ЖД маршруты КТЖ</p>
          </div>
        </div>

        <div className="row g-2">
          {[
            { from: 'Астана', to: 'Алматы', price: '4 938,00 ₸' },
            { from: 'Астана', to: 'Караганды', price: '1 028,00 ₸' },
            { from: 'Астана', to: 'Павлодар', price: '3 663,00 ₸' },
            { from: 'Астана', to: 'Костанай', price: '3 104,00 ₸' },
            { from: 'Астана', to: 'Шымкент', price: '8 798,00 ₸' },
            { from: 'Астана', to: 'Петропавловск', price: '3 476,00 ₸' },
            { from: 'Астана', to: 'Кокшетау', price: '1 189,00 ₸' },
            { from: 'Астана', to: 'Курорт-Боровое', price: '1 384,00 ₸' },
            { from: 'Астана', to: 'Семей', price: '5 647,00 ₸' },
            { from: 'Астана', to: 'Тараз', price: '6 686,00 ₸' },
          ].map((route, idx) => (
            <div key={idx} className="col-md-4 col-sm-6">
              <div className="card route-card p-3 shadow-sm" onClick={() => selectRoute(route.from, route.to)}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-bold fs-6">{route.from} ➔ {route.to}</div>
                    <small className="text-muted"><i className="bi bi-train-lightrail me-1"></i>КТЖ Поезд</small>
                  </div>
                  <div className="text-end">
                    <span className="text-muted small d-block">от</span>
                    <span className="fw-bold fs-6" style={{ color: 'var(--accent-teal)' }}>{route.price}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container my-5">
        <div className="info-section">
          <h3 className="fw-bold mb-4 text-center">Сервис онлайн бронирования билетов</h3>
          
          <div className="row g-4">
            <div className="col-md-4">
              <div className="text-center mb-3">
                <i className="bi bi-shield-check info-icon"></i>
              </div>
              <h6 className="fw-bold text-center mb-2">Честные цены на КТЖ билеты</h6>
              <p className="text-muted small leading-relaxed mb-0">
                Купить билеты на поезд без очереди и даже не выходя из дома? Легко! На нашем сервисе можно купить билет онлайн без скрытых комиссий и сборов. Вы выбираете направление, класс вагона и места. Наша поисковая система предлагает варианты и наличие билетов на поезд, выгодные по цене и удобные по сообщению.
              </p>
            </div>

            <div className="col-md-4">
              <div className="text-center mb-3">
                <i className="bi bi-headset info-icon"></i>
              </div>
              <h6 className="fw-bold text-center mb-2">Поддержка клиентов на каждом этапе</h6>
              <p className="text-muted small leading-relaxed mb-0">
                Специалисты нашей Службы заботы о клиентах готовы ответить на любые вопросы, связанные с поиском, бронированием и заказом билетов на поезд онлайн. Операторы говорят на русском, казахском и английском языках. Мы предоставим подробную информацию о том, как найти билеты по выгодной цене.
              </p>
            </div>

            <div className="col-md-4">
              <div className="text-center mb-3">
                <i className="bi bi-arrow-counterclockwise info-icon"></i>
              </div>
              <h6 className="fw-bold text-center mb-2">Возврат ж/д билета онлайн</h6>
              <p className="text-muted small leading-relaxed mb-0">
                Если ваши планы изменились и поездку пришлось отменить – не нужно стоять в очереди, чтобы вернуть билет. Экономить время и деньги с нами – просто: возврат железнодорожных билетов онлайн занимает считанные минуты. Достаточно войти в личный кабинет и создать запрос.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}