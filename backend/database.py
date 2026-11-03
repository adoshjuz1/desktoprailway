import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Настройки берём из backend/.env, пароль в коде не хранится
load_dotenv(Path(__file__).resolve().parent / ".env")

# Драйвер psycopg (версии 3), хорошо работает под Windows
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
if not SQLALCHEMY_DATABASE_URL:
    raise RuntimeError("Не задана переменная DATABASE_URL (см. backend/.env.example)")

engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
