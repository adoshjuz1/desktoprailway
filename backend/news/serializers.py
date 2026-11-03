from rest_framework import serializers
from .models import Post, Category

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class PostSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    image = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = '__all__'

    def get_image(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return f"http://127.0.0.1:8000{obj.image.url}"
        return None
        