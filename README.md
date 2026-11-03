# ALT ONE LOVE (fullcase)

Агрегатор ЖД-билетов и новостей. Учебный кейс-проект.

- `backend/` — FastAPI (поезда, вагоны, места; порт 8000) и Django `alt_news` (новости, вход, регистрация; порт 8001), общая БД PostgreSQL `fullcase`
- `frontend/alt-onelove-frontend/` — React 19 + Vite

## Запуск backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env          # затем впиши свои значения
uvicorn main:app --port 8000 --reload
python manage.py migrate
python manage.py runserver 8001
```

## Запуск frontend

```bash
cd frontend/alt-onelove-frontend
npm install
npm run dev
```