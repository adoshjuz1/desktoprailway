// Сохранённые пассажиры хранятся в localStorage отдельно для каждого аккаунта,
// чтобы после смены пользователя в этом браузере чужие данные не показывались.
const LEGACY_KEY = 'saved_passengers';

const currentLogin = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.email || user?.username || null;
  } catch {
    return null;
  }
};

const keyFor = (login) => (login ? `${LEGACY_KEY}:${login}` : LEGACY_KEY);

const parse = (raw) => {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export function loadSavedPassengers() {
  const login = currentLogin();
  const raw = localStorage.getItem(keyFor(login));
  if (raw !== null || !login) return parse(raw);

  // Первый вход под этим логином: забираем список, сохранённый до привязки к аккаунту
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy === null) return [];
  localStorage.setItem(keyFor(login), legacy);
  localStorage.removeItem(LEGACY_KEY);
  return parse(legacy);
}

export function saveSavedPassengers(list) {
  localStorage.setItem(keyFor(currentLogin()), JSON.stringify(list));
}

// Добавляет пассажиров из заказа, пропуская тех, чей документ уже сохранён.
export function rememberPassengers(passengers) {
  const list = loadSavedPassengers();
  const known = new Set(list.map((p) => p.documentNumber));
  const added = [];

  passengers.forEach((p, i) => {
    const documentNumber = p.documentNumber.trim();
    if (!documentNumber || known.has(documentNumber)) return;
    known.add(documentNumber);
    added.push({
      id: Date.now() + i,
      fullName: `${p.firstName.trim()} ${p.lastName.trim()}`.trim(),
      citizenship: p.citizenship.trim() || 'Казахстан',
      documentType: p.documentType,
      documentNumber,
      iin: p.iin || '',
    });
  });

  if (added.length > 0) saveSavedPassengers([...list, ...added]);
}