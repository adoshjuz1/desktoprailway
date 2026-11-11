import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function SeatSelectionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const carriageScrollRef = useRef(null);

  const passedTrain = location.state?.train;
  const initialCarriageType = location.state?.carriageType || 'coupe';
  const fromCity = location.state?.fromCity || 'Алматы';
  const toCity = location.state?.toCity || 'Атырау';
  const selectedDate = location.state?.date || '2026-10-14';

  const calculateArrivalDate = (depDateStr, durationText, depTimeStr = '22:30') => {
    try {
      if (!depDateStr) return 'чт, 22.10';
      const parts = depDateStr.split('-');
      if (parts.length !== 3) return depDateStr;

      const [year, month, day] = parts.map(Number);
      const [depH, depM] = depTimeStr.split(':').map(Number);

      const depDate = new Date(year, month - 1, day, depH, depM);

      let totalHours = 51;
      let totalMins = 59;
      if (durationText) {
        const hMatch = durationText.match(/(\d+)ч/);
        const mMatch = durationText.match(/(\d+)м/);
        if (hMatch) totalHours = parseInt(hMatch[1], 10);
        if (mMatch) totalMins = parseInt(mMatch[1], 10);
      }

      const durationMs = (totalHours * 60 + totalMins) * 60 * 1000;
      const arrDate = new Date(depDate.getTime() + durationMs);

      const days = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
      const dayName = days[arrDate.getDay()];
      const dayNum = String(arrDate.getDate()).padStart(2, '0');
      const monthNum = String(arrDate.getMonth() + 1).padStart(2, '0');
      return `${dayName}, ${dayNum}.${monthNum}`;
    } catch (e) {
      return depDateStr;
    }
  };

  const formatRussianDate = (dateInput) => {
    try {
      if (!dateInput) return 'ср, 14.10';
      let d = new Date();
      if (typeof dateInput === 'string' && dateInput.includes('-')) {
        const parts = dateInput.split('-');
        if (parts.length === 3) {
          d = new Date(parts[0], parts[1] - 1, parts[2]);
        }
      } else if (typeof dateInput === 'string') {
        const mapDays = { 
          'mon': 'пн', 'tue': 'вт', 'wed': 'ср', 'thu': 'чт', 
          'fri': 'пт', 'sat': 'сб', 'sun': 'вс',
          'monday': 'пн', 'tuesday': 'вт', 'wednesday': 'ср', 
          'thursday': 'чт', 'friday': 'пт', 'saturday': 'сб', 'sunday': 'вс'
        };
        let res = dateInput.toLowerCase();
        for (const [en, ru] of Object.entries(mapDays)) {
          res = res.replace(en, ru);
        }
        return res;
      }

      const days = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
      const dayName = days[d.getDay()];
      const dayNum = String(d.getDate()).padStart(2, '0');
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      return `${dayName}, ${dayNum}.${monthNum}`;
    } catch (e) {
      return dateInput;
    }
  };

  const formattedDepDate = formatRussianDate(selectedDate || passedTrain?.departure_date);
  const depTimeVal = passedTrain?.departure_time || '22:30';
  const durationVal = passedTrain?.duration_text || '51ч 59м';

  const formattedArrDate = calculateArrivalDate(selectedDate || passedTrain?.departure_date, durationVal, depTimeVal);

  const trainData = {
    number: passedTrain?.number || '041Ц',
    departureTime: depTimeVal,
    departureDate: formattedDepDate,
    departureStation: fromCity,
    arrivalTime: passedTrain?.arrival_time || '02:29',
    arrivalDate: formattedArrDate,
    arrivalStation: toCity,
    duration: durationVal,
    coupePrice: passedTrain?.coupe_price || 25711,
    coupeSeatsTotal: passedTrain?.coupe_seats_total ?? 180,
    platskartPrice: passedTrain?.platskart_price || 18014,
    platskartSeatsTotal: passedTrain?.platskart_seats_total ?? 270
  };

  const [selectedCarriageType, setSelectedCarriageType] = useState(initialCarriageType);
  const allCarriages = passedTrain?.carriages || [];

  const coupeCarriages = allCarriages
    .filter(c => c.type === 'Купе')
    .map(c => ({
      number: `${c.number} Купе`,
      type: 'Купе',
      rawNumber: c.number,
      price: c.price,
      seatsLeft: c.seats_left,
      seats: c.seats || []
    }));

  const platskartCarriages = allCarriages
    .filter(c => c.type === 'Плацкарт')
    .map(c => ({
      number: `${c.number} Плацкарт`,
      type: 'Плацкарт',
      rawNumber: c.number,
      price: c.price,
      seatsLeft: c.seats_left,
      seats: c.seats || []
    }));

  const currentCarriages = selectedCarriageType === 'coupe' ? coupeCarriages : platskartCarriages;

  const [activeCarriage, setActiveCarriage] = useState(currentCarriages[0] || null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seatFilter, setSeatFilter] = useState('all');

  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = () => {
    if (carriageScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carriageScrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    if (currentCarriages.length > 0) {
      setActiveCarriage(currentCarriages[0]);
      setSelectedSeats([]);
    }
    setTimeout(checkScroll, 100);
  }, [selectedCarriageType, passedTrain]);

  const scrollCarriages = (direction) => {
    if (carriageScrollRef.current) {
      carriageScrollRef.current.scrollBy({
        left: direction === 'left' ? -250 : 250,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 250);
    }
  };

  const handleCarriageTypeChange = (type) => {
    setSelectedCarriageType(type);
    const newCarriages = type === 'coupe' ? coupeCarriages : platskartCarriages;
    setActiveCarriage(newCarriages[0] || null);
    setSelectedSeats([]);
    if (carriageScrollRef.current) {
      carriageScrollRef.current.scrollLeft = 0;
    }
    setTimeout(checkScroll, 100);
  };

  const seatsMap = {};
  (activeCarriage?.seats || []).forEach(s => {
    seatsMap[s.number] = s;
  });

  const toggleSeat = (seatNum) => {
    const seatObj = seatsMap[seatNum];
    if (!seatObj || seatObj.is_occupied) return;
    if (selectedSeats.includes(seatNum)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seatNum));
    } else {
      setSelectedSeats([...selectedSeats, seatNum].sort((a, b) => a - b));
    }
  };

  const totalPrice = selectedSeats.length * (activeCarriage?.price || 0);

    const goToBooking = () => {
    navigate('/booking', {
      state: {
        trainId: passedTrain?.id,
        trainNumber: trainData.number,
        date: selectedDate,
        fromCity,
        toCity,
        departureTime: trainData.departureTime,
        departureDate: trainData.departureDate,
        arrivalTime: trainData.arrivalTime,
        arrivalDate: trainData.arrivalDate,
        carriageNumber: activeCarriage?.rawNumber,
        carriageType: activeCarriage?.type,
        seats: selectedSeats.map(n => ({
          number: n,
          price: seatsMap[n]?.price ?? activeCarriage?.price ?? 0
        }))
      }
    });
  };

  const renderSeatBox = (num) => {
    const seat = seatsMap[num];
    if (!seat) return <div style={{ width: 34, height: 34 }} />;

    const isOccupied = seat.is_occupied;
    const isSelected = selectedSeats.includes(num);
    const isBottom = num % 2 !== 0; 

    if (seatFilter === 'bottom' && !isBottom) {
      return (
        <div 
          className="d-flex flex-column align-items-center justify-content-center rounded" 
          style={{ width: 34, height: 34, backgroundColor: '#212529', opacity: 0.3, fontSize: '11px', color: '#6c757d' }}
        >
          {num}
        </div>
      );
    }

    let bg = '#174ea6'; 
    if (isOccupied) bg = '#495057';
    if (isSelected) bg = '#e83e8c'; 

    return (
      <div 
        onClick={() => toggleSeat(num)}
        className="d-flex flex-column align-items-center justify-content-center rounded cursor-pointer position-relative"
        style={{ 
          width: 34, 
          height: 34, 
          backgroundColor: bg, 
          color: '#fff',
          fontSize: '11px',
          fontWeight: 'bold',
          opacity: isOccupied ? 0.4 : 1,
          border: isSelected ? '2px solid #fff' : 'none'
        }}
      >
        <span style={{ borderBottom: isBottom ? '1px solid #9ec5fe' : 'none', paddingBottom: '1px' }}>
          {num}
        </span>
      </div>
    );
  };

  return (
    <div className="container-fluid py-4 px-md-5" style={{ backgroundColor: '#12151c', minHeight: '100vh', color: '#fff' }}>
      
      {/* ИСПРАВЛЕННЫЕ ХЛЕБНЫЕ КРОШКИ */}
      <div className="container mb-3 px-0">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0" style={{ fontSize: '13px' }}>
            <li className="breadcrumb-item">
              <span className="text-muted ursor-pointer hover-underline" onClick={() => navigate(-1)}>
                Результаты поиска
              </span>
            </li>
            <li className="breadcrumb-item active" style={{ color: '#0dcaf0' }} aria-current="page">
              Выбор места
            </li>
            <li className="breadcrumb-item text-muted">Бронирование</li>
            <li className="breadcrumb-item text-muted">Оплата</li>
            <li className="breadcrumb-item text-muted">Ваш заказ</li>
          </ol>
        </nav>
      </div>

      <div className="row g-4">
        {/* ЛЕВАЯ ЧАСТЬ */}
        <div className="col-lg-9">
          
          {/* ШАПКА РЕЙСА */}
          <div className="p-4 rounded-3 mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3" style={{ backgroundColor: '#1a1d26' }}>
            
            {/* Блок рейса (слева) */}
            <div className="d-flex align-items-start gap-4">
              
              {/* Отправление */}
              <div className="d-flex flex-column">
                <div className="mb-1">
                  <span className="badge bg-secondary" style={{ fontSize: '13px' }}>{trainData.number}</span>
                </div>
                <div className="fw-bold fs-3">{trainData.departureTime}</div>
                <div className="small text-muted">{trainData.departureDate}</div>
                <div className="small fw-semibold">{trainData.departureStation}</div>
              </div>

              {/* Линия длительности */}
              <div className="text-center px-3 d-flex flex-column align-items-center justify-content-center pt-3">
                <div className="small text-muted mb-1">{trainData.duration}</div>
                <div style={{ height: '2px', backgroundColor: '#3b4252', width: '100px' }}></div>
              </div>

              {/* Прибытие */}
              <div className="d-flex flex-column" style={{ paddingTop: '28px' }}>
                <div className="fw-bold fs-3">{trainData.arrivalTime}</div>
                <div className="small text-muted">{trainData.arrivalDate}</div>
                <div className="small fw-semibold">{trainData.arrivalStation}</div>
              </div>

            </div>

            {/* ПЕРЕКЛЮЧАТЕЛЬ КУПЕ / ПЛАЦКАРТ (справа) */}
            <div className="d-flex gap-2">
              <div 
                onClick={() => handleCarriageTypeChange('coupe')}
                className={`p-3 rounded-3 cursor-pointer text-center border ${selectedCarriageType === 'coupe' ? '' : 'border-secondary'}`}
                style={{ 
                  backgroundColor: selectedCarriageType === 'coupe' ? '#172228' : '#141720', 
                  borderColor: selectedCarriageType === 'coupe' ? '#0dcaf0' : undefined,
                  minWidth: '140px' 
                }}
              >
                <div className="fw-bold small">Купе</div>
                <div className="small text-muted">{trainData.coupeSeatsTotal} мест</div>
                <div className="fw-bold mt-1" style={{ color: '#0dcaf0' }}>{trainData.coupePrice.toLocaleString()} ₸</div>
              </div>

              <div 
                onClick={() => handleCarriageTypeChange('platskart')}
                className={`p-3 rounded-3 cursor-pointer text-center border ${selectedCarriageType === 'platskart' ? '' : 'border-secondary'}`}
                style={{ 
                  backgroundColor: selectedCarriageType === 'platskart' ? '#172228' : '#141720', 
                  borderColor: selectedCarriageType === 'platskart' ? '#0dcaf0' : undefined,
                  minWidth: '140px' 
                }}
              >
                <div className="fw-bold small">Плацкарт</div>
                <div className="small text-muted">{trainData.platskartSeatsTotal} мест</div>
                <div className="fw-bold mt-1" style={{ color: '#0dcaf0' }}>{trainData.platskartPrice.toLocaleString()} ₸</div>
              </div>
            </div>

          </div>

          {/* ВЫБОР ВАГОНА */}
          <h5 className="fw-bold mb-3">Выберите вагон</h5>
          <div className="position-relative mb-4">
            {showLeftArrow && (
              <button 
                onClick={() => scrollCarriages('left')}
                className="btn position-absolute top-50 start-0 translate-middle-y z-3 d-flex align-items-center justify-content-center shadow"
                style={{ width: '36px', height: '36px', backgroundColor: 'rgba(26, 29, 38, 0.9)', border: '1px solid #444', color: '#fff', borderRadius: '50%', marginLeft: '-12px' }}
              >
                ‹
              </button>
            )}

            <div 
              ref={carriageScrollRef}
              onScroll={checkScroll}
              className="d-flex gap-3 overflow-auto pb-2" 
              style={{ scrollbarWidth: 'none', scrollBehavior: 'smooth' }}
            >
              {currentCarriages.map((car, idx) => {
                const isActive = activeCarriage?.number === car.number;
                return (
                  <div 
                    key={idx} 
                    onClick={() => { setActiveCarriage(car); setSelectedSeats([]); }}
                    className={`p-3 rounded-3 cursor-pointer border flex-shrink-0 ${isActive ? '' : 'border-secondary'}`}
                    style={{ 
                      backgroundColor: isActive ? '#172228' : '#1a1d26', 
                      borderColor: isActive ? '#0dcaf0' : undefined,
                      minWidth: '155px' 
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-1 gap-2">
                      <span className="fw-bold text-nowrap">{car.number}</span>
                      <span className="fw-bold text-nowrap" style={{ color: '#0dcaf0' }}>{car.price.toLocaleString()} ₸</span>
                    </div>
                    <div className="small text-muted">{car.seatsLeft} мест</div>
                  </div>
                );
              })}
            </div>

            {showRightArrow && (
              <button 
                onClick={() => scrollCarriages('right')}
                className="btn position-absolute top-50 end-0 translate-middle-y z-3 d-flex align-items-center justify-content-center shadow"
                style={{ width: '36px', height: '36px', backgroundColor: 'rgba(26, 29, 38, 0.9)', border: '1px solid #444', color: '#fff', borderRadius: '50%', marginRight: '-12px' }}
              >
                ›
              </button>
            )}
          </div>

          {/* ИНТЕРАКТИВНАЯ СХЕМА МЕСТ */}
          <div className="p-4 rounded-3" style={{ backgroundColor: '#1a1d26' }}>
            <h5 className="fw-bold mb-3">Выберите места ({activeCarriage?.number || 'Вагон'})</h5>

            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
              <div className="btn-group" role="group">
                <button className={`btn btn-sm ${seatFilter === 'all' ? 'btn-dark text-white border-secondary' : 'btn-outline-secondary'}`} onClick={() => setSeatFilter('all')}>Все</button>
                <button className={`btn btn-sm ${seatFilter === 'bottom' ? 'btn-dark text-white border-secondary' : 'btn-outline-secondary'}`} onClick={() => setSeatFilter('bottom')}>Только нижние</button>
              </div>

              <div className="d-flex align-items-center gap-3 small text-muted">
                <span className="d-flex align-items-center gap-1"><span style={{ width: 12, height: 12, backgroundColor: '#174ea6', borderRadius: 2 }}></span> Доступные</span>
                <span className="d-flex align-items-center gap-1"><span style={{ width: 12, height: 12, backgroundColor: '#e83e8c', borderRadius: 2 }}></span> Выбранные</span>
                <span className="d-flex align-items-center gap-1"><span style={{ width: 12, height: 12, backgroundColor: '#495057', borderRadius: 2 }}></span> Недоступные</span>
              </div>
            </div>

            {/* ВАГОННЫЙ БЛОК */}
            <div className="p-4 rounded-3 border border-secondary" style={{ backgroundColor: '#1b1f28' }}>
              <div className="d-flex align-items-center justify-content-between w-100">
                
                {/* Левый тамбур */}
                <div className="d-flex gap-1 p-1 rounded border border-secondary align-items-center justify-content-center" style={{ backgroundColor: '#141720', height: '76px', padding: '0 6px' }}>
                  <div className="text-muted" title="Санузел" style={{ fontSize: '15px' }}>🚻</div>
                  <div className="text-muted" title="Проводник" style={{ fontSize: '15px' }}>👨‍✈️</div>
                </div>

                {/* 9 секций купе/плацкарта */}
                <div id="main-sections-block" className="d-flex justify-content-between flex-grow-1 mx-2">
                  {Array.from({ length: 9 }, (_, secIdx) => {
                    const topSeat1 = secIdx * 4 + 2;
                    const topSeat2 = secIdx * 4 + 4;
                    const botSeat1 = secIdx * 4 + 1;
                    const botSeat2 = secIdx * 4 + 3;

                    return (
                      <div key={secIdx} className="d-flex flex-column gap-1 p-1 rounded border border-secondary" style={{ backgroundColor: '#141720' }}>
                        <div className="d-flex gap-1">
                          {renderSeatBox(topSeat1)}
                          {renderSeatBox(topSeat2)}
                        </div>
                        <div className="d-flex gap-1">
                          {renderSeatBox(botSeat1)}
                          {renderSeatBox(botSeat2)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Правый тамбур */}
                <div className="d-flex gap-1 p-1 rounded border border-secondary align-items-center justify-content-center" style={{ backgroundColor: '#141720', height: '76px', padding: '0 8px' }}>
                  <div className="text-muted" title="Санузел" style={{ fontSize: '15px' }}>🚻</div>
                </div>

              </div>

              {/* Боковые места для плацкарта */}
              {activeCarriage?.type === 'Плацкарт' && (
                <div className="mt-3 pt-2 d-flex justify-content-center">
                  <div className="d-flex justify-content-between" style={{ width: 'calc(100% - 110px)', marginLeft: '25px' }}>
                    {Array.from({ length: 18 }, (_, i) => {
                      const seatNum = 54 - i; 
                      return renderSeatBox(seatNum);
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ПРАВАЯ ПАНЕЛЬ «МАРШРУТ» */}
        <div className="col-lg-3">
          <div className="card p-4 shadow border-0 sticky-top" style={{ backgroundColor: '#1a1d26', color: '#fff', top: '20px' }}>
            <h5 className="fw-bold mb-3 border-bottom border-secondary pb-2">Маршрут</h5>
            <div className="mb-3">
              <div className="fw-bold fs-6">{trainData.departureStation} ➔ {trainData.arrivalStation}</div>
              <div className="small text-muted">{trainData.departureDate} {trainData.departureTime} — {trainData.arrivalDate} {trainData.arrivalTime}</div>
            </div>
            <div className="mb-3 border-top border-secondary pt-2">
              <div className="small text-muted">Выбрано мест:</div>
              <div className="fw-bold">{selectedSeats.join(', ') || 'не выбрано'}</div>
            </div>
            <div className="d-flex justify-content-between align-items-center mb-4 border-top border-secondary pt-3">
              <span className="fw-bold fs-5">Всего</span>
              <span className="fw-bold fs-4" style={{ color: '#0dcaf0' }}>{totalPrice.toLocaleString()} ₸</span>
            </div>
            <button 
              className="btn btn-teal w-100 fw-bold py-2"
              disabled={selectedSeats.length === 0}
              onClick={() => alert(`Бронирование успешно! Выбраны места: ${selectedSeats.join(', ')}`)}
            >
              Продолжить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}