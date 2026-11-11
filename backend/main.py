from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List, Optional

import models
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ALT ONE LOVE API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TrainCreateSmart(BaseModel):
    number: str
    name: str
    category: str = "Скоростной"
    from_city: str
    to_city: str
    schedule_days: str          # Например: "1, 3, 5"
    departure_time: str         # "00:00"
    arrival_time: str           # "20:40"
    days_in_transit: int = 1    # Количество дней в пути (1 — тот же день/следующий, 2 и т.д.)
    carriages_count_coupe: int = 2      
    carriages_count_platzkart: int = 2  
    seats_per_carriage_coupe: int = 36  
    seats_per_carriage_platzkart: int = 54 
    coupe_price: float = 20000.0        
    platskart_price: float = 10000.0    

class BookingCreate(BaseModel):
    train_id: int
    travel_date: str            # "2026-10-14"
    carriage_number: int
    seat_numbers: List[int]     # например [5, 6]
    passenger_name: str
    passenger_iin: str
    user_email: Optional[str] = None

def calculate_duration(dep_str: str, arr_str: str, days_in_transit: int = 1) -> str:
    dep_h, dep_m = map(int, dep_str.split(":"))
    arr_h, arr_m = map(int, arr_str.split(":"))
    
    # Переводим всё в минуты от начала отсчета
    dep_total_mins = dep_h * 60 + dep_m
    arr_total_mins = arr_h * 60 + arr_m + (days_in_transit * 24 * 60)
    
    # Если вдруг время прибытия меньше или равно отправлению при 1 дне, добавляем сутки
    if arr_total_mins <= dep_total_mins and days_in_transit == 1:
        arr_total_mins += 24 * 60
        
    diff_mins = arr_total_mins - dep_total_mins
    hours = diff_mins // 60
    minutes = diff_mins % 60
    
    return f"{hours}ч {minutes}м"

def train_runs_on_date(train_schedule: str, date_str: str) -> bool:
    if not train_schedule:
        return True
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        weekday_num = dt.weekday() + 1
        allowed_days = [int(d.strip()) for d in train_schedule.replace(',', ' ').split() if d.strip().isdigit()]
        if not allowed_days:
            return True
        return weekday_num in allowed_days
    except:
        return True


@app.post("/api/trains/create-smart", summary="Создать поезд с раздельными вагонами и местами")
def create_smart_train(data: TrainCreateSmart, db: Session = Depends(get_db)):
    auto_duration = calculate_duration(data.departure_time, data.arrival_time, data.days_in_transit)

    db_train = models.Train(
        number=data.number,
        name=data.name,
        category=data.category,
        from_city=data.from_city,
        to_city=data.to_city,
        schedule_days=data.schedule_days,
        departure_time=data.departure_time,
        arrival_time=data.arrival_time,
        duration_text=auto_duration
    )
    db.add(db_train)
    db.commit()
    db.refresh(db_train)

    carriage_num = 1

    # Купе
    for _ in range(data.carriages_count_coupe):
        db_carriage = models.Carriage(
            train_id=db_train.id,
            carriage_number=carriage_num,
            carriage_type="Купе"
        )
        db.add(db_carriage)
        db.commit()
        db.refresh(db_carriage)
        carriage_num += 1

        for s_num in range(1, data.seats_per_carriage_coupe + 1):
            db_seat = models.Seat(
                carriage_id=db_carriage.id,
                seat_number=s_num,
                price=data.coupe_price,
                is_occupied=False
            )
            db.add(db_seat)
        db.commit()

    # Плацкарт
    for _ in range(data.carriages_count_platzkart):
        db_carriage = models.Carriage(
            train_id=db_train.id,
            carriage_number=carriage_num,
            carriage_type="Плацкарт"
        )
        db.add(db_carriage)
        db.commit()
        db.refresh(db_carriage)
        carriage_num += 1

        for s_num in range(1, data.seats_per_carriage_platzkart + 1):
            db_seat = models.Seat(
                carriage_id=db_carriage.id,
                seat_number=s_num,
                price=data.platskart_price,
                is_occupied=False
            )
            db.add(db_seat)
        db.commit()

    return {
        "message": f"Поезд {data.number} успешно создан!",
        "calculated_duration": auto_duration,
        "schedule_days": data.schedule_days,
        "train_id": db_train.id
    }


