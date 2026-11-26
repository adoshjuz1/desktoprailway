from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List, Optional
import os
import re

import models
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ALT ONE LOVE API")

# Разрешённые адреса сайта (можно задать в .env: CORS_ORIGINS=адрес1,адрес2)
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
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


HOLD_MINUTES = 15  # сколько минут места удерживаются на время оплаты


def today_start() -> datetime:
    """Сегодняшняя дата без времени: начало календаря и значение по умолчанию."""
    return datetime.combine(datetime.now().date(), datetime.min.time())


def active_booking_filter():
    """Заказы, которые занимают места: оплаченные и ещё не просроченные удержания."""
    cutoff = datetime.utcnow() - timedelta(minutes=HOLD_MINUTES)
    return or_(
        models.Booking.status == "paid",
        and_(models.Booking.status == "pending", models.Booking.created_at >= cutoff),
    )


def get_taken_seats(db: Session, train_id: int, travel_date: str) -> dict:
    """Занятые места на дату: {номер_вагона: {номера_мест}} (оплаченные и удерживаемые)."""
    rows = (
        db.query(models.Booking.carriage_number, models.Ticket.seat_number)
        .join(models.Ticket, models.Ticket.booking_id == models.Booking.id)
        .filter(
            models.Booking.train_id == train_id,
            models.Booking.travel_date == travel_date,
            active_booking_filter(),
        )
        .all()
    )
    taken = {}
    for carriage_number, seat_number in rows:
        taken.setdefault(carriage_number, set()).add(seat_number)
    return taken


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
    
    start_date = today_start()
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

        taken = get_taken_seats(db, train.id, date) if date else {}

        coupe_price = 20000.0
        platskart_price = 10000.0
        coupe_free_count = 0
        platskart_free_count = 0
        
        carriages_list = []
        for carriage in train.carriages:
            taken_here = taken.get(carriage.carriage_number, set())
            free_seats = [s for s in carriage.seats if not s.is_occupied and s.seat_number not in taken_here]
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
                "seats": [{"number": s.seat_number, "is_occupied": s.is_occupied or s.seat_number in taken_here, "price": s.price} for s in carriage.seats]
            })

        min_price = min([c["price"] for c in carriages_list]) if carriages_list else 0.0

# Точный расчет даты прибытия: дата отправления + (часы в пути / 24 с округлением вверх/вниз)
        dep_date_obj = datetime.strptime(date, "%Y-%m-%d") if date else today_start()
        
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


# ---------- Бронирование ----------

GUARANTEE_RATE = 0.08    # «Гарантия возврата денег» — 8% от стоимости билетов
FAST_REFUND_RATE = 0.05  # «Быстрый возврат средств» — 5% от стоимости билетов


class PassengerIn(BaseModel):
    seat_number: int
    passenger_type: str = "Взрослый"
    first_name: str
    last_name: str
    document_type: str = "Удостоверение личности"
    document_number: str
    citizenship: str = "Казахстан"
    iin: str


class BookingCreate(BaseModel):
    train_id: int
    travel_date: str                 # "2026-10-14"
    carriage_number: int
    contact_email: str
    contact_phone: str
    passengers: List[PassengerIn]    # по одному пассажиру на каждое место
    refund_guarantee: bool = False
    fast_refund: bool = False
    user_email: Optional[str] = None


