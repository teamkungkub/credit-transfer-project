# transfer/views.py

import traceback
from django.contrib.auth.models import User
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.db.models import Sum
from rest_framework import viewsets # Import viewsets
from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django.templatetags.static import static
import base64
import os
from rest_framework import viewsets
from django.conf import settings
from weasyprint import HTML, CSS
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
#   Authentication & User Views  #
#================================#

# transfer/views.py

# ... imports ...

# transfer/views.py
# ... (imports เดิม)

class TransferEvaluationPDFView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            # ดึงคำร้อง
            transfer_request = TransferRequest.objects.get(pk=pk)
            approved_items = transfer_request.requestitem_set.filter(status='approved')

            # สร้าง URL ของโลโก้จาก static
            logo_url = request.build_absolute_uri(static('images/logo.png'))

            context = {
                'request': transfer_request,
                'items': approved_items,
                'logo_url': logo_url,  # ส่งไป template
            }

            # แปลง template เป็น HTML string
            html_string = render_to_string('transfer/transfer_evaluation_form.html', context)

            # สร้าง PDF
            html = HTML(string=html_string, base_url=request.build_absolute_uri('/'))
            css = CSS(string='@page { size: A4 landscape; margin: 1cm; }')
            pdf_file = html.write_pdf(stylesheets=[css])

            # ส่ง PDF กลับ
            response = HttpResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="evaluation_form_{pk}.pdf"'
            return response

        except TransferRequest.DoesNotExist:
            return HttpResponse("ไม่พบคำร้อง", status=404)
        except Exception as e:
            return HttpResponse(f"Error: {str(e)}", status=500)
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
#   Student-Facing Views         #
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

        # วนลูปประมวลผล AI
        for item in transfer_request.requestitem_set.all():
            # --- จุดที่แก้ไข: รับค่า reason เพิ่มมาเป็นตัวที่ 3 ---
            best_match, score, reason = find_best_match(item.original_course, target_curriculum.id)
            
            if best_match:
                AIComparisonResult.objects.create(
                    request_item=item,
                    suggested_course=best_match,
                    similarity_score=score,
                    # --- บันทึกเหตุผลลงฐานข้อมูล (ถ้า Model รองรับ) ---
                    # explanation=reason 
                    # หมายเหตุ: ถ้า Model AIComparisonResult ยังไม่มี field 'explanation' 
                    # ให้ลบบรรทัด explanation=reason ออกก่อน หรือไปเพิ่ม field ใน models.py
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
#   Faculty-Facing Views         #
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

class TransferReportPDFView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        try:
            # ดึง ID จาก URL (pk)
            pk = kwargs.get('pk') 
            transfer_request = TransferRequest.objects.get(pk=pk)
            
            student_id = "-"
            if hasattr(transfer_request.student, 'userprofile'):
                student_id = transfer_request.student.userprofile.student_id

            approved_items = transfer_request.requestitem_set.filter(status='approved')
            
            total_credits = approved_items.aggregate(
    Sum('original_course__credits')
)['original_course__credits__sum'] or 0

            context = {
                'request': transfer_request,
                'items': approved_items,
                'total_credits': total_credits,
                'student_id_safe': student_id,
            }
            
            try:
                html_string = render_to_string('transfer/transfer_report.html', context)
            except Exception as e:
                print("❌ หาไฟล์ Template ไม่เจอ! ตรวจสอบ folder templates/transfer/")
                raise e
            
            html = HTML(string=html_string, base_url=request.build_absolute_uri('/'))
            css = CSS(string='@page { size: A4; margin: 1.5cm; }')
            pdf_file = html.write_pdf(stylesheets=[css])
            
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
            
            # ดึงเฉพาะวิชาที่อนุมัติ
            approved_items = transfer_request.requestitem_set.filter(status='approved')

            context = {
                'request': transfer_request,
                'items': approved_items,
            }
            
            html_string = render_to_string('transfer/transfer_evaluation_form.html', context)
            
            html = HTML(string=html_string, base_url=request.build_absolute_uri('/'))
            
            # ตั้งค่าหน้ากระดาษเป็น แนวนอน (Landscape) ตามรูป
            css = CSS(string='@page { size: A4 landscape; margin: 1cm; }')
            
            pdf_file = html.write_pdf(stylesheets=[css])
            
            response = HttpResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="transfer_evaluation_{pk}.pdf"'
            return response

        except TransferRequest.DoesNotExist:
            return HttpResponse("ไม่พบคำร้อง", status=404)
        except Exception as e:
             return HttpResponse(f"Error: {str(e)}", status=500)
        
class TransferEvaluationPDFView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            transfer_request = TransferRequest.objects.get(pk=pk)
            approved_items = transfer_request.requestitem_set.filter(status='approved')

            context = {
                'request': transfer_request,
                'items': approved_items,
            }
            
            html_string = render_to_string('transfer/transfer_evaluation_form.html', context)
            
            # --- ใช้ Custom URL Fetcher ---
            # base_url ต้องชี้ไปที่ root ของเว็บ (เช่น http://credit-transfer-project.onrender.com/)
            html = HTML(string=html_string, base_url=request.build_absolute_uri('/'), url_fetcher=django_url_fetcher)
            # ------------------------------
            
            css = CSS(string='@page { size: A4 landscape; margin: 1cm; }')
            pdf_file = html.write_pdf(stylesheets=[css])
            
            response = HttpResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="evaluation_form_{pk}.pdf"'
            return response

        except TransferRequest.DoesNotExist:
            return HttpResponse("ไม่พบคำร้อง", status=404)
        except Exception as e:
            return HttpResponse(f"Error: {str(e)}", status=500)
        
class InstitutionViewSet(viewsets.ModelViewSet):
    queryset = Institution.objects.all()
    serializer_class = InstitutionSerializer
    permission_classes = [permissions.IsAuthenticated] # หรือ IsAdminUser

class CurriculumViewSet(viewsets.ModelViewSet):
    queryset = Curriculum.objects.all()
    serializer_class = CurriculumSerializer
    permission_classes = [permissions.IsAuthenticated]

class TargetCourseViewSet(viewsets.ModelViewSet):
    queryset = TargetCourse.objects.all()
    # แก้จาก CourseSerializer เป็น TargetCourseSerializer
    serializer_class = TargetCourseSerializer 
    permission_classes = [permissions.IsAuthenticated]

class SourceCourseViewSet(viewsets.ModelViewSet):
    queryset = SourceCourse.objects.all()
    serializer_class = SourceCourseSerializer
    permission_classes = [permissions.IsAuthenticated]

class TargetCourseViewSet(viewsets.ModelViewSet):
    queryset = TargetCourse.objects.all()
    # ใช้ Serializer ธรรมดาเพื่อให้บันทึกง่าย (รับเป็น ID)
    serializer_class = SourceCourseSerializer 
    # หมายเหตุ: ถ้าคุณแยก TargetCourseSerializer ก็ให้ใช้ตัวนั้น
    # แต่ถ้าโครงสร้างเหมือนกันใช้ SourceCourseSerializer แก้ขัดได้ หรือสร้างใหม่ดีกว่า
    permission_classes = [permissions.IsAuthenticated]