@app.get("/api/trains/available-dates", summary="Получить доступные даты и цены для календаря")
def get_available_dates(from_city: str = "Алматы", to_city: str = "Атырау", db: Session = Depends(get_db)):
    trains = db.query(models.Train).filter(
        models.Train.from_city.ilike(f"%{from_city}%"),
        models.Train.to_city.ilike(f"%{to_city}%")
    ).all()
    
    start_date = datetime(2026, 10, 13)
    available_prices = {}
    
    for train in trains:
        min_price = 18000.0
        if train.carriages:
            prices = [s.price for c in train.carriages for s in c.seats if s.price]
            if prices:
                min_price = min(prices)
                
        for i in range(60):
            d = start_date + timedelta(days=i)
            d_str = d.strftime("%Y-%m-%d")
            if train_runs_on_date(train.schedule_days, d_str):
                if d_str not in available_prices or min_price < available_prices[d_str]:
                    available_prices[d_str] = int(min_price)
                    
    return available_prices


@app.get("/api/trains/search", summary="Поиск поездов с учетом дней недели и точного расчета даты прибытия")
def search_trains(from_city: str = "Алматы", to_city: str = "Атырау", date: str = None, db: Session = Depends(get_db)):
    trains = db.query(models.Train).filter(
        models.Train.from_city.ilike(f"%{from_city}%"),
        models.Train.to_city.ilike(f"%{to_city}%")
    ).all()

    result = []
    for train in trains:
        if date and not train_runs_on_date(train.schedule_days, date):
            continue

        coupe_price = 20000.0
        platskart_price = 10000.0
        coupe_free_count = 0
        platskart_free_count = 0
        
        carriages_list = []
        for carriage in train.carriages:
            free_seats = [s for s in carriage.seats if not s.is_occupied]
            free_count = len(free_seats)

            if carriage.carriage_type == "Купе":
                coupe_free_count += free_count
                if carriage.seats:
                    coupe_price = carriage.seats[0].price
            elif carriage.carriage_type == "Плацкарт":
                platskart_free_count += free_count
                if carriage.seats:
                    platskart_price = carriage.seats[0].price

            carriages_list.append({
                "number": carriage.carriage_number,
                "type": carriage.carriage_type,
                "price": carriage.seats[0].price if carriage.seats else (coupe_price if carriage.carriage_type == "Купе" else platskart_price),
                "seats_left": free_count,
                "seats": [{"number": s.seat_number, "is_occupied": s.is_occupied, "price": s.price} for s in carriage.seats]
            })

        min_price = min([c["price"] for c in carriages_list]) if carriages_list else 0.0

# Точный расчет даты прибытия: дата отправления + (часы в пути / 24 с округлением вверх/вниз)
        dep_date_obj = datetime.strptime(date, "%Y-%m-%d") if date else datetime(2026, 10, 16)
        
        transit_days = 1
        if "ч" in train.duration_text:
            try:
                hours_val = int(train.duration_text.split('ч')[0])
                # Если едет больше 24 часов, то для выезда в 22:30 и прибытия в 02:29 через 51 час 
                # дата прибытия должна быть отправление + 2 дня (т.е. 14.10 -> 17.10)
                transit_days = hours_val // 24
            except:
                pass

        arr_date_obj = dep_date_obj + timedelta(days=transit_days)

        days_rus = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
        
        dep_date_formatted = f"{days_rus[dep_date_obj.weekday()]} {dep_date_obj.strftime('%d.%m')}"
        arr_date_formatted = f"{days_rus[arr_date_obj.weekday()]} {arr_date_obj.strftime('%d.%m')}"

        train_data = {
            "id": train.id,
            "number": train.number,
            "name": train.name,
            "category": train.category,
            "from_city": train.from_city,
            "to_city": train.to_city,
            "schedule_days": train.schedule_days,
            "departure_time": train.departure_time,
            "arrival_time": train.arrival_time,
            "departure_date": dep_date_formatted,
            "arrival_date": arr_date_formatted,
            "duration_text": train.duration_text,
            "min_price": min_price,
            "coupe_price": coupe_price,
            "platskart_price": platskart_price,
            "coupe_seats_total": coupe_free_count,
            "platskart_seats_total": platskart_free_count,
            "carriages": carriages_list
        }
        result.append(train_data)

    return result