def place_order(data: BookingCreate, db: Session, status: str):
    """Проверяет данные и сохраняет заказ со статусом status ("paid" или "pending").
    Возвращает (заказ, поезд)."""
    # 1. Контакты
    email = data.contact_email.strip()
    phone = data.contact_phone.strip()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(status_code=400, detail="Некорректная электронная почта")
    if not 10 <= len(re.sub(r"\D", "", phone)) <= 15:
        raise HTTPException(status_code=400, detail="Некорректный номер телефона")

    # 2. Пассажиры
    if not data.passengers:
        raise HTTPException(status_code=400, detail="Выберите хотя бы одно место")
    seat_numbers = [p.seat_number for p in data.passengers]
    if len(set(seat_numbers)) != len(seat_numbers):
        raise HTTPException(status_code=400, detail="Одно место выбрано дважды")
    for p in data.passengers:
        if not p.first_name.strip() or not p.last_name.strip():
            raise HTTPException(status_code=400, detail=f"Место {p.seat_number}: укажите имя и фамилию")
        if not p.document_number.strip():
            raise HTTPException(status_code=400, detail=f"Место {p.seat_number}: укажите номер документа")
        if not (p.iin.strip().isdigit() and len(p.iin.strip()) == 12):
            raise HTTPException(status_code=400, detail=f"Место {p.seat_number}: ИИН должен состоять из 12 цифр")

    # 3. Дата
    try:
        travel_day = datetime.strptime(data.travel_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Дата должна быть в формате ГГГГ-ММ-ДД")
    if travel_day < today_start():
        raise HTTPException(status_code=400, detail="Нельзя оформить билет на прошедшую дату")

    # 4. Поезд и вагон
    # with_for_update блокирует строку поезда до конца транзакции: два одновременных
    # заказа на одни места выстраиваются в очередь, и второй получает 409
    train = db.query(models.Train).filter(models.Train.id == data.train_id).with_for_update().first()
    if not train:
        raise HTTPException(status_code=404, detail="Поезд не найден")
    if not train_runs_on_date(train.schedule_days, data.travel_date):
        raise HTTPException(status_code=400, detail="Поезд не ходит в выбранную дату")

    # Новое удержание заменяет прежнее удержание того же человека на тот же поезд и дату
    # (например, если он вернулся назад и оформляет заново): иначе его же места считались бы занятыми
    if status == "pending":
        db.query(models.Booking).filter(
            models.Booking.status == "pending",
            models.Booking.contact_email == email,
            models.Booking.train_id == train.id,
            models.Booking.travel_date == data.travel_date,
        ).update({"status": "released"})

    carriage = db.query(models.Carriage).filter(
        models.Carriage.train_id == train.id,
        models.Carriage.carriage_number == data.carriage_number
    ).first()
    if not carriage:
        raise HTTPException(status_code=404, detail="Вагон не найден")

    # 5. Места существуют и свободны на эту дату
    seats = db.query(models.Seat).filter(
        models.Seat.carriage_id == carriage.id,
        models.Seat.seat_number.in_(seat_numbers)
    ).all()
    if len(seats) != len(seat_numbers):
        raise HTTPException(status_code=400, detail="Некоторых мест нет в этом вагоне")
    seat_by_number = {s.seat_number: s for s in seats}

    taken = get_taken_seats(db, train.id, data.travel_date).get(data.carriage_number, set())
    conflict = [n for n in seat_numbers if n in taken or seat_by_number[n].is_occupied]
    if conflict:
        raise HTTPException(
            status_code=409,
            detail=f"Места уже заняты: {', '.join(map(str, sorted(conflict)))}"
        )

    # 6. Цены считает сервер
    tickets_price = sum(seat_by_number[n].price for n in seat_numbers)
    extras_price = 0
    if data.refund_guarantee:
        extras_price += int(tickets_price * GUARANTEE_RATE + 0.5)
    if data.fast_refund:
        extras_price += int(tickets_price * FAST_REFUND_RATE + 0.5)
    total_price = tickets_price + extras_price

    # 7. Сохраняем заказ и билеты одной транзакцией
    booking = models.Booking(
        user_email=data.user_email,
        contact_email=email,
        contact_phone=phone,
        train_id=train.id,
        train_number=train.number,
        travel_date=data.travel_date,
        carriage_number=data.carriage_number,
        tickets_price=tickets_price,
        extras_price=extras_price,
        total_price=total_price,
        refund_guarantee=data.refund_guarantee,
        fast_refund=data.fast_refund,
        status=status,
    )
    for p in data.passengers:
        booking.tickets.append(models.Ticket(
            seat_number=p.seat_number,
            price=seat_by_number[p.seat_number].price,
            passenger_type=p.passenger_type,
            first_name=p.first_name.strip(),
            last_name=p.last_name.strip(),
            document_type=p.document_type,
            document_number=p.document_number.strip(),
            citizenship=p.citizenship.strip() or "Казахстан",
            iin=p.iin.strip(),
        ))
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking, train


def seconds_left(booking) -> Optional[int]:
    """Сколько секунд осталось на оплату (только для заказов в ожидании оплаты)."""
    if booking.status != "pending":
        return None
    passed = (datetime.utcnow() - booking.created_at).total_seconds()
    return max(0, int(HOLD_MINUTES * 60 - passed))


def order_response(booking, train_number: str, message: str = "") -> dict:
    return {
        "message": message,
        "booking_id": booking.id,
        "status": booking.status,
        "seconds_left": seconds_left(booking),
        "train_number": train_number,
        "travel_date": booking.travel_date,
        "carriage_number": booking.carriage_number,
        "tickets_price": booking.tickets_price,
        "extras_price": booking.extras_price,
        "total_price": booking.total_price,
        "tickets": [
            {
                "seat_number": t.seat_number,
                "passenger": f"{t.last_name} {t.first_name}",
                "price": t.price,
            }
            for t in booking.tickets
        ],
    }


@app.post("/api/bookings", status_code=201, summary="Оформить заказ сразу как оплаченный")
def create_booking(data: BookingCreate, db: Session = Depends(get_db)):
    booking, train = place_order(data, db, "paid")
    return order_response(booking, train.number, "Заказ успешно оформлен!")


@app.post("/api/bookings/hold", status_code=201, summary="Удержать места на время оплаты")
def hold_booking(data: BookingCreate, db: Session = Depends(get_db)):
    booking, train = place_order(data, db, "pending")
    return order_response(booking, train.number, f"Места удерживаются {HOLD_MINUTES} минут")


# ---------- Оплата и освобождение мест ----------

PAYMENT_METHODS = {"card", "kaspi", "installment", "mobile"}


class PaymentIn(BaseModel):
    payment_method: str   # card / kaspi / installment / mobile; данные карты на сервер не отправляются


def get_booking_or_404(db: Session, booking_id: int):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    # Просроченное удержание помечаем, и места снова становятся свободными
    if booking.status == "pending" and seconds_left(booking) == 0:
        booking.status = "expired"
        db.commit()
        db.refresh(booking)
    return booking


@app.get("/api/bookings/{booking_id}", summary="Состояние заказа (для страницы оплаты)")
def get_booking(booking_id: int, db: Session = Depends(get_db)):
    booking = get_booking_or_404(db, booking_id)
    return order_response(booking, booking.train_number)


@app.post("/api/bookings/{booking_id}/pay", summary="Оплатить удержанный заказ")
def pay_booking(booking_id: int, data: PaymentIn, db: Session = Depends(get_db)):
    booking = get_booking_or_404(db, booking_id)
    if booking.status == "paid":
        raise HTTPException(status_code=400, detail="Заказ уже оплачен")
    if booking.status != "pending":
        raise HTTPException(status_code=410, detail="Время на оплату истекло. Выберите места заново")
    if data.payment_method not in PAYMENT_METHODS:
        raise HTTPException(status_code=400, detail="Неизвестный способ оплаты")

    booking.status = "paid"
    booking.payment_method = data.payment_method
    booking.paid_at = datetime.utcnow()
    db.commit()
    db.refresh(booking)
    return order_response(booking, booking.train_number, "Оплата прошла успешно!")


# ---------- Возврат оплаченного заказа ----------
# Учебные правила возврата:
#  • с «Гарантией возврата денег» возвращается 100% стоимости билетов в любое время до отправления;
#  • без гарантии: не позднее чем за 24 часа до отправления 90%, позже 50%;
#  • после отправления поезда возврат невозможен.
# «Быстрый возврат средств» влияет только на срок: 48 часов вместо 10 дней.
# Допуслуги (гарантия и быстрый возврат) не возвращаются.

class CancelIn(BaseModel):
    user_email: str   # логин владельца заказа (пока без токенов: проверка по почте)


def calc_refund(booking, train) -> dict:
    eta = "в течение 48 часов" if booking.fast_refund else "в течение 10 дней"
    if booking.status != "paid":
        return {"allowed": False, "reason": "Возврат возможен только для оплаченного заказа"}

    # Время отправления считаем по местному времени сервера
    departure = datetime.strptime(f"{booking.travel_date} {train.departure_time}", "%Y-%m-%d %H:%M")
    hours_left = (departure - datetime.now()).total_seconds() / 3600
    if hours_left <= 0:
        return {"allowed": False, "reason": "Поезд уже отправился, возврат невозможен"}

    if booking.refund_guarantee:
        percent = 100
    elif hours_left >= 24:
        percent = 90
    else:
        percent = 50

    return {
        "allowed": True,
        "percent": percent,
        "refund_amount": int(booking.tickets_price * percent / 100 + 0.5),
        "eta": eta,
        "hours_left": round(hours_left, 1),
    }


def get_own_booking(db: Session, booking_id: int, user_email: str):
    booking = get_booking_or_404(db, booking_id)
    if not booking.user_email or booking.user_email != (user_email or "").strip():
        raise HTTPException(status_code=403, detail="Это не ваш заказ")
    return booking


@app.get("/api/bookings/{booking_id}/refund", summary="Условия возврата: сколько вернут и когда")
def refund_preview(booking_id: int, user_email: str = Query(...), db: Session = Depends(get_db)):
    booking = get_own_booking(db, booking_id, user_email)
    train = db.query(models.Train).filter(models.Train.id == booking.train_id).first()
    return calc_refund(booking, train)


@app.post("/api/bookings/{booking_id}/cancel", summary="Вернуть билеты: отменить оплаченный заказ")
def cancel_booking(booking_id: int, data: CancelIn, db: Session = Depends(get_db)):
    booking = get_own_booking(db, booking_id, data.user_email)
    train = db.query(models.Train).filter(models.Train.id == booking.train_id).first()
    refund = calc_refund(booking, train)
    if not refund["allowed"]:
        raise HTTPException(status_code=400, detail=refund["reason"])

    booking.status = "cancelled"   # места снова свободны: отменённые заказы их не занимают
    booking.refund_amount = refund["refund_amount"]
    booking.cancelled_at = datetime.utcnow()
    db.commit()
    db.refresh(booking)

    result = order_response(booking, booking.train_number, "Заказ отменён, деньги вернём на карту")
    result.update({"refund_amount": booking.refund_amount, "percent": refund["percent"], "eta": refund["eta"]})
    return result


@app.post("/api/bookings/{booking_id}/release", summary="Отменить удержание и освободить места")
def release_booking(booking_id: int, db: Session = Depends(get_db)):
    booking = get_booking_or_404(db, booking_id)
    if booking.status == "pending":
        booking.status = "released"
        db.commit()
        db.refresh(booking)
    elif booking.status == "paid":
        raise HTTPException(status_code=400, detail="Оплаченный заказ нельзя освободить")
    return order_response(booking, booking.train_number)

@app.get("/api/bookings", summary="Список заказов пользователя по email")
def list_bookings(user_email: Optional[str] = Query(None), db: Session = Depends(get_db)):
    if not user_email or not user_email.strip():
        raise HTTPException(status_code=400, detail="Укажите user_email")

    rows = (
        db.query(models.Booking)
        .filter(
            models.Booking.user_email == user_email.strip(),
            models.Booking.status.in_(["paid", "cancelled"]),
        )
        .order_by(models.Booking.created_at.desc())
        .all()
    )

    result = []
    for b in rows:
        train = db.query(models.Train).filter(models.Train.id == b.train_id).first()
        result.append({
            "booking_id": b.id,
            "status": b.status,
            "train_number": b.train_number,
            "from_city": train.from_city if train else "",
            "to_city": train.to_city if train else "",
            "travel_date": b.travel_date,
            "departure_time": train.departure_time if train else "",
            "carriage_number": b.carriage_number,
            "tickets_price": b.tickets_price,
            "extras_price": b.extras_price,
            "total_price": b.total_price,
            "passengers_count": len(b.tickets),
            "refund_guarantee": b.refund_guarantee,
            "fast_refund": b.fast_refund,
            "refund_amount": b.refund_amount,
            "cancelled_at": b.cancelled_at.isoformat() if b.cancelled_at else None,
            "tickets": [
                {
                    "seat_number": t.seat_number,
                    "passenger": f"{t.last_name} {t.first_name}",
                    "price": t.price,
                }
                for t in b.tickets
            ],
            "created_at": b.created_at.isoformat() if b.created_at else None,
        })
    return result