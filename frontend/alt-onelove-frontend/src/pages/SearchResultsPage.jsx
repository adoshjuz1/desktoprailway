import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  const fromParam = searchParams.get('from') || 'Алматы';
  const toParam = searchParams.get('to') || 'Атырау';
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const returnDateParam = searchParams.get('return_date') || '';

  const [fromInput, setFromInput] = useState(fromParam);
  const [toInput, setToInput] = useState(toParam);
  const [dateInput, setDateInput] = useState(dateParam);
  const [returnDateInput, setReturnDateInput] = useState(returnDateParam);

  const [activeCalendarTab, setActiveCalendarTab] = useState(null); 
  const [trainPricesByDate, setTrainPricesByDate] = useState({});

  const [trains, setTrains] = useState([]);
  const [availableDatesMap, setAvailableDatesMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Фильтры
  const [filterPlatzkart, setFilterPlatzkart] = useState(true);
  const [filterCoupe, setFilterCoupe] = useState(true);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Системная дата для блокировки прошедших дней (сегодня)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const firstMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const secondMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const calculateArrivalDate = (depDateStr, durationText, depTimeStr = '22:30') => {
    try {
      if (!depDateStr) return 'вс 18.10';
      
      let year = today.getFullYear(), month = 10, day = 16;
      if (typeof depDateStr === 'string' && depDateStr.includes('-')) {
        const parts = depDateStr.split('-');
        if (parts.length === 3) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          day = parseInt(parts[2], 10);
        }
      }

      let depH = 22, depM = 30;
      if (depTimeStr && depTimeStr.includes(':')) {
        const tParts = depTimeStr.split(':');
        depH = parseInt(tParts[0], 10) || 0;
        depM = parseInt(tParts[1], 10) || 0;
      }

      const depDate = new Date(year, month - 1, day, depH, depM);

      let totalHours = 0;
      let totalMins = 0;
      if (durationText) {
        const hMatch = durationText.match(/(\d+)\s*ч/);
        const mMatch = durationText.match(/(\d+)\s*м/);
        if (hMatch) totalHours = parseInt(hMatch[1], 10);
        if (mMatch) totalMins = parseInt(mMatch[1], 10);
      }

      const durationMs = (totalHours * 60 + totalMins) * 60 * 1000;
      const arrDate = new Date(depDate.getTime() + durationMs);

      const days = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
      const dayName = days[arrDate.getDay()];
      const dayNum = String(arrDate.getDate()).padStart(2, '0');
      const monthNum = String(arrDate.getMonth() + 1).padStart(2, '0');
      
      return `${dayName} ${dayNum}.${monthNum}`;
    } catch (e) {
      return depDateStr;
    }
  };

  const formatRussianDepDate = (dateStr) => {
    try {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const days = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
      const dayName = days[d.getDay()];
      const dayNum = String(d.getDate()).padStart(2, '0');
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      return `${dayName} ${dayNum}.${monthNum}`;
    } catch (e) {
      return dateStr;
    }
  };

  useEffect(() => {
    fetchTrains();
    fetchAvailableDates();
  }, [searchParams, fromParam, toParam]);

  const fetchTrains = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        from_city: fromParam,
        to_city: toParam,
        date: dateInput
      });

      const response = await fetch(`http://127.0.0.1:8000/api/trains/search?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Ошибка сети');
      const data = await response.json();
      setTrains(data);
    } catch (error) {
      console.error('Ошибка бэкенда FastAPI:', error);
      setTrains([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableDates = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/trains/available-dates?from_city=${encodeURIComponent(fromParam)}&to_city=${encodeURIComponent(toParam)}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableDatesMap(data);
        setTrainPricesByDate(data);
      }
    } catch (err) {
      console.error('Ошибка загрузки дат для ленты:', err);
    }
  };

  // Генерация ленты дат: убираем прошедшие дни и дни без рейсов
  const generateDateRibbon = () => {
    const ribbon = [];
    const daysOfWeek = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    const monthsNames = ['янв.', 'фев.', 'мар.', 'апр.', 'май', 'июн.', 'июл.', 'авг.', 'сен.', 'окт.', 'ноя.', 'дек.'];

    // Пробегаем по ближайшим 45 дням от сегодняшнего дня
    for (let i = 0; i < 45; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const fullDate = `${year}-${month}-${day}`;
      
      const price = availableDatesMap[fullDate];

      // Оставляем ТОЛЬКО те дни, на которые есть рейсы/цены в базе данных
      if (price) {
        ribbon.push({
          day: daysOfWeek[d.getDay()],
          date: `${d.getDate()} ${monthsNames[d.getMonth()]}`,
          fullDate: fullDate,
          price: price
        });
      }
    }
    return ribbon;
  };

  const dateRibbon = generateDateRibbon();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    let url = `/search?from=${encodeURIComponent(fromInput)}&to=${encodeURIComponent(toInput)}&date=${dateInput}`;
    if (returnDateInput) {
      url += `&return_date=${encodeURIComponent(returnDateInput)}`;
    }
    navigate(url);
  };

  const handleSelectDate = (dateStr) => {
    if (activeCalendarTab === 'there') {
      setDateInput(dateStr);
    } else if (activeCalendarTab === 'back') {
      setReturnDateInput(dateStr);
    }
    setActiveCalendarTab(null);
  };

  const handleOneWayClick = () => {
    setReturnDateInput('');
    setActiveCalendarTab(null);
  };

  const clearReturnDate = (e) => {
    e.stopPropagation();
    setReturnDateInput('');
  };

  const scrollRibbon = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
    }
  };

  // Динамический календарь для выбора даты в поисковой строке (с блокировкой прошлого)
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
      const isSelected = (activeCalendarTab === 'there' ? dateInput : returnDateInput) === dateStr;
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
            color: isSelected ? '#12151c' : (isAvailable ? 'var(--text-color, #fff)' : '#6c757d'),
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

  const filteredTrains = trains.filter(train => {
    const coupePrice = train.coupe_price || train.min_price || 20000;
    const platskartPrice = train.platskart_price || train.min_price || 10000;
    
    const currentMin = Math.min(
      filterCoupe ? coupePrice : Infinity, 
      filterPlatzkart ? platskartPrice : Infinity
    );

    if (minPrice !== '' && currentMin < Number(minPrice)) return false;
    if (maxPrice !== '' && currentMin > Number(maxPrice)) return false;

    return true;
  });

  const goToSeatSelection = (train, carriageType) => {
    navigate('/seats', { 
      state: { 
        train, 
        carriageType,
        fromCity: fromParam,
        toCity: toParam,
        date: dateInput
      } 
    });
  };

  return (
    <div className="container" style={{ marginTop: '30px' }}>
      {/* Верхняя поисковая панель */}
      <div className="search-box mb-4 p-3 position-relative" style={{ backgroundColor: 'var(--card-bg)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', marginTop: '20px' }}>
        <form onSubmit={handleSearchSubmit} className="row g-3 align-items-end">
          <div className="col-md-3">
            <label className="form-label small fw-semibold">
              <i className="bi bi-geo-alt-fill text-danger me-1"></i>Откуда
            </label>
            <input 
              type="text" 
              className="form-control" 
              value={fromInput} 
              onChange={(e) => setFromInput(e.target.value)} 
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
              value={toInput} 
              onChange={(e) => setToInput(e.target.value)} 
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
              value={dateInput} 
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
                value={returnDateInput} 
                placeholder="В одну сторону"
                readOnly 
                onClick={() => setActiveCalendarTab(activeCalendarTab === 'back' ? null : 'back')} 
                style={{ backgroundColor: 'var(--bs-body-bg)', color: 'var(--bs-body-color)', border: '1px solid var(--border-color, #444)' }}
              />
              {returnDateInput && (
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
            <button type="submit" className="btn btn-teal w-100 fw-bold py-2">
              <i className="bi bi-search me-1"></i> Найти
            </button>
          </div>
        </form>

        {/* Всплывающий календарь с динамическими месяцами */}
        {activeCalendarTab && (
          <div 
            className="card position-absolute p-4 shadow-lg border mt-2" 
            style={{ zIndex: 1050, width: '650px', left: '15px', top: '100%', backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderRadius: '12px' }}
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
              {/* Текущий месяц */}
              <div className="col-6">
                <div className="fw-bold small mb-2 text-center">
                  {monthNames[firstMonthDate.getMonth()]} {firstMonthDate.getFullYear()}
                </div>
                <div className="d-grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center' }}>
                  {['пн','вт','ср','чт','пт','сб','вс'].map(d => <span key={d} className="small text-muted fw-bold">{d}</span>)}
                  {renderMonthCalendar(firstMonthDate.getFullYear(), firstMonthDate.getMonth())}
                </div>
              </div>

              {/* Следующий месяц */}
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

      {/* ОБЩАЯ СЕТКА: ФИЛЬТРЫ СЛЕВА И ЛЕНТА ДАТ СПРАВА */}
      <div className="row g-4">
        {/* Фильтры слева */}
        <div className="col-lg-3">
          <div className="card p-3 shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)' }}>
            <span className="fw-bold mb-3 d-block">
              <i className="bi bi-funnel-fill me-1" style={{ color: 'var(--accent-teal)' }}></i>Фильтры
            </span>

            <div className="mb-3">
              <label className="form-label small fw-semibold">Тип вагона</label>
              <div className="form-check">
                <input className="form-check-input" type="checkbox" checked={filterPlatzkart} onChange={(e) => setFilterPlatzkart(e.target.checked)} id="p1" />
                <label className="form-check-label small" htmlFor="p1">Плацкарт</label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="checkbox" checked={filterCoupe} onChange={(e) => setFilterCoupe(e.target.checked)} id="p2" />
                <label className="form-check-label small" htmlFor="p2">Купе</label>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-semibold">Цена (₸)</label>
              <div className="input-group input-group-sm">
                <input type="number" className="form-control" placeholder="От" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                <input type="number" className="form-control" placeholder="До" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* ЛЕНТА ДАТ ТОЛЬКО С ДОСТУПНЫМИ РЕЙСАМИ */}
        <div className="col-lg-9">
          <div className="d-flex align-items-center gap-2 mb-4">
            <button 
              type="button" 
              className="btn btn-outline-secondary btn-sm px-2 py-3" 
              onClick={() => scrollRibbon('left')}
              style={{ borderColor: 'var(--border-color, #444)', color: 'var(--text-color)' }}
            >
              ‹
            </button>
            
            <div 
              ref={scrollRef} 
              className="d-flex align-items-center overflow-auto gap-2 flex-grow-1 pb-1" 
              style={{ scrollbarWidth: 'none' }}
            >
              {dateRibbon.length === 0 ? (
                <div className="text-muted small py-2">Нет доступных рейсов на ближайшие дни</div>
              ) : (
                dateRibbon.map((item, idx) => {
                  const isActive = dateInput === item.fullDate;
                  return (
                    <div 
                      key={idx} 
                      onClick={() => {
                        setDateInput(item.fullDate);
                        let url = `/search?from=${encodeURIComponent(fromInput)}&to=${encodeURIComponent(toInput)}&date=${item.fullDate}`;
                        if (returnDateInput) url += `&return_date=${encodeURIComponent(returnDateInput)}`;
                        navigate(url);
                      }}
                      className="p-2 rounded-3 text-center flex-fill shadow-sm cursor-pointer"
                      style={{ 
                        minWidth: '120px', 
                        backgroundColor: isActive ? 'var(--accent-teal)' : 'var(--card-bg)', 
                        color: isActive ? '#000' : 'var(--text-color)',
                        border: isActive ? '1px solid var(--accent-teal)' : '1px solid var(--border-color, #333)'
                      }}
                    >
                      <div className="small fw-semibold">{item.day} {item.date}</div>
                      <div className="fw-bold" style={{ fontSize: '13px' }}>от {item.price.toLocaleString()} ₸</div>
                    </div>
                  );
                })
              )}
            </div>

            <button 
              type="button" 
              className="btn btn-outline-secondary btn-sm px-2 py-3" 
              onClick={() => scrollRibbon('right')}
              style={{ borderColor: 'var(--border-color, #444)', color: 'var(--text-color)' }}
            >
              ›
            </button>
          </div>

          {/* Список поездов */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="fw-bold mb-0">Поездов по маршруту: {filteredTrains.length}</h4>
          </div>

          {loading ? (
            <div className="text-center py-5"><div className="spinner-border" style={{ color: 'var(--accent-teal)' }}></div></div>
          ) : filteredTrains.length === 0 ? (
            <div className="alert alert-warning text-center py-4 rounded-3 border">Поездов на эту дату не найдено.</div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {filteredTrains.map((train, idx) => {
                const coupePrice = train.coupe_price || 20000;
                const platskartPrice = train.platskart_price || 10000;

                const computedDepDate = formatRussianDepDate(dateInput);
                const computedArrDate = calculateArrivalDate(dateInput, train.duration_text, train.departure_time);

                return (
                  <div key={idx} className="card p-3 shadow-sm border route-card" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)' }}>
                    <div className="row align-items-center">
                      <div className="col-md-5">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <span className="badge bg-secondary">{train.number}</span>
                          <span className="fw-bold">{train.name}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="fw-bold fs-5">{train.departure_time}</div>
                            <small className="text-muted">{fromParam} ({computedDepDate})</small>
                          </div>
                          <div className="text-center px-2 flex-grow-1">
                            <small className="text-muted">{train.duration_text}</small>
                            <div style={{ height: '2px', backgroundColor: 'var(--accent-teal)', margin: '4px 0' }}></div>
                          </div>
                          <div>
                            <div className="fw-bold fs-5">{train.arrival_time}</div>
                            <small className="text-muted">{toParam} ({computedArrDate})</small>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-7">
                        <div className="row g-2 justify-content-end">
                          {filterCoupe && (
                            <div className="col-5">
                              <div 
                                className="p-2 border rounded-3 text-center cursor-pointer"
                                onClick={() => goToSeatSelection(train, 'coupe')}
                                style={{ backgroundColor: 'var(--input-bg, #212529)', borderColor: 'var(--border-color, #444)', minHeight: '62px' }}
                              >
                                <div className="fw-bold small">Купе</div>
                                <div className="fw-bold mt-1" style={{ color: 'var(--accent-teal)', fontSize: '13px' }}>от {coupePrice.toLocaleString()} ₸</div>
                              </div>
                            </div>
                          )}

                          {filterPlatzkart && (
                            <div className="col-5">
                              <div 
                                className="p-2 border rounded-3 text-center cursor-pointer"
                                onClick={() => goToSeatSelection(train, 'platskart')}
                                style={{ backgroundColor: 'var(--input-bg, #212529)', borderColor: 'var(--border-color, #444)', minHeight: '62px' }}
                              >
                                <div className="fw-bold small">Плацкарт</div>
                                <div className="fw-bold mt-1" style={{ color: 'var(--accent-teal)', fontSize: '13px' }}>от {platskartPrice.toLocaleString()} ₸</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}