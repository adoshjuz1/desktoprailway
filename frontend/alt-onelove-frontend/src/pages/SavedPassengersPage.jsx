import { useState } from 'react';
import { loadSavedPassengers, saveSavedPassengers } from '../savedPassengers';
import { useToast } from '../toast';

const cardStyle = {
  backgroundColor: 'var(--card-bg)',
  color: 'var(--text-color)',
  borderColor: 'var(--border-color)',
};

const DOC_TYPES = ['Удостоверение личности', 'Паспорт', 'Свидетельство о рождении'];

const emptyForm = () => ({
  fullName: '',
  citizenship: 'Казахстан',
  documentType: DOC_TYPES[0],
  documentNumber: '',
  iin: '',
});

export default function SavedPassengersPage() {
  const toast = useToast();
  const [list, setList] = useState(loadSavedPassengers);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);

  const persist = (next) => {
    setList(next);
    saveSavedPassengers(next);
  };

  const startAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setForm({
      fullName: p.fullName,
      citizenship: p.citizenship,
      documentType: p.documentType,
      documentNumber: p.documentNumber,
      iin: p.iin || '',
    });
    setShowForm(true);
  };

  const save = () => {
    if (!form.fullName.trim() || !form.documentNumber.trim()) {
      toast.error('Укажите ФИО и номер документа');
      return;
    }
    if (form.iin && form.iin.length !== 12) {
      toast.error('ИИН должен состоять из 12 цифр или остаться пустым');
      return;
    }
    if (editingId) {
      persist(
        list.map((p) =>
          p.id === editingId
            ? { ...p, ...form, fullName: form.fullName.trim(), documentNumber: form.documentNumber.trim() }
            : p
        )
      );
    } else {
      persist([
        ...list,
        {
          id: Date.now(),
          fullName: form.fullName.trim(),
          citizenship: form.citizenship.trim() || 'Казахстан',
          documentType: form.documentType,
          documentNumber: form.documentNumber.trim(),
          iin: form.iin,
        },
      ]);
    }
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const remove = (id) => {
    persist(list.filter((p) => p.id !== id));
  };

  return (
    <div>
      <h5 className="fw-bold mb-3">Сохранённые данные пассажиров</h5>

      <div className="alert alert-info small py-2">
        <div className="mb-1">
          <i className="bi bi-check-circle-fill text-success me-1"></i>
          Здесь хранятся данные пассажиров для быстрых покупок: они подставляются при бронировании.
          Данные хранятся только в этом браузере.
        </div>
        <div className="text-muted">
          <i className="bi bi-exclamation-triangle-fill text-warning me-1"></i>
          Чтобы изменить информацию о пассажирах в созданном заказе, выберите «Редактирование
          пассажиров» в деталях этого заказа
        </div>
      </div>

      <button type="button" className="btn btn-outline-secondary w-100 mb-3" onClick={startAdd}>
        + Добавить пассажира
      </button>

      {showForm && (
        <div className="card border rounded-4 p-3 p-md-4 mb-3" style={cardStyle}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small text-muted">ФИО</label>
              <input
                className="form-control"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Имя Фамилия"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small text-muted">Гражданство</label>
              <input
                className="form-control"
                value={form.citizenship}
                onChange={(e) => setForm({ ...form, citizenship: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small text-muted">Тип документа</label>
              <select
                className="form-select"
                value={form.documentType}
                onChange={(e) => setForm({ ...form, documentType: e.target.value })}
              >
                {DOC_TYPES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label small text-muted">Номер документа</label>
              <input
                className="form-control"
                value={form.documentNumber}
                onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small text-muted">ИИН (необязательно, 12 цифр)</label>
              <input
                className="form-control"
                inputMode="numeric"
                maxLength={12}
                value={form.iin}
                onChange={(e) => setForm({ ...form, iin: e.target.value.replace(/\D/g, '') })}
              />
            </div>
          </div>
          <div className="d-flex gap-2 mt-3">
            <button type="button" className="btn btn-teal" onClick={save}>
              Сохранить
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      <div className="d-flex flex-column gap-3">
        {list.map((p) => (
          <div key={p.id} className="card border rounded-4 p-3" style={cardStyle}>
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
              <div>
                <div className="fw-semibold">{p.fullName}</div>
                <div className="small text-muted mt-1">
                  <i className="bi bi-geo-alt me-1"></i>
                  {p.citizenship}
                  <span className="mx-2">·</span>
                  {p.documentType}
                  <span className="mx-2">·</span>
                  {p.documentNumber}
                  {p.iin && (
                    <>
                      <span className="mx-2">·</span>
                      ИИН ••••••••{p.iin.slice(-4)}
                    </>
                  )}
                </div>
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-link text-danger text-decoration-none"
                  onClick={() => remove(p.id)}
                >
                  Удалить
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => startEdit(p)}
                >
                  <i className="bi bi-pencil me-1"></i>
                  Редактировать
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}