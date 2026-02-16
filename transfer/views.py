# transfer/views.py

import traceback
from django.contrib.auth.models import User
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.db.models import Sum
from rest_framework import generics, permissions, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django.templatetags.static import static
import base64
import os
from django.conf import settings
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration
from .utils import django_url_fetcher
from .models import (
    Institution,
    Curriculum,
    SourceCourse,
    TargetCourse,
    TransferRequest,
    AIComparisonResult,
    RequestItem,
    UserProfile
)
from .serializers import (
    MyTokenObtainPairSerializer,
    RegisterSerializer,
    UserDetailSerializer,
    InstitutionSerializer,
    CurriculumSerializer,
    SourceCourseSerializer,
    TransferRequestCreateSerializer,
    TransferRequestListSerializer,
    TransferRequestStatusUpdateSerializer,
    RequestItemStatusUpdateSerializer,
    TargetCourseSerializer,
    TargetCourseDetailSerializer,
    SourceCourseDetailSerializer,
)
from .ai_comparator import find_best_match, calculate_similarity

#================================#
#  Authentication & User Views  #
#================================#

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

class UserProfileView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

#================================#
#  Student-Facing Views         #
#================================#

class TargetCurriculumListView(generics.ListAPIView):
    queryset = Curriculum.objects.all()
    serializer_class = CurriculumSerializer
    permission_classes = [permissions.IsAuthenticated]

class InstitutionListView(generics.ListAPIView):
    queryset = Institution.objects.all()
    serializer_class = InstitutionSerializer
    permission_classes = [permissions.IsAuthenticated]

class SourceCourseListView(generics.ListAPIView):
    serializer_class = SourceCourseSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        institution_id = self.request.query_params.get('institution_id')
        if institution_id:
            return SourceCourse.objects.filter(institution_id=institution_id)
        return SourceCourse.objects.none()

class TransferRequestCreateView(generics.CreateAPIView):
    queryset = TransferRequest.objects.all()
    serializer_class = TransferRequestCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        transfer_request = serializer.save(student=self.request.user)
        target_curriculum = transfer_request.target_curriculum
        
        if not target_curriculum:
            return

        for item in transfer_request.requestitem_set.all():
            best_match, score, reason = find_best_match(item.original_course, target_curriculum.id)
            
            if best_match:
                AIComparisonResult.objects.create(
                    request_item=item,
                    suggested_course=best_match,
                    similarity_score=score,
                )

class NotificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        unread_requests = TransferRequest.objects.filter(
            student=request.user, 
            status__in=['approved', 'rejected'],
            is_viewed_by_student=False
        ).order_by('-created_at')
        
        serializer = TransferRequestListSerializer(unread_requests, many=True)
        return Response(serializer.data)

#================================#
#  Faculty-Facing Views         #
#================================#

class PendingRequestListView(generics.ListAPIView):
    serializer_class = TransferRequestListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TransferRequest.objects.filter(status='pending').order_by('-created_at')

class TransferRequestUpdateView(generics.UpdateAPIView):
    queryset = TransferRequest.objects.all()
    serializer_class = TransferRequestStatusUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

class RequestItemUpdateView(generics.UpdateAPIView):
    queryset = RequestItem.objects.all()
    serializer_class = RequestItemStatusUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

class RequestHistoryListView(generics.ListAPIView):
    serializer_class = TransferRequestListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TransferRequest.objects.exclude(status='pending').order_by('-created_at')

class TransferRequestDeleteView(generics.DestroyAPIView):
    queryset = TransferRequest.objects.all()
    serializer_class = TransferRequestListSerializer
    permission_classes = [permissions.IsAuthenticated]

class RecalculateScoreView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            original_course = SourceCourse.objects.get(id=request.data.get('original_course_id'))
            target_course = TargetCourse.objects.get(id=request.data.get('target_course_id'))
            score = calculate_similarity(original_course, target_course)
            return Response({'similarity_score': score})
        except (SourceCourse.DoesNotExist, TargetCourse.DoesNotExist):
            return Response({'error': 'Course not found'}, status=404)

