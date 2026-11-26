import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from .models import Category, Post, PostImage

# Минимальная картинка 1x1, чтобы проверять загрузку фото без настоящих файлов
TINY_GIF = (
    b'GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,'
    b'\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;'
)

MEDIA_DIR = tempfile.mkdtemp()


def make_post(title, source='alt', category=None, **extra):
    return Post.objects.create(
        title=title, short_description=f'Кратко: {title}', content=f'Текст: {title}',
        source=source, category=category, **extra
    )


@override_settings(MEDIA_ROOT=MEDIA_DIR)
class NewsApiTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA_DIR, ignore_errors=True)

    def setUp(self):
        self.study = Category.objects.create(name='Study')
        self.events = Category.objects.create(name='Events')

    # --- фильтры списка ---
    def test_filter_by_source(self):
        make_post('Uni one', 'alt', self.study)
        make_post('Ktz one', 'ktz', self.study)
        data = self.client.get('/api/posts/', {'source': 'ktz'}).json()
        self.assertEqual([p['title'] for p in data['results']], ['Ktz one'])

    def test_filter_by_category(self):
        make_post('A', 'ktz', self.study)
        make_post('B', 'ktz', self.events)
        data = self.client.get('/api/posts/', {'source': 'ktz', 'category': self.events.id}).json()
        self.assertEqual([p['title'] for p in data['results']], ['B'])

    def test_search_finds_text_in_any_language_field(self):
        make_post('Schedule changes', 'ktz', self.study)
        make_post('Other news', 'ktz', self.study, title_kaz='Кесте өзгерді')
        by_title = self.client.get('/api/posts/', {'search': 'schedule'}).json()['results']
        by_kaz = self.client.get('/api/posts/', {'search': 'Other'}).json()['results']
        self.assertEqual(len(by_title), 1)
        self.assertEqual(len(by_kaz), 1)
        self.assertEqual(self.client.get('/api/posts/', {'search': 'nothing-like-this'}).json()['count'], 0)

    def test_invalid_category_is_ignored(self):
        make_post('A', 'ktz', self.study)
        data = self.client.get('/api/posts/', {'category': 'abc'}).json()
        self.assertEqual(data['count'], 1)

    # --- страницы ---
    def test_pagination_load_more(self):
        for i in range(7):
            make_post(f'Post {i}', 'ktz', self.study)
        first = self.client.get('/api/posts/', {'source': 'ktz'}).json()
        self.assertEqual((first['count'], len(first['results'])), (7, 6))
        self.assertIsNotNone(first['next'])
        second = self.client.get('/api/posts/', {'source': 'ktz', 'page': 2}).json()
        self.assertEqual(len(second['results']), 1)
        self.assertIsNone(second['next'])

    def test_newest_first(self):
        old = make_post('Old', 'ktz', self.study)
        new = make_post('New', 'ktz', self.study)
        titles = [p['title'] for p in self.client.get('/api/posts/', {'source': 'ktz'}).json()['results']]
        self.assertEqual(titles, ['New', 'Old'])
        self.assertLess(old.pk, new.pk)

    # --- галерея ---
    def test_images_empty_when_no_gallery(self):
        post = make_post('No photos', 'alt', self.study)
        data = self.client.get(f'/api/posts/{post.id}/').json()
        self.assertEqual(data['images'], [])
        self.assertIsNone(data['image'])

    def test_single_image_is_a_list_with_one_absolute_url(self):
        post = make_post('One photo', 'alt', self.study)
        PostImage.objects.create(post=post, image=SimpleUploadedFile('a.gif', TINY_GIF, 'image/gif'))
        data = self.client.get(f'/api/posts/{post.id}/').json()
        self.assertEqual(len(data['images']), 1)
        self.assertTrue(data['images'][0].startswith('http://testserver/media/news_images/'))

    def test_several_images_follow_order_field(self):
        post = make_post('Many photos', 'alt', self.study)
        PostImage.objects.create(post=post, order=2, image=SimpleUploadedFile('second.gif', TINY_GIF, 'image/gif'))
        PostImage.objects.create(post=post, order=1, image=SimpleUploadedFile('first.gif', TINY_GIF, 'image/gif'))
        urls = self.client.get(f'/api/posts/{post.id}/').json()['images']
        self.assertEqual(len(urls), 2)
        self.assertIn('first', urls[0])
        self.assertIn('second', urls[1])

    def test_images_also_present_in_list(self):
        post = make_post('List photos', 'alt', self.study)
        PostImage.objects.create(post=post, image=SimpleUploadedFile('l.gif', TINY_GIF, 'image/gif'))
        item = self.client.get('/api/posts/').json()['results'][0]
        self.assertEqual(len(item['images']), 1)

    # --- «Читайте также» ---
    def test_related_excludes_itself_and_prefers_same_category(self):
        main = make_post('Main', 'ktz', self.study)
        same = make_post('Same category', 'ktz', self.study)
        make_post('Other category', 'ktz', self.events)
        make_post('Another source', 'alt', self.study)
        titles = [p['title'] for p in self.client.get(f'/api/posts/{main.id}/related/').json()]
        self.assertNotIn('Main', titles)
        self.assertNotIn('Another source', titles)
        self.assertEqual(titles[0], 'Same category')
        self.assertIn('Other category', titles)
        self.assertLessEqual(len(titles), 3)
        self.assertIsNotNone(same.pk)

    def test_related_for_unknown_post_is_404(self):
        self.assertEqual(self.client.get('/api/posts/9999/related/').status_code, 404)

    def test_detail_of_unknown_post_is_404(self):
        self.assertEqual(self.client.get('/api/posts/9999/').status_code, 404)


class AdminGalleryTests(APITestCase):
    def test_post_form_has_gallery_inline(self):
        from django.contrib.auth.models import User
        User.objects.create_superuser('admin', 'a@a.kz', 'pass12345')
        self.client.login(username='admin', password='pass12345')
        response = self.client.get('/admin/news/post/add/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'images-TOTAL_FORMS')   # блок «Фото галереи» на странице новости