@app.post("/api/bookings", status_code=201, summary="Забронировать места в вагоне")
def create_booking(data: BookingCreate, db: Session = Depends(get_db)):
    # 1. Проверяем данные пассажира
    name = data.passenger_name.strip()
    iin = data.passenger_iin.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Укажите имя пассажира")
    if not (iin.isdigit() and len(iin) == 12):
        raise HTTPException(status_code=400, detail="ИИН должен состоять из 12 цифр")

    seat_numbers = sorted(set(data.seat_numbers))
    if not seat_numbers:
        raise HTTPException(status_code=400, detail="Выберите хотя бы одно место")

    try:
        datetime.strptime(data.travel_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Дата должна быть в формате ГГГГ-ММ-ДД")

    # 2. Поезд существует и ходит в эту дату
    train = db.query(models.Train).filter(models.Train.id == data.train_id).first()
    if not train:
        raise HTTPException(status_code=404, detail="Поезд не найден")
    if not train_runs_on_date(train.schedule_days, data.travel_date):
        raise HTTPException(status_code=400, detail="Поезд не ходит в выбранную дату")

    # 3. Вагон есть в этом поезде
    carriage = db.query(models.Carriage).filter(
        models.Carriage.train_id == train.id,
        models.Carriage.carriage_number == data.carriage_number
    ).first()
    if not carriage:
        raise HTTPException(status_code=404, detail="Вагон не найден")

    # 4. Все выбранные места есть в вагоне
    seats = db.query(models.Seat).filter(
        models.Seat.carriage_id == carriage.id,
        models.Seat.seat_number.in_(seat_numbers)
    ).all()
    if len(seats) != len(seat_numbers):
        raise HTTPException(status_code=400, detail="Некоторых мест нет в этом вагоне")

    # 5. Места не заняты на эту дату (смотрим уже оплаченные брони)
    existing = db.query(models.Booking).filter(
        models.Booking.train_id == train.id,
        models.Booking.travel_date == data.travel_date,
        models.Booking.carriage_number == data.carriage_number,
        models.Booking.status == "paid"
    ).all()
    taken = set()
    for b in existing:
        taken.update(int(x) for x in b.seats_list.split(",") if x.strip().isdigit())
    conflict = [n for n in seat_numbers if n in taken]
    if conflict:
        raise HTTPException(
            status_code=409,
            detail=f"Места уже заняты: {', '.join(map(str, conflict))}"
        )

    # 6. Цену считаем на сервере, а не берём с сайта
    total_price = sum(s.price for s in seats)

    booking = models.Booking(
        user_email=data.user_email,
        train_id=train.id,
        train_number=train.number,
        travel_date=data.travel_date,
        carriage_number=data.carriage_number,
        passenger_name=name,
        passenger_iin=iin,
        seats_list=", ".join(str(n) for n in seat_numbers),
        total_price=total_price,
        status="paid"
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    return {
        "message": "Билет успешно забронирован!",
        "booking_id": booking.id,
        "train_number": train.number,
        "travel_date": booking.travel_date,
        "carriage_number": booking.carriage_number,
        "seats": seat_numbers,
        "total_price": total_price
    }