class TransferRequestDetailView(generics.RetrieveAPIView):
    queryset = TransferRequest.objects.all()
    serializer_class = TransferRequestListSerializer
    permission_classes = [permissions.IsAuthenticated]

#================================#
#  PDF Generation Views         #
#================================#

class TransferReportPDFView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        try:
            pk = kwargs.get('pk') 
            transfer_request = TransferRequest.objects.get(pk=pk)
            
            student_id = "-"
            if hasattr(transfer_request.student, 'userprofile'):
                student_id = transfer_request.student.userprofile.student_id

            approved_items = transfer_request.requestitem_set.filter(status='approved')
            
            total_credits = approved_items.aggregate(
                Sum('original_course__credits')
            )['original_course__credits__sum'] or 0

            logo_url = request.build_absolute_uri(static('images/logo.png'))

            context = {
                'request': transfer_request,
                'items': approved_items,
                'total_credits': total_credits,
                'student_id_safe': student_id,
                'logo_url': logo_url,
            }
            
            html_string = render_to_string('transfer/transfer_report.html', context)
            
            font_config = FontConfiguration()
            html = HTML(string=html_string, base_url=request.build_absolute_uri('/'), url_fetcher=django_url_fetcher)
            css_string = '''
            @page { size: A4 portrait; margin: 1cm; }
            body { font-family: "TH Sarabun New", "Sarabun", sans-serif !important; }
            '''
            css = CSS(string=css_string, font_config=font_config)
            
            pdf_file = html.write_pdf(stylesheets=[css], font_config=font_config)
            
            response = HttpResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="transfer_report_{pk}.pdf"'
            return response

        except TransferRequest.DoesNotExist:
            return HttpResponse("ไม่พบคำร้อง", status=404)
        except Exception as e:
            print("\n" + "="*60)
            print("❌❌❌ เกิดข้อผิดพลาดในการสร้าง PDF ❌❌❌")
            print(traceback.format_exc()) 
            print("="*60 + "\n")
            return HttpResponse(f"<h1>เกิดข้อผิดพลาด (Server Error)</h1><pre>{traceback.format_exc()}</pre>", status=500)


class TransferEvaluationPDFView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            transfer_request = TransferRequest.objects.get(pk=pk)
            approved_items = transfer_request.requestitem_set.filter(status='approved')
            
            logo_url = request.build_absolute_uri(static('images/logo.png'))

            context = {
                'request': transfer_request,
                'items': approved_items,
                'logo_url': logo_url,
            }
            
            html_string = render_to_string('transfer/transfer_evaluation_form.html', context)
            
            font_config = FontConfiguration()
            html = HTML(string=html_string, base_url=request.build_absolute_uri('/'), url_fetcher=django_url_fetcher)
            css_string = '''
            @page { size: A4 landscape; margin: 1cm; }
            body { font-family: "TH Sarabun New", "Sarabun", sans-serif !important; }
            '''
            css = CSS(string=css_string, font_config=font_config)
            
            pdf_file = html.write_pdf(stylesheets=[css], font_config=font_config)
            
            response = HttpResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="evaluation_form_{pk}.pdf"'
            return response

        except TransferRequest.DoesNotExist:
            return HttpResponse("ไม่พบคำร้อง", status=404)
        except Exception as e:
            return HttpResponse(f"Error: {str(e)}", status=500)

#================================#
#  ViewSets                     #
#================================#

class InstitutionViewSet(viewsets.ModelViewSet):
    queryset = Institution.objects.all()
    serializer_class = InstitutionSerializer
    permission_classes = [permissions.IsAuthenticated]

class CurriculumViewSet(viewsets.ModelViewSet):
    queryset = Curriculum.objects.all()
    serializer_class = CurriculumSerializer
    permission_classes = [permissions.IsAuthenticated]

class TargetCourseViewSet(viewsets.ModelViewSet):
    queryset = TargetCourse.objects.all()
    serializer_class = TargetCourseSerializer 
    permission_classes = [permissions.IsAuthenticated]

class SourceCourseViewSet(viewsets.ModelViewSet):
    queryset = SourceCourse.objects.all()
    serializer_class = SourceCourseSerializer
    permission_classes = [permissions.IsAuthenticated]