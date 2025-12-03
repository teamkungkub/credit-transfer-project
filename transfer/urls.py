# transfer/urls.py
from django.urls import path
from .views import RequestItemUpdateView
from .views import TransferRequestDeleteView
from .views import TransferReportPDFView
from .views import TransferRequestDetailView
from rest_framework.routers import DefaultRouter

from .views import (
   
    InstitutionListView,
    TargetCurriculumListView,
    SourceCourseListView, # <-- แก้ไขชื่อจาก CourseListView
    TransferRequestCreateView,
    PendingRequestListView,
    TransferRequestUpdateView,
    RecalculateScoreView,
    RegisterView, 
    NotificationView,
    UserProfileView,
    RequestHistoryListView,
    TransferRequestDetailView,
    TransferEvaluationPDFView,

    InstitutionViewSet,
    CurriculumViewSet,
    TargetCourseViewSet,
    SourceCourseViewSet
)

router = DefaultRouter()
router.register(r'manage/institutions', InstitutionViewSet)
router.register(r'manage/curriculums', CurriculumViewSet)
router.register(r'manage/target-courses', TargetCourseViewSet)
router.register(r'manage/source-courses', SourceCourseViewSet)

urlpatterns = [
    
    path('admin/request/<int:pk>/evaluation-pdf/', TransferEvaluationPDFView.as_view(), name='transfer-evaluation-pdf'),
    path('admin/request/<int:pk>/delete/', TransferRequestDeleteView.as_view(), name='request-delete'),
    path('admin/request-item/<int:pk>/update/', RequestItemUpdateView.as_view(), name='request-item-update'),
    path('admin/request/<int:pk>/', TransferRequestDetailView.as_view(), name='request-detail'),
    path('admin/request/<int:pk>/pdf/', TransferReportPDFView.as_view(), name='transfer-report-pdf'),
    path('recalculate-score/', RecalculateScoreView.as_view(), name='recalculate-score'),
    path('register/', RegisterView.as_view(), name='register'), # เพิ่ม
    path('student/notifications/', NotificationView.as_view(), name='student-notifications'), # เพิ่ม
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    # Student-facing URLs
    path('institutions/', InstitutionListView.as_view(), name='institution-list'),
    path('target-curriculums/', TargetCurriculumListView.as_view(), name='target-curriculum-list'),
    path('source-courses/', SourceCourseListView.as_view(), name='source-course-list'), # <-- แก้ไข path และชื่อ
    path('transfer-requests/', TransferRequestCreateView.as_view(), name='transfer-request-create'),

    # Faculty-facing URLs
    path('admin/pending-requests/', PendingRequestListView.as_view(), name='pending-request-list'),
    path('admin/requests/<int:pk>/', TransferRequestUpdateView.as_view(), name='request-update'),
    path('recalculate-score/', RecalculateScoreView.as_view(), name='recalculate-score'),

    
    path('admin/history/', RequestHistoryListView.as_view(), name='request-history'), # เพิ่มบรรทัดนี้
   
]
urlpatterns += router.urls