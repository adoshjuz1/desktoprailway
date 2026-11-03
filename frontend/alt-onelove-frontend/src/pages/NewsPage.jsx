import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function NewsPage({ source = 'alt' }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState(localStorage.getItem('selected_lang') || 'ru');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    fetchNews();
  }, [source]);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/posts/');
      const data = response.data.results || response.data;
      
      // Фильтруем по источнику (alt / ktz)
      const filtered = data.filter(item => (item.source || 'alt').toLowerCase() === source);
      setNews(filtered);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLangKey = () => (lang === 'kz' ? 'kaz' : lang === 'en' ? 'eng' : 'rus');

  const filteredNews = category === 'all' 
    ? news 
    : news.filter(item => item.category?.slug === category);

  return (
    <div className="container my-5">
      {/* Шапка раздела */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>{source === 'ktz' ? 'Новости КТЖ' : 'Новости Alt University'}</h2>
        
        {/* Переключатель языка */}
        <select 
          className="form-select w-auto" 
          value={lang} 
          onChange={(e) => {
            setLang(e.target.value);
            localStorage.setItem('selected_lang', e.target.value);
          }}
        >
          <option value="ru">RUS</option>
          <option value="kz">KAZ</option>
          <option value="en">ENG</option>
        </select>
      </div>

      {/* Выбор категории */}
      <div className="mb-4">
        <button className={`btn me-2 ${category === 'all' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setCategory('all')}>Все</button>
        <button className={`btn me-2 ${category === 'academic' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setCategory('academic')}>Учёба</button>
        <button className={`btn me-2 ${category === 'events' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setCategory('events')}>События</button>
      </div>

      {/* Контент */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-info" role="status"></div>
        </div>
      ) : (
        <div className="row g-4">
          {filteredNews.map((item) => {
            const langKey = getLangKey();
            const title = item[`title_${langKey}`] || item.title_rus;
            const desc = item[`short_description_${langKey}`] || item.short_description_rus;

            return (
              <div key={item.id} className="col-md-6 col-lg-4">
                <div className="card h-100 shadow-sm p-3">
                  {item.image && <img src={item.image} className="card-img-top rounded mb-2" alt={title} style={{ height: '180px', objectFit: 'cover' }} />}
                  <div className="card-body px-0">
                    <h5 className="card-title fw-bold">{title}</h5>
                    <p className="card-text text-muted small">{desc}</p>
                  </div>
                  <Link to={`/post/${item.id}`} className="btn btn-outline-info btn-sm w-100">
                    Читать полностью
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}