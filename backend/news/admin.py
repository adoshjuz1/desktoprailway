from django.contrib import admin
from .models import Post, Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'name_kaz', 'name_rus', 'name_eng')
    list_display_links = ('id', 'name')
    search_fields = ('name', 'name_kaz', 'name_rus', 'name_eng')

    fieldsets = (
        ('Основная информация', {
            'fields': ('name',)
        }),
        ('Переводы названия', {
            'classes': ('collapse',),
            'fields': ('name_kaz', 'name_rus', 'name_eng'),
        }),
    )


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    # Добавили 'source' в таблицу списка новостей
    list_display = ('id', 'title', 'source', 'category', 'created_at')
    list_display_links = ('id', 'title')
    # Добавили фильтр по источнику в правой колонке
    list_filter = ('source', 'category', 'created_at')
    search_fields = ('title', 'title_kaz', 'title_rus', 'title_eng')
    readonly_fields = ('created_at',)

    fieldsets = (
        ('Основное', {
            # Добавили 'source' сюда, чтобы оно отображалось в форме редактирования
            'fields': ('source', 'category', 'image', 'created_at')
        }),
        ('Текст по умолчанию (Default)', {
            'description': 'Основной вариант текста, если перевод для выбранного языка не заполнен.',
            'fields': ('title', 'short_description', 'content')
        }),
        ('🇰🇿 Казахская версия (KAZ)', {
            'classes': ('collapse',),
            'fields': ('title_kaz', 'short_description_kaz', 'content_kaz')
        }),
        ('🇷🇺 Русская версия (RUS)', {
            'classes': ('collapse',),
            'fields': ('title_rus', 'short_description_rus', 'content_rus')
        }),
        ('🇬🇧 Английская версия (ENG)', {
            'classes': ('collapse',),
            'fields': ('title_eng', 'short_description_eng', 'content_eng')
        }),
    )