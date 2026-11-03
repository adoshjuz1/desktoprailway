from django.shortcuts import get_object_or_404, render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from .models import Post, Category
from .serializers import PostSerializer, CategorySerializer
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from rest_framework import status

@api_view(['POST'])
def api_register(request):
    username = request.data.get('username') or request.data.get('email')
    password = request.data.get('password')
    full_name = request.data.get('full_name', '')

    if not username or not password:
        return Response({'error': 'Укажите логин/email и пароль'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'Пользователь с таким именем/email уже существует'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, email=username, password=password, first_name=full_name)
    return Response({'message': 'Регистрация прошла успешно! Теперь вы можете войти.'}, status=status.HTTP_201_CREATED)

@api_view(['POST'])
def api_login(request):
    username = request.data.get('username') or request.data.get('email')
    password = request.data.get('password')

    user = authenticate(request, username=username, password=password)
    if user is not None:
        login(request, user)
        # Получаем полное имя (first_name) или логин, если имя не заполнено
        display_name = user.first_name if user.first_name else user.username
        return Response({
            'message': 'Успешный вход!',
            'username': user.username,
            'full_name': display_name,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser
        })
    else:
        return Response({'error': 'Неверный логин или пароль'}, status=status.HTTP_400_BAD_REQUEST)

def index(request):
    posts = Post.objects.all().order_by('-created_at')
    categories = Category.objects.all()
    return render(request, 'news/index.html', {'posts': posts, 'categories': categories})

def post_detail(request, pk):
    post = get_object_or_404(Post, pk=pk)
    return render(request, 'news/detail.html', {'post': post})

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 6
    page_size_query_param = 'page_size'
    max_page_size = 100

@api_view(['GET'])
def api_posts_list(request):
    posts = Post.objects.all().order_by('-created_at')
    paginator = StandardResultsSetPagination()
    result_page = paginator.paginate_queryset(posts, request)
    serializer = PostSerializer(result_page, many=True, context={'request': request})
    return paginator.get_paginated_response(serializer.data)

@api_view(['GET'])
def api_post_detail(request, pk):
    post = get_object_or_404(Post, pk=pk)
    serializer = PostSerializer(post, context={'request': request})
    return Response(serializer.data)

@api_view(['GET'])
def api_categories_list(request):
    categories = Category.objects.all()
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data)