from rest_framework import serializers
from .models import Post, Category


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


class PostSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    image = serializers.SerializerMethodField()    # обложка для списка новостей
    images = serializers.SerializerMethodField()   # галерея: все фото новости

    class Meta:
        model = Post
        fields = '__all__'

    def _absolute_url(self, file_field):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(file_field.url)
        return f"http://127.0.0.1:8001{file_field.url}"

    def get_image(self, obj):
        if obj.image:
            return self._absolute_url(obj.image)
        return None

    def get_images(self, obj):
        return [self._absolute_url(item.image) for item in obj.images.all() if item.image]