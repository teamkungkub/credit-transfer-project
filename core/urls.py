# core/urls.py
from django.contrib import admin
from django.urls import path, include
# ลบ import ของเก่าทิ้ง แล้ว import view ใหม่ของเราแทน
from transfer.views import MyTokenObtainPairView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('transfer.urls')),

    # --- แก้ไขบรรทัดนี้ ---
    path('api/auth/login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),

    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]