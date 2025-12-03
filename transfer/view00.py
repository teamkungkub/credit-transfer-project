# transfer/views.py
from django.contrib.auth.models import User
from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import RegisterSerializer
from .serializers import UserDetailSerializer
from .serializers import RequestItemStatusUpdateSerializer
from django.http import HttpResponse
from django.template.loader import render_to_string
from weasyprint import HTML, CSS
from django.db.models import Sum
import traceback
from .models import (
    RequestItem,
    Institution,
    Curriculum,
    SourceCourse,
    TargetCourse,
    TransferRequest,
    AIComparisonResult
)
from .serializers import (
    MyTokenObtainPairSerializer,
    RegisterSerializer,
    InstitutionSerializer,
    CurriculumSerializer,
    SourceCourseSerializer,
    TransferRequestCreateSerializer,
    TransferRequestListSerializer,
    TransferRequestStatusUpdateSerializer
)
from .ai_comparator import find_best_match, calculate_similarity

#================================#
#   Authentication & User Views  #
#================================#



class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny] # Allow anyone to register
    serializer_class = RegisterSerializer

#================================#
#   Student-Facing Views         #
#================================#

class NotificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        # ค้นหาคำร้องที่ยังไม่ได้อ่าน
        unread_requests = TransferRequest.objects.filter(
            student=request.user, 
            status__in=['approved', 'rejected'],
            is_viewed_by_student=False
        ).order_by('-created_at')

        # แปลงข้อมูลเป็น JSON แล้วส่งกลับไป
        serializer = TransferRequestListSerializer(unread_requests, many=True)
        return Response(serializer.data)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


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
            best_match, score = find_best_match(item.original_course, target_curriculum.id)
            if best_match:
                AIComparisonResult.objects.create(
                    request_item=item,
                    suggested_course=best_match,
                    similarity_score=score
                )

class NotificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        count = TransferRequest.objects.filter(
            student=request.user, 
            status__in=['approved', 'rejected'],
            is_viewed_by_student=False
        ).count()
        return Response({'unread_count': count})
    
# transfer/views.py
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
class UserProfileView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
    
class RequestItemUpdateView(generics.UpdateAPIView):
    queryset = RequestItem.objects.all() # pyright: ignore[reportUndefinedVariable]
    serializer_class = RequestItemStatusUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

class RequestHistoryListView(generics.ListAPIView):
    """
    API endpoint for faculty to list all COMPLETED transfer requests (history).
    """
    serializer_class = TransferRequestListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # กรองเฉพาะคำร้องที่ไม่ใช่ 'pending'
        return TransferRequest.objects.exclude(status='pending').order_by('-created_at')

class TransferReportPDFView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            transfer_request = TransferRequest.objects.get(pk=pk)
            items = transfer_request.requestitem_set.all()
            
            context = {
                'request': transfer_request,
                'items': items,
            }
            
            html_string = render_to_string('transfer/transfer_report.html', context)
            
            html = HTML(string=html_string)
            pdf_file = html.write_pdf()
            
            response = HttpResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="transfer_report_{pk}.pdf"'
            return response

        except TransferRequest.DoesNotExist:
            return HttpResponse("ไม่พบคำร้อง", status=404)
        except Exception as e:
             return HttpResponse(f"เกิดข้อผิดพลาด: {str(e)}", status=500)
        
class TransferRequestDetailView(generics.RetrieveAPIView):
    """
    API สำหรับดึงข้อมูลคำร้อง 1 รายการ (ใช้ในหน้า Result)
    """
    queryset = TransferRequest.objects.all()
    serializer_class = TransferRequestListSerializer
    permission_classes = [permissions.IsAuthenticated]

