from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date as date_type

from database import get_db
from models import Train, Seat, Booking
from pydantic import BaseModel

router = APIRouter(prefix="/api/trains", tags=["Trains"])

class SeatOut(BaseModel):
    id: int
    carriage_type: str
    seat_number: int
    price: int
    is_occupied: bool
    class Config:
        from_attributes = True

class TrainOut(BaseModel):
    id: int
    number: str
    category: str
    from_city: str
    to_city: str
    departure_time: str
    arrival_time: str
    duration_text: Optional[str] = "9ч"
    seats: List[SeatOut] = []
    class Config:
        from_attributes = True

class BookingCreate(BaseModel):
    train_id: int
    passenger_name: str
    passenger_iin: str
    seat_numbers: str
    total_price: int

@router.get("/search", response_model=List[TrainOut])
async def search_trains(
    from_city: Optional[str] = Query(None),
    to_city: Optional[str] = Query(None),
    date: Optional[date_type] = Query(None),
    min_price: Optional[int] = Query(None),
    max_price: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    query = select(Train).options(selectinload(Train.seats))

    if from_city:
        query = query.where(Train.from_city.ilike(f"%{from_city}%"))
    if to_city:
        query = query.where(Train.to_city.ilike(f"%{to_city}%"))

    result = await db.execute(query)
    trains = result.scalars().all()

    # Если в базе пусто, возвращаем дефолтный список чтобы фронтенд не был пустым
    if not trains:
        return [
            TrainOut(
                id=1, number="002А", category="Скоростной", from_city=from_city or "Алматы", to_city=to_city or "Астана",
                departure_time="2026-10-01T08:30:00", arrival_time="2026-10-01T18:00:00", duration_text="9ч 30м",
                seats=[SeatOut(id=i, carriage_type="Купе", seat_number=i, price=12500, is_occupied=(i in [3, 7])) for i in range(1, 15)]
            )
        ]

    return trains


@router.post("/booking", status_code=status.HTTP_201_CREATED)
async def create_booking(data: BookingCreate, db: AsyncSession = Depends(get_db)):
    # Сохраняем бронь в таблицу bookings
    new_booking = Booking(
        train_id=data.train_id,
        passenger_name=data.passenger_name,
        passenger_iin=data.passenger_iin,
        seat_numbers=data.seat_numbers,
        total_price=data.total_price,
        status="paid"
    )
    db.add(new_booking)
    
    # Помечаем выбранные места как занятые в таблице seats
    seat_nums = [int(s.strip()) for s in data.seat_numbers.split(",") if s.strip().isdigit()]
    if seat_nums:
        seats_to_update = await db.execute(
            select(Seat).where(Seat.train_id == data.train_id, Seat.seat_number.in_(seat_nums))
        )
        for seat in seats_to_update.scalars().all():
            seat.is_occupied = True

    await db.commit()
    return {"message": "Билет успешно забронирован и оплачен!", "booking_id": new_booking.id}