from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=100, verbose_name="Название категории")
    
    # Переводы категории
    name_kaz = models.CharField(max_length=100, default="", verbose_name="Название (KAZ)")
    name_rus = models.CharField(max_length=100, default="", verbose_name="Название (RUS)")
    name_eng = models.CharField(max_length=100, default="", verbose_name="Название (ENG)")

    class Meta:
        verbose_name = "Категорию"
        verbose_name_plural = "Категории"

    def __str__(self):
        return self.name


class Post(models.Model):
    # Варианты источника новостей
    SOURCE_CHOICES = [
        ('alt', 'Новости ALT'),
        ('ktz', 'Новости КТЖ'),
    ]
    
    # Поле источника
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES, default='alt', verbose_name="Источник")
    
    # Основные поля
    title = models.CharField(max_length=200, verbose_name="Заголовок (по умолчанию)")
    short_description = models.TextField(max_length=300, verbose_name="Краткое описание")
    content = models.TextField(verbose_name="Полный текст")
    image = models.ImageField(upload_to='news_images/', verbose_name="Обложка", blank=True, null=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, verbose_name="Категория")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата публикации")

    # Переводы заголовка
    title_kaz = models.CharField(max_length=200, default="", verbose_name="Заголовок (KAZ)")
    title_rus = models.CharField(max_length=200, default="", verbose_name="Заголовок (RUS)")
    title_eng = models.CharField(max_length=200, default="", verbose_name="Заголовок (ENG)")

    # Переводы краткого описания
    short_description_kaz = models.TextField(max_length=300, default="", verbose_name="Краткое описание (KAZ)")
    short_description_rus = models.TextField(max_length=300, default="", verbose_name="Краткое описание (RUS)")
    short_description_eng = models.TextField(max_length=300, default="", verbose_name="Краткое описание (ENG)")

    # Переводы полного текста
    content_kaz = models.TextField(default="", verbose_name="Полный текст (KAZ)")
    content_rus = models.TextField(default="", verbose_name="Полный текст (RUS)")
    content_eng = models.TextField(default="", verbose_name="Полный текст (ENG)")

    class Meta:
        verbose_name = "Новость"
        verbose_name_plural = "Новости"

    def __str__(self):
        return self.title