import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`http://127.0.0.1:8001/api/posts/${id}/`)
      .then(res => setPost(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-5"><div className="spinner-border" style={{ color: 'var(--accent-teal)' }}></div></div>;
  if (!post) return <div className="container my-5 alert alert-danger">Новость не найдена</div>;

  const title = post.title_rus || post.title;
  const shortDesc = post.short_description_rus || post.short_description;
  const content = post.content_rus || post.content;
  const dateStr = post.created_at ? new Date(post.created_at).toLocaleDateString() : '';
  const categoryName = post.category?.name_rus || post.category?.name || 'Новости';

  // Собираем массив картинок для галереи внизу
  const galleryImages = post.images || (post.image ? [post.image, post.image, post.image, post.image, post.image] : []);

  return (
    <div className="container my-4" style={{ maxWidth: '900px' }}>
      <button className="btn btn-outline-secondary mb-4 btn-sm" onClick={() => navigate(-1)}>
        <i className="bi bi-arrow-left me-1"></i>Назад
      </button>

      <div className="card p-4 p-md-5 shadow-sm border rounded-4" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)' }}>
        <div className="d-flex align-items-center gap-3 mb-3">
          <span className="badge px-3 py-2" style={{ backgroundColor: 'var(--accent-teal)', color: '#fff', fontSize: '12px' }}>
            {categoryName}
          </span>
          <small className="text-muted"><i className="bi bi-calendar3 me-1"></i>{dateStr}</small>
        </div>

        <h1 className="fw-bold mb-3 text-start" style={{ lineHeight: '1.3', fontSize: '2rem' }}>{title}</h1>

        {shortDesc && (
          <p className="lead fs-6 fw-semibold text-muted mb-4 text-start border-start border-4 ps-3" style={{ borderColor: 'var(--accent-teal) !important' }}>
            {shortDesc}
          </p>
        )}

        {/* Большое фото в середине УДАЛЕНО */}

        {/* Основной текст статьи */}
        <div className="article-content text-start mb-4" style={{ lineHeight: '1.8', fontSize: '16px' }}>
          {content}
        </div>

        {/* Галерея изображений в самом низу без лишнего текста */}
        {galleryImages.length > 0 && (
          <div className="mt-4 pt-3 border-top">
            <div className="row g-2">
              {galleryImages.map((imgUrl, index) => (
                <div className="col-md-4 col-6" key={index}>
                  <img 
                    src={imgUrl} 
                    className="img-fluid rounded shadow-sm w-100" 
                    style={{ height: '130px', objectFit: 'cover', transition: 'transform 0.2s' }} 
                    alt={`Фото ${index + 1}`}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}