class TransferReportPDFView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            transfer_request = TransferRequest.objects.get(pk=pk)
            
            # ดึงข้อมูลแบบปลอดภัย (ป้องกัน User ไม่มี Profile)
            student_id = "-"
            if hasattr(transfer_request.student, 'userprofile'):
                student_id = transfer_request.student.userprofile.student_id

            # 1. ดึงเฉพาะรายการที่ "อนุมัติ" แล้วเท่านั้น
            approved_items = transfer_request.requestitem_set.filter(status='approved')
            
            # 2. คำนวณผลรวมหน่วยกิตจาก "วิชาเป้าหมาย (Suggested Course)"
            total_credits = approved_items.aggregate(
                Sum('aicomparisonresult__suggested_course__credits')
            )['aicomparisonresult__suggested_course__credits__sum'] or 0

            # เตรียมข้อมูลส่งไปที่ Template
            context = {
                'request': transfer_request,
                'items': approved_items, # ส่งเฉพาะรายการที่อนุมัติ
                'total_credits': total_credits, # ส่งผลรวมหน่วยกิต
                'student_id_safe': student_id, # ส่งค่าที่ปลอดภัยไปให้ Template
            }
            
            # เช็คว่าหาไฟล์ Template เจอไหม
            try:
                html_string = render_to_string('transfer/transfer_report.html', context)
            except Exception as e:
                print("❌ หาไฟล์ Template ไม่เจอ! ตรวจสอบโฟลเดอร์ templates/transfer/")
                raise e
            
            # สร้าง PDF
            html = HTML(string=html_string, base_url=request.build_absolute_uri('/'))
            css = CSS(string='@page { size: A4; margin: 1.5cm; }')
            pdf_file = html.write_pdf(stylesheets=[css])
            
            response = HttpResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="transfer_report_{pk}.pdf"' # ใช้ inline เพื่อเปิดใน browser ก่อน
            return response

        except TransferRequest.DoesNotExist:
            return HttpResponse("ไม่พบคำร้อง", status=404)
        except Exception as e:
            # ปริ้น Error ออกมาให้เห็นชัดๆ ใน Terminal
            print("\n" + "="*60)
            print("❌❌❌ เกิดข้อผิดพลาดในการสร้าง PDF ❌❌❌")
            print(traceback.format_exc()) 
            print("="*60 + "\n")
            return HttpResponse(f"<h1>เกิดข้อผิดพลาด (Server Error)</h1><pre>{traceback.format_exc()}</pre>", status=500)
        
class TransferRequestDetailView(generics.RetrieveAPIView):
    """
    API สำหรับดึงข้อมูลคำร้อง 1 รายการ (ใช้ในหน้า Result)
    """
    queryset = TransferRequest.objects.all()
    serializer_class = TransferRequestListSerializer
    permission_classes = [permissions.IsAuthenticated]

class TransferReportPDFView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            transfer_request = TransferRequest.objects.get(pk=pk)
            
            # --- แก้ไข: ดึงข้อมูลแบบปลอดภัย (ป้องกัน User ไม่มี Profile) ---
            student_id = "-"
            if hasattr(transfer_request.student, 'userprofile'):
                student_id = transfer_request.student.userprofile.student_id
            # -------------------------------------------------------

            approved_items = transfer_request.requestitem_set.filter(status='approved')
            total_credits = approved_items.aggregate(Sum('original_course__credits'))['original_course__credits__sum'] or 0

            context = {
                'request': transfer_request,
                'items': approved_items,
                'total_credits': total_credits,
                'student_id_safe': student_id, # ส่งค่าที่ปลอดภัยไปให้ Template
            }
            
            # --- แก้ไข: เช็คว่าหาไฟล์ Template เจอไหม ---
            try:
                html_string = render_to_string('transfer/transfer_report.html', context)
            except Exception as e:
                print("❌ หาไฟล์ Template ไม่เจอ! ตรวจสอบโฟลเดอร์ templates/transfer/")
                raise e
            # -----------------------------------------
            
            html = HTML(string=html_string, base_url=request.build_absolute_uri('/'))
            css = CSS(string='@page { size: A4; margin: 1.5cm; }') # pyright: ignore[reportUndefinedVariable]
            pdf_file = html.write_pdf(stylesheets=[css])
            
            response = HttpResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="transfer_report_{pk}.pdf"'
            return response

        except Exception as e:
            # --- ปริ้น Error ออกมาให้เห็นชัดๆ ใน Terminal ---
            print("\n" + "="*60)
            print("❌❌❌ เกิดข้อผิดพลาดในการสร้าง PDF ❌❌❌")
            print(traceback.format_exc()) 
            print("="*60 + "\n")
            # ส่ง Error ไปแสดงที่หน้าเว็บด้วย (จะได้ไม่ต้องหาใน Terminal)
            return HttpResponse(f"<h1>เกิดข้อผิดพลาด (Server Error)</h1><pre>{traceback.format_exc()}</pre>", status=500)
        
class TransferRequestDeleteView(generics.DestroyAPIView):
    queryset = TransferRequest.objects.all()
    serializer_class = TransferRequestListSerializer
    permission_classes = [permissions.IsAuthenticated]