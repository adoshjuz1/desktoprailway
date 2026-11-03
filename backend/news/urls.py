from django.urls import path
from . import views

urlpatterns = [
    # Старые маршруты (для HTML):
    path('', views.index, name='index'),
    path('post/<int:pk>/', views.post_detail, name='post_detail'),
    
    # Новые API маршруты (для React):
    path('api/posts/', views.api_posts_list, name='api_posts'),
    path('api/posts/<int:pk>/', views.api_post_detail, name='api_post_detail'), # <--- ДОБАВЬ ЭТУ СТРОКУ
    path('api/categories/', views.api_categories_list, name='api_categories'),
    path('api/register/', views.api_register, name='api_register'),
    path('api/login/', views.api_login, name='api_login'),
]
