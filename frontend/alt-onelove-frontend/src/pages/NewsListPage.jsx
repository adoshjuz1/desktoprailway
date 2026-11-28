import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { newsApi, apiErrorMessage } from '../api';

const PAGE_SIZE = 6;

// Одна страница на оба раздела: КТЖ ("ktz") и университет ("alt")
const SECTIONS = {
  ktz: {
    title: 'Новости «Қазақстан темір жолы»',
    subtitle: 'Официальные обновления, изменения расписания и события КТЖ',
    icon: 'bi-newspaper',
    empty: 'Новости КТЖ пока отсутствуют.',
  },
  alt: {
    title: 'Новости Alt University',
    subtitle: 'Актуальные события, студенческая жизнь и объявления университета',
    icon: 'bi-mortarboard-fill',
    empty: 'Новости университета пока отсутствуют.',
  },
};

const DATE_LOCALES = { ru: 'ru-RU', kz: 'kk-KZ', en: 'en-GB' };

function NewsCardSkeleton() {
  return (
    <div className="col-md-6 col-lg-4">
      <div className="card h-100 border rounded-3 p-3 placeholder-glow" style={{ backgroundColor: 'var(--card-bg)' }}>
        <div className="placeholder rounded mb-3" style={{ height: '180px', width: '100%' }}></div>
        <span className="placeholder col-4 mb-3"></span>
        <span className="placeholder col-10 mb-2"></span>
        <span className="placeholder col-8"></span>
      </div>
    </div>
  );
}

