import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider, useTheme } from './ThemeContext';
import HomePage from './pages/HomePage';
import SearchResultsPage from './pages/SearchResultsPage';
import SeatSelectionPage from './pages/SeatSelectionPage';
import KtzNewsPage from './pages/KtzNewsPage';
import UniNewsPage from './pages/UniNewsPage';
import PostDetailPage from './pages/PostDetailPage';

function Navigation() {
  const [lang, setLang] = useState(localStorage.getItem('selected_lang') || 'ru');
  const [currentUser, setCurrentUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  
  const profileRef = useRef(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Ошибка чтения пользователя из localStorage', e);
      }
    }

    fetch('http://127.0.0.1:8001/api/categories/')
      .then(res => res.json())
      .then(data => {
        const items = data.results || data;
        setCategories(items);
      })
      .catch(err => console.error('Ошибка загрузки категорий в шапке:', err));

    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLangChange = (e) => {
    const newLang = e.target.value;
    setLang(newLang);
    localStorage.setItem('selected_lang', newLang);
    window.location.reload();
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setCurrentUser(null);
    setProfileOpen(false);
    window.location.reload();
  };

  const langKey = lang === 'kz' ? 'kaz' : (lang === 'en' ? 'eng' : 'rus');

  // Динамический цвет фона для выпадающих меню: в светлом режиме #0F2C59, в тёмном — темный цвет карточки
  const dropdownBgColor = isDarkMode ? 'var(--card-bg, #1a1d26)' : '#0F2C59';

  return (
    <>
      <style>{`
        .nav-item.dropdown:hover .dropdown-menu-custom {
          display: block !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        .dropdown-menu-custom {
          display: none;
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 0;
          padding-top: 6px;
          z-index: 1100;
        }
        .dropdown-menu-custom .dropdown-content {
          background-color: ${dropdownBgColor} !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 10px !important;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4) !important;
          min-width: 200px;
          overflow: hidden;
        }
        .dropdown-menu-custom .dropdown-item {
          color: #ffffff !important;
          padding: 9px 16px;
          font-size: 13px;
          transition: background-color 0.2s, color 0.2s;
        }
        .dropdown-menu-custom .dropdown-item:hover {
          background-color: var(--accent-teal, #00B4D8) !important;
          color: #000000 !important;
        }

        /* Выпадающее меню профиля адаптированное под режим темы */
        .profile-dropdown-popup {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 8px;
          min-width: 310px;
          background-color: ${dropdownBgColor} !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 12px;
          color: #ffffff !important;
          box-shadow: 0 15px 35px rgba(0,0,0,0.4);
          padding: 16px;
          z-index: 1200;
        }
        .profile-link {
          color: #e2e8f0 !important;
          padding: 10px 12px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          font-size: 13px;
          transition: background 0.2s, color 0.2s;
        }
        .profile-link:hover {
          background-color: rgba(255, 255, 255, 0.12) !important;
          color: var(--accent-teal, #00B4D8) !important;
        }
      `}</style>

      <nav className="navbar navbar-expand-lg navbar-dark navbar-custom position-relative" style={{ backgroundColor: 'var(--nav-bg, #0F2C59)', fontSize: '13px', padding: '4px 8px', borderBottom: '2px solid var(--accent-teal, #00B4D8)', zIndex: 1090 }}>
        <div className="container-fluid px-2">
          {/* Слева: Выбор языка + Иконка собачки (Профиль) + ALT ONE LOVE */}
          <div className="d-flex align-items-center gap-2">
            <div className="d-flex align-items-center">
              <i className="bi bi-globe text-white-50 me-1" style={{ fontSize: '12px' }}></i>
              <select 
                className="lang-select" 
                style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '4px', padding: '1px 4px', fontSize: '12px' }}
                value={lang} 
                onChange={handleLangChange}
              >
                <option value="ru" className="text-dark">RUS</option>
                <option value="kz" className="text-dark">KAZ</option>
                <option value="en" className="text-dark">ENG</option>
              </select>
            </div>

            {/* Профиль по клику */}
            {currentUser ? (
              <div className="position-relative" ref={profileRef}>
                <button 
                  className="btn p-0 border-0 d-flex align-items-center justify-content-center"
                  type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    backgroundColor: 'rgba(255, 255, 255, 0.15)', 
                    border: '1px solid var(--accent-teal, #00B4D8)', 
                    cursor: 'pointer', 
                    overflow: 'hidden' 
                  }}
                  title="Личный кабинет"
                >
                  <span style={{ fontSize: '18px', lineHeight: '1' }}>🐶</span>
                </button>

                {profileOpen && (
                  <div className="profile-dropdown-popup">
                    {/* Шапка профиля */}
                    <div className="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom border-white-50">
                      <div className="d-flex align-items-center gap-2 overflow-hidden">
                        <div 
                          className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" 
                          style={{ width: '38px', height: '38px', backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
                        >
                          <span style={{ fontSize: '22px' }}>🐶</span>
                        </div>
                        <div className="overflow-hidden">
                          <div className="fw-bold text-white text-truncate" style={{ fontSize: '14px', lineHeight: '1.2' }}>
                            {currentUser.full_name || currentUser.username}
                          </div>
                          <small className="text-white-50 text-truncate d-block" style={{ fontSize: '11px' }}>
                            {currentUser.email || currentUser.username}
                          </small>
                        </div>
                      </div>
                      <button 
                        onClick={handleLogout} 
                        className="btn btn-link text-danger p-0 text-decoration-none fw-bold flex-shrink-0 ms-2"
                        style={{ fontSize: '12px' }}
                      >
                        Выйти
                      </button>
                    </div>

                    {/* Блок заказов */}
                    <div className="mb-3">
                      <div className="fw-bold small mb-2 text-white-50">Мои заказы</div>
                      <div className="p-3 text-center rounded-3" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.2)', fontSize: '12px', color: '#cbd5e1' }}>
                        У вас пока нет активных билетов
                      </div>
                    </div>

                    <div className="border-bottom border-white-50 mb-2" style={{ opacity: 0.3 }}></div>

                    {/* Разделы меню */}
                    <div className="d-flex flex-column gap-1">
                      <Link to="/my-tickets" className="profile-link" onClick={() => setProfileOpen(false)}>
                        <i className="bi bi-ticket-perforated" style={{ color: 'var(--accent-teal, #00B4D8)' }}></i> Мои билеты / покупки
                      </Link>

                      <Link to="/favorites" className="profile-link" onClick={() => setProfileOpen(false)}>
                        <i className="bi bi-star text-warning"></i> Избранные маршруты
                      </Link>

                      <Link to="/notifications" className="profile-link" onClick={() => setProfileOpen(false)}>
                        <i className="bi bi-bell text-info"></i> Уведомления
                      </Link>

                      <Link to="/profile-settings" className="profile-link" onClick={() => setProfileOpen(false)}>
                        <i className="bi bi-gear text-light opacity-75"></i> Настройка профиля
                      </Link>

                      {currentUser.is_staff && (
                        <a 
                          href="http://127.0.0.1:8001/admin/" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="profile-link fw-bold text-warning"
                          onClick={() => setProfileOpen(false)}
                        >
                          <i className="bi bi-shield-lock-fill"></i> Админка (Создать пост)
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button className="btn btn-outline-light btn-sm py-0 px-2" style={{ fontSize: '12px' }} data-bs-toggle="modal" data-bs-target="#authModal">
                <i className="bi bi-person-fill me-1"></i>Войти
              </button>
            )}

            <Link className="navbar-brand fw-bold ms-1 mb-0 p-0" style={{ fontSize: '16px', color: 'var(--accent-teal, #00B4D8)' }} to="/">
              <i className="bi bi-heart-fill me-1 text-danger"></i>ALT ONE LOVE
            </Link>
          </div>

          {/* Гамбургер */}
          <button className="navbar-toggler py-0 px-1" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon" style={{ width: '1em', height: '1em' }}></span>
          </button>

          {/* Справа: Навигация */}
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto align-items-center gap-3">
              <li className="nav-item">
                <Link className="nav-link py-0 text-white" to="/"><i className="bi bi-house-door me-1"></i>Главная</Link>
              </li>

              {/* Выпадающее меню: Новости КТЖ */}
              <li className="nav-item dropdown position-relative">
                <Link className="nav-link py-0 text-white d-flex align-items-center gap-1" to="/ktz-news">
                  <i className="bi bi-newspaper me-1"></i>Новости КТЖ <i className="bi bi-chevron-down" style={{ fontSize: '10px' }}></i>
                </Link>
                <div className="dropdown-menu-custom">
                  <div className="dropdown-content">
                    <Link className="dropdown-item d-block" to="/ktz-news">Все темы КТЖ</Link>
                    {categories.length > 0 && <div className="border-bottom border-white-50 my-1 opacity-25"></div>}
                    {categories.map(cat => {
                      const catName = cat[`name_${langKey}`] || cat.name_rus || cat.name;
                      return (
                        <Link key={cat.id} className="dropdown-item d-block" to={`/ktz-news?category=${cat.id}`}>
                          {catName}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </li>

              {/* Выпадающее меню: Новости Alt University */}
              <li className="nav-item dropdown position-relative">
                <Link className="nav-link py-0 text-white d-flex align-items-center gap-1" to="/uni-news">
                  <i className="bi bi-mortarboard-fill me-1"></i>Новости Alt University <i className="bi bi-chevron-down" style={{ fontSize: '10px' }}></i>
                </Link>
                <div className="dropdown-menu-custom">
                  <div className="dropdown-content">
                    <Link className="dropdown-item d-block" to="/uni-news">Все темы</Link>
                    {categories.length > 0 && <div className="border-bottom border-white-50 my-1 opacity-25"></div>}
                    {categories.map(cat => {
                      const catName = cat[`name_${langKey}`] || cat.name_rus || cat.name;
                      return (
                        <Link key={cat.id} className="dropdown-item d-block" to={`/uni-news?category=${cat.id}`}>
                          {catName}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </li>

              <li className="nav-item">
                <button 
                  className="theme-toggle-btn" 
                  onClick={toggleTheme} 
                  title="Переключить тему"
                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '14px', cursor: 'pointer' }}
                >
                  <i className={`bi ${isDarkMode ? 'bi-sun-fill text-warning' : 'bi-moon-stars-fill'}`}></i>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
}

// Глобальное модальное окно авторизации
function GlobalAuthModal() {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://127.0.0.1:8001/api/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginEmail, password: loginPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка входа');

      localStorage.setItem('user', JSON.stringify(data));
      alert('Авторизация успешна!');
      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://127.0.0.1:8001/api/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: regEmail, email: regEmail, password: regPassword, full_name: regFullName })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка регистрации');

      alert(data.message || 'Регистрация прошла успешно!');
      setRegFullName('');
      setRegEmail('');
      setRegPassword('');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="modal fade" id="authModal" tabIndex="-1" aria-labelledby="authModalLabel" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content" style={{ backgroundColor: '#0F2C59', color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)' }}>
          <div className="modal-header border-bottom border-white-50">
            <h5 className="modal-title fw-bold" id="authModalLabel">
              <i className="bi bi-person-circle me-2" style={{ color: 'var(--accent-teal)' }}></i>Вход в личный кабинет
            </h5>
            <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body p-4">
            <ul className="nav nav-pills nav-justified mb-3" id="authTab" role="tablist">
              <li className="nav-item" role="presentation">
                <button className="nav-link active" id="login-tab" data-bs-toggle="tab" data-bs-target="#login-tab-pane" type="button" role="tab">Вход</button>
              </li>
              <li className="nav-item" role="presentation">
                <button className="nav-link" id="register-tab" data-bs-toggle="tab" data-bs-target="#register-tab-pane" type="button" role="tab">Регистрация</button>
              </li>
            </ul>

            <div className="tab-content" id="authTabContent">
              <div className="tab-pane fade show active" id="login-tab-pane" role="tabpanel" tabIndex="0">
                <form onSubmit={handleLoginSubmit}>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Email или логин</label>
                    <div className="input-group">
                      <span className="input-group-text"><i className="bi bi-envelope"></i></span>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="example@mail.kz" 
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Пароль</label>
                    <div className="input-group">
                      <span className="input-group-text"><i className="bi bi-lock"></i></span>
                      <input 
                        type="password" 
                        className="form-control" 
                        placeholder="••••••••" 
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-teal w-100 fw-bold py-2">Войти</button>
                </form>
              </div>

              <div className="tab-pane fade" id="register-tab-pane" role="tabpanel" tabIndex="0">
                <form onSubmit={handleRegisterSubmit}>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">ФИО</label>
                    <div className="input-group">
                      <span className="input-group-text"><i className="bi bi-person"></i></span>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Иванов Иван" 
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Email</label>
                    <div className="input-group">
                      <span className="input-group-text"><i className="bi bi-envelope"></i></span>
                      <input 
                        type="email" 
                        className="form-control" 
                        placeholder="example@mail.kz" 
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Пароль</label>
                    <div className="input-group">
                      <span className="input-group-text"><i className="bi bi-lock"></i></span>
                      <input 
                        type="password" 
                        className="form-control" 
                        placeholder="Придумайте пароль" 
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-teal w-100 fw-bold py-2">Зарегистрироваться</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <Navigation />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/seats" element={<SeatSelectionPage />} />
          <Route path="/ktz-news" element={<KtzNewsPage />} />
          <Route path="/uni-news" element={<UniNewsPage />} />
          <Route path="/post/:id" element={<PostDetailPage />} />
        </Routes>

        <GlobalAuthModal />

        <footer className="bg-dark text-white py-3 mt-5">
          <div className="container text-center">
            <p className="mb-0 small opacity-75">© 2026 Агрегатор ЖД Билетов «ALT ONE LOVE».</p>
          </div>
        </footer>
      </Router>
    </ThemeProvider>
  );
}