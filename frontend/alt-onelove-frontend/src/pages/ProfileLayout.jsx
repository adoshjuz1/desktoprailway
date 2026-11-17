import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const cardStyle = {
  backgroundColor: 'var(--card-bg)',
  color: 'var(--text-color)',
  borderColor: 'var(--border-color)',
};

const MENU = [
  { to: '/my-tickets', label: 'Ж/Д билеты', icon: 'bi-train-front' },
  { to: '/insurance', label: 'Страховки', icon: 'bi-shield-check' },
  { to: '/saved-passengers', label: 'Сохранённые данные пассажиров', icon: 'bi-people' },
  { to: '/loyalty', label: 'Программы лояльности', icon: 'bi-gift' },
  { to: '/payment-cards', label: 'Мои платёжные карты', icon: 'bi-credit-card' },
  { to: '/profile-settings', label: 'Настройка профиля', icon: 'bi-gear' },
];

export default function ProfileLayout() {
  const navigate = useNavigate();

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    user = null;
  }

  if (!user) {
    return (
      <div className="container my-5 text-center">
        <div className="alert alert-warning d-inline-block">
          Войдите в аккаунт, чтобы открыть личный кабинет.
        </div>
        <div>
          <button
            type="button"
            className="btn btn-teal mt-3"
            data-bs-toggle="modal"
            data-bs-target="#authModal"
          >
            Войти
          </button>
        </div>
      </div>
    );
  }

  const displayName = user.full_name || user.username || 'Пользователь';

  return (
    <div className="container my-4 my-md-5">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h5 className="mb-0 fw-semibold">Приветствуем, {displayName}</h5>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary rounded-circle"
          style={{ width: 36, height: 36 }}
          onClick={() => navigate('/')}
          title="Закрыть"
        >
          <i className="bi bi-x-lg"></i>
        </button>
      </div>

      <div className="row g-4">
        {/* Левое меню */}
        <div className="col-lg-3 col-md-4">
          <div className="card border rounded-4 overflow-hidden" style={cardStyle}>
            <nav className="d-flex flex-column">
              {MENU.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `d-flex align-items-center gap-2 px-3 py-3 text-decoration-none border-bottom ${
                      isActive ? 'fw-semibold' : ''
                    }`
                  }
                  style={({ isActive }) => ({
                    color: isActive ? 'var(--accent-teal)' : 'var(--text-color)',
                    background: isActive ? 'rgba(0, 180, 216, 0.08)' : 'transparent',
                    borderColor: 'var(--border-color) !important',
                  })}
                >
                  <i className={`bi ${item.icon}`}></i>
                  <span className="small">{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* Контент страницы */}
        <div className="col-lg-9 col-md-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
