import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function UniNewsPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentLang = localStorage.getItem('selected_lang') || 'ru';

  useEffect(() => {
    // Загрузка новостей университета
    fetch('http://127.0.0.1:8001/api/posts/')
      .then(res => res.json())
      .then(data => {
        const items = data.results || data;
        const uniFiltered = items.filter(item => {
          const src = (item.source || '').toLowerCase();
          return src === 'uni' || src === 'alt';
        });
        setNews(uniFiltered);
      })
      .catch(err => console.error('Ошибка загрузки новостей университета:', err))
      .finally(() => setLoading(false));
  }, []);

  const langKey = currentLang === 'kz' ? 'kaz' : (currentLang === 'en' ? 'eng' : 'rus');

  return (
    <div>
      <div className="py-4 text-center text-white" style={{ background: 'linear-gradient(135deg, #0F2C59 0%, #071428 100%)' }}>
        <div className="container">
          <h2 className="fw-bold mb-1"><i className="bi bi-mortarboard-fill me-2" style={{ color: 'var(--accent-teal)' }}></i>Новости Alt University</h2>
          <p className="mb-0 opacity-75 small">Актуальные события, студенческая жизнь и объявления университета</p>
        </div>
      </div>

      <div className="container my-5">
        {loading ? (
          <div className="text-center py-5"><div className="spinner-border" style={{ color: 'var(--accent-teal)' }}></div></div>
        ) : news.length === 0 ? (
          <div className="text-center py-5 text-muted">Новости университета не найдены.</div>
        ) : (
          <div className="row g-4">
            {news.map(item => {
              const title = item[`title_${langKey}`] || item.title_rus || item.title;
              const desc = item[`short_description_${langKey}`] || item.short_description_rus || item.short_description;
              const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString() : '';
              
              const categoryName = item.category?.name_rus || item.category?.name || 'Объявления';

              return (
                <div key={item.id} className="col-md-6 col-lg-4">
                  <Link 
                    to={`/post/${item.id}`} 
                    className="card h-100 shadow-sm border rounded-3 p-3 text-decoration-none text-reset d-flex flex-column justify-content-between cursor-pointer" 
                    style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                  >
                    <div>
                      {item.image && <img src={item.image} className="img-fluid rounded mb-3" style={{ height: '180px', width: '100%', objectFit: 'cover' }} alt={title} />}
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="badge" style={{ backgroundColor: 'var(--accent-teal)', color: '#fff' }}>{categoryName}</span>
                        <small className="text-muted"><i className="bi bi-calendar3 me-1"></i>{dateStr}</small>
                      </div>
                      <h5 className="fw-bold mb-2">{title}</h5>
                      <p className="text-muted small mb-0">{desc}</p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}