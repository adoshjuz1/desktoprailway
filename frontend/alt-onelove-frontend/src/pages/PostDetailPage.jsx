import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { newsApi, apiErrorMessage } from '../api';
import { useToast } from '../toast';

const SECTIONS = {
  ktz: { title: 'Новости КТЖ', path: '/ktz-news' },
  alt: { title: 'Новости Alt University', path: '/uni-news' },
};

const DATE_LOCALES = { ru: 'ru-RU', kz: 'kk-KZ', en: 'en-GB' };

export default function PostDetailPage() {
  const { id } = useParams();
  const toast = useToast();

  const lang = localStorage.getItem('selected_lang') || 'ru';
  const langKey = lang === 'kz' ? 'kaz' : lang === 'en' ? 'eng' : 'rus';

  const [reloadToken, setReloadToken] = useState(0);
  // Загруженная новость вместе с ключом запроса: пока ключ не совпал, идёт загрузка
  const [data, setData] = useState({ key: '', post: null, notFound: false, error: '' });
  const [related, setRelated] = useState({ key: '', items: [] });
  const [lightbox, setLightbox] = useState(null);

  const requestKey = `${id}|${reloadToken}`;
  const loading = data.key !== requestKey;
  const post = data.post;

  // Галерея: фото из админки; если их нет, показываем обложку как единственное фото
  const images = post ? (post.images?.length ? post.images : post.image ? [post.image] : []) : [];
  const photoCount = images.length;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    let active = true;
    newsApi
      .get(`/api/posts/${id}/`)
      .then((res) => {
        if (active) setData({ key: requestKey, post: res.data, notFound: false, error: '' });
      })
      .catch((err) => {
        if (!active) return;
        const notFound = err.response?.status === 404;
        setData({ key: requestKey, post: null, notFound, error: notFound ? '' : apiErrorMessage(err, 'Не удалось загрузить новость') });
      });
    return () => {
      active = false;
    };
  }, [id, requestKey]);

  useEffect(() => {
    let active = true;
    newsApi
      .get(`/api/posts/${id}/related/`)
      .then((res) => {
        if (active) setRelated({ key: String(id), items: res.data });
      })
      .catch(() => {
        if (active) setRelated({ key: String(id), items: [] });
      });
    return () => {
      active = false;
    };
  }, [id]);

  const title = post ? post[`title_${langKey}`] || post.title_rus || post.title : '';

  useEffect(() => {
    if (!title) return undefined;
    document.title = `${title} — ALT ONE LOVE`;
    return () => {
      document.title = 'ALT ONE LOVE';
    };
  }, [title]);

  // Просмотр фото: Esc закрывает, стрелки листают
  const lightboxOpen = lightbox !== null;
  useEffect(() => {
    if (!lightboxOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox((i) => (i + 1) % photoCount);
      if (e.key === 'ArrowLeft') setLightbox((i) => (i - 1 + photoCount) % photoCount);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, photoCount]);

  const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString(DATE_LOCALES[lang] || 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Ссылка скопирована');
    } catch {
      toast.error('Не удалось скопировать ссылку');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" style={{ color: 'var(--accent-teal)' }}></div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="container my-5" style={{ maxWidth: '900px' }}>
        <div className="alert alert-danger d-flex flex-wrap align-items-center justify-content-between gap-2">
          <span>{data.error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setReloadToken((t) => t + 1)}>
            Повторить
          </button>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container my-5 text-center">
        <div className="alert alert-warning d-inline-block">Новость не найдена</div>
        <div>
          <Link to="/uni-news" className="btn btn-teal mt-3">К новостям</Link>
        </div>
      </div>
    );
  }

  const section = SECTIONS[post.source] || SECTIONS.alt;
  const shortDesc = post[`short_description_${langKey}`] || post.short_description_rus || post.short_description;
  const content = post[`content_${langKey}`] || post.content_rus || post.content || '';
  const category = post.category;
  const categoryName = category?.[`name_${langKey}`] || category?.name_rus || category?.name || '';
  const paragraphs = content.split(/\n{2,}/).filter((p) => p.trim());
  const minutes = Math.max(1, Math.round(content.split(/\s+/).filter(Boolean).length / 200));
  const relatedItems = related.key === String(id) ? related.items : [];

  // Одно фото занимает всю ширину, два идут в две колонки, три и больше сеткой
  const photoColumn = photoCount === 1 ? 'col-12' : photoCount === 2 ? 'col-6' : 'col-6 col-md-4';
  const photoHeight = photoCount === 1 ? '420px' : photoCount === 2 ? '260px' : '180px';

  return (
    <div className="container my-4" style={{ maxWidth: '900px' }}>
      <nav aria-label="breadcrumb" className="small mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item"><Link to={section.path}>{section.title}</Link></li>
          {categoryName && (
            <li className="breadcrumb-item"><Link to={`${section.path}?category=${category.id}`}>{categoryName}</Link></li>
          )}
          <li className="breadcrumb-item active text-truncate" style={{ maxWidth: '260px' }} aria-current="page">{title}</li>
        </ol>
      </nav>

      <div className="card p-4 p-md-5 shadow-sm border rounded-4" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)' }}>
        <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
          {categoryName && (
            <span className="badge px-3 py-2" style={{ backgroundColor: 'var(--accent-teal)', color: '#fff', fontSize: '12px' }}>
              {categoryName}
            </span>
          )}
          <small className="text-muted"><i className="bi bi-calendar3 me-1"></i>{formatDate(post.created_at)}</small>
          <small className="text-muted"><i className="bi bi-clock me-1"></i>≈ {minutes} мин чтения</small>
          <button type="button" className="btn btn-sm btn-outline-secondary ms-auto" onClick={share}>
            <i className="bi bi-link-45deg me-1"></i>Поделиться
          </button>
        </div>

        <h1 className="fw-bold mb-3 text-start" style={{ lineHeight: '1.3', fontSize: '2rem' }}>{title}</h1>

        {shortDesc && (
          <p className="lead fs-6 fw-semibold text-muted mb-4 text-start border-start border-4 ps-3" style={{ borderColor: 'var(--accent-teal)' }}>
            {shortDesc}
          </p>
        )}

        <div className="article-content text-start mb-4" style={{ lineHeight: '1.8', fontSize: '16px' }}>
          {paragraphs.map((text, i) => (
            <p key={i} style={{ whiteSpace: 'pre-line' }}>{text.trim()}</p>
          ))}
        </div>

        {photoCount > 0 && (
          <div className="mt-2 pt-3 border-top" style={{ borderColor: 'var(--border-color)' }}>
            <div className="row g-2">
              {images.map((url, index) => (
                <div className={photoColumn} key={url + index}>
                  <img
                    src={url}
                    className="img-fluid rounded shadow-sm w-100 cursor-pointer"
                    style={{ height: photoHeight, objectFit: 'cover' }}
                    alt={`${title}, фото ${index + 1}`}
                    onClick={() => setLightbox(index)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3">
        <Link to={section.path} className="btn btn-outline-secondary btn-sm">
          <i className="bi bi-arrow-left me-1"></i>Ко всем новостям
        </Link>
      </div>

      {relatedItems.length > 0 && (
        <section className="mt-5">
          <h5 className="fw-bold mb-3">Читайте также</h5>
          <div className="row g-3">
            {relatedItems.map((item) => {
              const itemTitle = item[`title_${langKey}`] || item.title_rus || item.title;
              const cover = item.image || item.images?.[0];
              return (
                <div className="col-md-4" key={item.id}>
                  <Link
                    to={`/post/${item.id}`}
                    className="card h-100 border rounded-3 text-decoration-none text-reset overflow-hidden cursor-pointer"
                    style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)' }}
                  >
                    {cover && <img src={cover} alt={itemTitle} style={{ height: '120px', objectFit: 'cover' }} />}
                    <div className="p-3">
                      <div className="small text-muted mb-1">{formatDate(item.created_at)}</div>
                      <div className="fw-semibold">{itemTitle}</div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {lightboxOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 2100 }}
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
        >
          <img
            src={images[lightbox]}
            alt={`${title}, фото ${lightbox + 1}`}
            style={{ maxWidth: '92vw', maxHeight: '88vh', objectFit: 'contain' }}
            onClick={(e) => e.stopPropagation()}
          />
          <button type="button" className="btn btn-light position-absolute top-0 end-0 m-3" aria-label="Закрыть" onClick={() => setLightbox(null)}>
            <i className="bi bi-x-lg"></i>
          </button>
          {photoCount > 1 && (
            <>
              <button
                type="button"
                className="btn btn-light position-absolute start-0 top-50 translate-middle-y ms-3"
                aria-label="Предыдущее фото"
                onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i - 1 + photoCount) % photoCount); }}
              >
                <i className="bi bi-chevron-left"></i>
              </button>
              <button
                type="button"
                className="btn btn-light position-absolute end-0 top-50 translate-middle-y me-3"
                aria-label="Следующее фото"
                onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i + 1) % photoCount); }}
              >
                <i className="bi bi-chevron-right"></i>
              </button>
              <div className="position-absolute bottom-0 start-50 translate-middle-x mb-3 text-white small">
                {lightbox + 1} / {photoCount}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}