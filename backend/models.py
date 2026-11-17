from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    phone = Column(String, nullable=True)

    bookings = relationship("Booking", back_populates="user")


class Train(Base):
    __tablename__ = "trains"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(String, nullable=False)          # Напр: "012Т"
    name = Column(String, nullable=False)            # Напр: "Алматы — Атырау"
    category = Column(String, default="Скоростной")
    from_city = Column(String, nullable=False)       # "Алматы"
    to_city = Column(String, nullable=False)         # "Атырау"
    
    # Расписание и график (строка дней, например: "Понедельник, Четверг")
    schedule_days = Column(String, nullable=False)   
    departure_time = Column(String, nullable=False)  # Время отправления, напр: "15:20"
    arrival_time = Column(String, nullable=False)    # Время прибытия, напр: "08:00"
    duration_text = Column(String, nullable=False)   # Напр: "40ч 40м"

    carriages = relationship("Carriage", back_populates="train", cascade="all, delete-orphan")


class Carriage(Base):
    __tablename__ = "carriages"

    id = Column(Integer, primary_key=True, index=True)
    train_id = Column(Integer, ForeignKey("trains.id"))
    carriage_number = Column(Integer, nullable=False)
    carriage_type = Column(String, nullable=False)   # Купе / Плацкарт

    train = relationship("Train", back_populates="carriages")
    seats = relationship("Seat", back_populates="carriage", cascade="all, delete-orphan")


class Seat(Base):
    __tablename__ = "seats"

    id = Column(Integer, primary_key=True, index=True)
    carriage_id = Column(Integer, ForeignKey("carriages.id"))
    seat_number = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    is_occupied = Column(Boolean, default=False)

    carriage = relationship("Carriage", back_populates="seats")


class Booking(Base):
    """Заказ: один заказ может содержать несколько билетов (по одному на пассажира)."""
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    user_email = Column(String, nullable=True, index=True)   # логин из Django, для «Мои билеты»
    contact_email = Column(String, nullable=False)           # куда отправить билет
    contact_phone = Column(String, nullable=False)           # куда сообщить об изменениях
    train_id = Column(Integer, ForeignKey("trains.id"), nullable=False)
    train_number = Column(String, nullable=False)
    travel_date = Column(String, nullable=False)             # дата отправления, например "2026-10-14"
    carriage_number = Column(Integer, nullable=False)
    tickets_price = Column(Float, nullable=False)            # сумма за места
    extras_price = Column(Float, default=0)                  # допуслуги
    total_price = Column(Float, nullable=False)              # итого
    refund_guarantee = Column(Boolean, default=False)        # «Гарантия возврата денег»
    fast_refund = Column(Boolean, default=False)             # «Быстрый возврат средств»
    status = Column(String, default="paid")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="bookings")
    tickets = relationship("Ticket", back_populates="booking", cascade="all, delete-orphan")


class Ticket(Base):
    """Билет: одно место и один пассажир."""
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    seat_number = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    passenger_type = Column(String, default="Взрослый")
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    document_type = Column(String, nullable=False)
    document_number = Column(String, nullable=False)
    citizenship = Column(String, default="Казахстан")
    iin = Column(String, nullable=False)

    booking = relationship("Booking", back_populates="tickets")