export default function NewsListPage({ source }) {
  const section = SECTIONS[source] || SECTIONS.alt;
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || '';

  const lang = localStorage.getItem('selected_lang') || 'ru';
  const langKey = lang === 'kz' ? 'kaz' : lang === 'en' ? 'eng' : 'rus';

  const [categories, setCategories] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  // Загруженные новости вместе с ключом запроса: пока ключ не совпал с текущим, идёт загрузка
  const [data, setData] = useState({ key: '', items: [], next: null, count: 0, error: '' });
  const debounceRef = useRef(null);

  const requestKey = `${source}|${category}|${search}|${reloadToken}`;
  const loading = data.key !== requestKey;

  useEffect(() => {
    document.title = `${section.title} — ALT ONE LOVE`;
    return () => {
      document.title = 'ALT ONE LOVE';
    };
  }, [section.title]);

  useEffect(() => {
    newsApi
      .get('/api/categories/')
      .then((res) => setCategories(res.data.results || res.data))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let active = true;
    newsApi
      .get('/api/posts/', {
        params: { source, category: category || undefined, search: search || undefined, page_size: PAGE_SIZE },
      })
      .then(({ data: res }) => {
        if (active) setData({ key: requestKey, items: res.results, next: res.next, count: res.count, error: '' });
      })
      .catch((err) => {
        if (active) {
          setData({ key: requestKey, items: [], next: null, count: 0, error: apiErrorMessage(err, 'Не удалось загрузить новости') });
        }
      });
    return () => {
      active = false;
    };
  }, [requestKey, source, category, search]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const onSearchChange = (value) => {
    setSearchInput(value);
    clearTimeout(debounceRef.current);
    // Запрос уходит, когда человек на полсекунды перестал печатать
    debounceRef.current = setTimeout(() => setSearch(value.trim()), 500);
  };

  const clearSearch = () => {
    clearTimeout(debounceRef.current);
    setSearchInput('');
    setSearch('');
  };

  const selectCategory = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set('category', String(id));
    else next.delete('category');
    setSearchParams(next);
  };

  const resetFilters = () => {
    clearSearch();
    selectCategory('');
  };

  const loadMore = async () => {
    if (!data.next) return;
    setLoadingMore(true);
    try {
      const { data: more } = await newsApi.get(data.next);
      setData((d) => (d.key === requestKey ? { ...d, items: [...d.items, ...more.results], next: more.next } : d));
    } catch (err) {
      setData((d) => ({ ...d, error: apiErrorMessage(err, 'Не удалось загрузить новости') }));
    } finally {
      setLoadingMore(false);
    }
  };

  const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString(DATE_LOCALES[lang] || 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  const categoryName = (cat) => cat?.[`name_${langKey}`] || cat?.name_rus || cat?.name || '';

  const filtersActive = Boolean(search || category);

  return (
    <div>
      <div className="py-4 text-center text-white" style={{ background: 'linear-gradient(135deg, #0F2C59 0%, #071428 100%)' }}>
        <div className="container">
          <h2 className="fw-bold mb-1">
            <i className={`bi ${section.icon} me-2`} style={{ color: 'var(--accent-teal)' }}></i>
            {section.title}
          </h2>
          <p className="mb-0 opacity-75 small">{section.subtitle}</p>
        </div>
      </div>

      <div className="container my-4">
        {/* Поиск и категории */}
        <div className="row g-3 align-items-center mb-4">
          <div className="col-lg-5">
            <div className="input-group">
              <span className="input-group-text"><i className="bi bi-search"></i></span>
              <input
                type="search"
                className="form-control"
                placeholder="Поиск по новостям"
                value={searchInput}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              {searchInput && (
                <button type="button" className="btn btn-outline-secondary" aria-label="Очистить поиск" onClick={clearSearch}>
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>
          </div>
          <div className="col-lg-7 d-flex flex-wrap gap-2 justify-content-lg-end">
            <button type="button" className={`btn btn-sm ${category ? 'btn-outline-secondary' : 'btn-teal'}`} onClick={() => selectCategory('')}>
              Все
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`btn btn-sm ${String(cat.id) === category ? 'btn-teal' : 'btn-outline-secondary'}`}
                onClick={() => selectCategory(cat.id)}
              >
                {categoryName(cat)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="row g-4">
            {Array.from({ length: PAGE_SIZE }, (_, i) => <NewsCardSkeleton key={i} />)}
          </div>
        ) : data.error && data.items.length === 0 ? (
          <div className="alert alert-danger d-flex flex-wrap align-items-center justify-content-between gap-2">
            <span>{data.error}</span>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setReloadToken((t) => t + 1)}>
              Повторить
            </button>
          </div>
        ) : data.items.length === 0 ? (
          <div className="text-center py-5 text-muted">
            {filtersActive ? (
              <>
                <p className="mb-3">По вашему запросу ничего не найдено.</p>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={resetFilters}>Сбросить фильтры</button>
              </>
            ) : (
              section.empty
            )}
          </div>
        ) : (
          <>
            <div className="text-muted small mb-3">Найдено: {data.count}</div>
            <div className="row g-4">
              {data.items.map((item) => {
                const title = item[`title_${langKey}`] || item.title_rus || item.title;
                const desc = item[`short_description_${langKey}`] || item.short_description_rus || item.short_description;
                const cover = item.image || item.images?.[0];
                const photos = item.images?.length || 0;

                return (
                  <div key={item.id} className="col-md-6 col-lg-4">
                    <Link
                      to={`/post/${item.id}`}
                      className="card h-100 shadow-sm border rounded-3 p-3 text-decoration-none text-reset d-flex flex-column justify-content-between cursor-pointer"
                      style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                    >
                      <div>
                        {cover ? (
                          <div className="position-relative mb-3">
                            <img src={cover} className="img-fluid rounded" style={{ height: '180px', width: '100%', objectFit: 'cover' }} alt={title} />
                            {photos > 1 && (
                              <span className="badge position-absolute bottom-0 end-0 m-2" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                                <i className="bi bi-images me-1"></i>{photos}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="rounded mb-3 d-flex align-items-center justify-content-center" style={{ height: '180px', backgroundColor: 'var(--card-inset)' }}>
                            <i className={`bi ${section.icon} text-muted`} style={{ fontSize: '2.5rem' }}></i>
                          </div>
                        )}
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="badge" style={{ backgroundColor: 'var(--accent-teal)', color: '#fff' }}>
                            {categoryName(item.category) || section.title}
                          </span>
                          <small className="text-muted"><i className="bi bi-calendar3 me-1"></i>{formatDate(item.created_at)}</small>
                        </div>
                        <h5 className="fw-bold mb-2">{title}</h5>
                        <p className="text-muted small mb-0">{desc}</p>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>

            {data.error && <div className="alert alert-danger mt-4">{data.error}</div>}

            {data.next && (
              <div className="text-center mt-4">
                <button type="button" className="btn btn-outline-secondary px-4" disabled={loadingMore} onClick={loadMore}>
                  {loadingMore ? 'Загружаем…' : 'Показать ещё'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}