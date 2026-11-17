import React, { useState, useEffect } from 'react';

const cardStyle = {
  backgroundColor: 'var(--card-bg)',
  color: 'var(--text-color)',
  borderColor: 'var(--border-color)',
};

const STORAGE_KEY = 'profile_settings';

export default function Profilesettings() {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    user = null;
  }

  const [form, setForm] = useState({
    gender: '',
    fullName: user?.full_name || '',
    birthDate: '',
    email: user?.email || user?.username || '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    language: localStorage.getItem('selected_lang') || 'ru',
    subscribe: false,
    orgName: '',
    orgBin: '',
    orgInn: '',
    legalAddress: '',
    legalStreet: '',
    legalHouse: '',
    legalOffice: '',
    legalIndex: '',
    orgPhone: '',
    factAddress: '',
    factStreet: '',
    factHouse: '',
    factOffice: '',
    factIndex: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setForm((prev) => ({ ...prev, ...data }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = (e) => {
    e.preventDefault();
    const toSave = { ...form };
    delete toSave.currentPassword;
    delete toSave.newPassword;
    delete toSave.confirmPassword;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    if (form.language) {
      localStorage.setItem('selected_lang', form.language);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const initial = (user?.full_name || user?.username || 'A').charAt(0).toUpperCase();

  return (
    <form onSubmit={handleSave}>
      <h5 className="fw-bold mb-3">Настройка профиля</h5>

      {/* Avatar */}
      <div className="card border rounded-4 p-3 mb-3" style={cardStyle}>
        <div className="d-flex align-items-center gap-3">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
            style={{
              width: 48,
              height: 48,
              background: 'var(--accent-teal)',
              fontSize: '1.25rem',
            }}
          >
            {initial}
          </div>
          <div>
            <div className="fw-semibold small">Avatar</div>
            <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" disabled>
              Загрузить фото
            </button>
          </div>
        </div>
      </div>

      {/* Personal */}
      <div className="card border rounded-4 p-3 p-md-4 mb-3" style={cardStyle}>
        <h6 className="fw-bold mb-3">Персональные данные</h6>
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label small text-muted">Пол</label>
            <select
              className="form-select"
              value={form.gender}
              onChange={(e) => set('gender', e.target.value)}
            >
              <option value="">—</option>
              <option value="m">Мужской</option>
              <option value="f">Женский</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label small text-muted">ФИО</label>
            <input
              className="form-control"
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small text-muted">Дата рождения</label>
            <input
              type="date"
              className="form-control"
              value={form.birthDate}
              onChange={(e) => set('birthDate', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Contacts */}
      <div className="card border rounded-4 p-3 p-md-4 mb-3" style={cardStyle}>
        <h6 className="fw-bold mb-3">Контактные данные покупателя</h6>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label small text-muted">Email</label>
            <input className="form-control" value={form.email} disabled />
          </div>
          <div className="col-md-6">
            <label className="form-label small text-muted">Номер телефона</label>
            <div className="input-group">
              <span className="input-group-text">+7</span>
              <input
                className="form-control"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="700 000 00 00"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Password */}
      <div className="card border rounded-4 p-3 p-md-4 mb-3" style={cardStyle}>
        <h6 className="fw-bold mb-3">Изменение пароля</h6>
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label small text-muted">Текущий пароль</label>
            <input
              type="password"
              className="form-control"
              value={form.currentPassword}
              onChange={(e) => set('currentPassword', e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small text-muted">Новый пароль</label>
            <input
              type="password"
              className="form-control"
              value={form.newPassword}
              onChange={(e) => set('newPassword', e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small text-muted">Повторите новый пароль</label>
            <input
              type="password"
              className="form-control"
              value={form.confirmPassword}
              onChange={(e) => set('confirmPassword', e.target.value)}
            />
          </div>
        </div>
        <p className="small text-muted mt-2 mb-0">
          Смена пароля в учебной версии только на фронтенде (не отправляется на сервер).
        </p>
      </div>

      {/* Language */}
      <div className="card border rounded-4 p-3 p-md-4 mb-3" style={cardStyle}>
        <h6 className="fw-bold mb-3">Язык</h6>
        <select
          className="form-select"
          style={{ maxWidth: 240 }}
          value={form.language}
          onChange={(e) => set('language', e.target.value)}
        >
          <option value="ru">Русский</option>
          <option value="kz">Қазақша</option>
          <option value="en">English</option>
        </select>
      </div>

      {/* Subscribe */}
      <div className="card border rounded-4 p-3 p-md-4 mb-3" style={cardStyle}>
        <h6 className="fw-bold mb-3">Настройки подписки</h6>
        <div className="form-check form-switch">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            id="subscribeSwitch"
            checked={form.subscribe}
            onChange={(e) => set('subscribe', e.target.checked)}
          />
          <label className="form-check-label small" htmlFor="subscribeSwitch">
            Я хочу получать информацию о спецпредложениях, акциях и дополнительных услугах по
            email/телефону.
          </label>
        </div>
        <p className="small text-muted mt-2 mb-0">
          Отписаться от рассылки можно в личном кабинете или по ссылке в любом письме.
        </p>
      </div>

      {/* Legal entity */}
      <h6 className="fw-bold mb-3">Реквизиты юридического лица</h6>
      <div className="card border rounded-4 p-3 p-md-4 mb-3" style={cardStyle}>
        <h6 className="fw-semibold mb-3">Организация</h6>
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label className="form-label small text-muted">Название организации</label>
            <input
              className="form-control"
              value={form.orgName}
              onChange={(e) => set('orgName', e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small text-muted">Код БИН/ИИН</label>
            <input
              className="form-control"
              value={form.orgBin}
              onChange={(e) => set('orgBin', e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small text-muted">ИНН</label>
            <input
              className="form-control"
              value={form.orgInn}
              onChange={(e) => set('orgInn', e.target.value)}
            />
          </div>
        </div>

        <h6 className="fw-semibold mb-2">Юридический адрес</h6>
        <div className="row g-3 mb-3">
          <div className="col-md-4">
            <input
              className="form-control"
              placeholder="Юридический адрес"
              value={form.legalAddress}
              onChange={(e) => set('legalAddress', e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <input
              className="form-control"
              placeholder="Улица"
              value={form.legalStreet}
              onChange={(e) => set('legalStreet', e.target.value)}
            />
          </div>
          <div className="col-md-1">
            <input
              className="form-control"
              placeholder="Дом"
              value={form.legalHouse}
              onChange={(e) => set('legalHouse', e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <input
              className="form-control"
              placeholder="Офис"
              value={form.legalOffice}
              onChange={(e) => set('legalOffice', e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <input
              className="form-control"
              placeholder="Индекс"
              value={form.legalIndex}
              onChange={(e) => set('legalIndex', e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <div className="input-group">
              <span className="input-group-text">+7</span>
              <input
                className="form-control"
                placeholder="Телефон организации"
                value={form.orgPhone}
                onChange={(e) => set('orgPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </div>
          </div>
        </div>

        <h6 className="fw-semibold mb-2">Фактический адрес</h6>
        <div className="row g-3">
          <div className="col-md-4">
            <input
              className="form-control"
              placeholder="Фактический адрес"
              value={form.factAddress}
              onChange={(e) => set('factAddress', e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <input
              className="form-control"
              placeholder="Улица"
              value={form.factStreet}
              onChange={(e) => set('factStreet', e.target.value)}
            />
          </div>
          <div className="col-md-1">
            <input
              className="form-control"
              placeholder="Дом"
              value={form.factHouse}
              onChange={(e) => set('factHouse', e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <input
              className="form-control"
              placeholder="Офис"
              value={form.factOffice}
              onChange={(e) => set('factOffice', e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <input
              className="form-control"
              placeholder="Индекс"
              value={form.factIndex}
              onChange={(e) => set('factIndex', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 align-items-center mb-4">
        <button type="submit" className="btn btn-teal px-4">
          Сохранить изменения
        </button>
        {saved && <span className="text-success small">Сохранено</span>}
        <button type="button" className="btn btn-outline-danger ms-auto" disabled>
          Удалить аккаунт
        </button>
      </div>
    </form>
  );
}
