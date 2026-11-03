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
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    train_number = Column(String, nullable=False)
    passenger_name = Column(String, nullable=False)
    passenger_iin = Column(String, nullable=False)
    seats_list = Column(String, nullable=False)
    total_price = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="bookings")