# transfer/serializers.py
from django.contrib.auth.models import User
from rest_framework import serializers
import json
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import (
    Institution,
    Curriculum,
    SourceCourse,
    TargetCourse,
    TransferRequest,
    RequestItem,
    AIComparisonResult,
    UserProfile
)

#================================#
#   Authentication & User Mgmt   #
#================================#

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['is_staff'] = user.is_staff
        return token

class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('username', 'password', 'first_name', 'last_name', 'email')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        # UserProfile จะถูกสร้างอัตโนมัติโดย Signal
        return user

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['student_id','major']
        
        extra_kwargs = {
            'student_id': {'validators': []}, 
        }

# transfer/serializers.py

class UserDetailSerializer(serializers.ModelSerializer):
    # ใช้ SerializerMethodField เหมือนเดิม (เพื่อกัน Error 500 เวลา User ไม่มี Profile)
    profile = serializers.SerializerMethodField()
    is_faculty = serializers.SerializerMethodField()
    is_superuser = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'email', 'profile', 'is_faculty', 'is_superuser'] 

    def get_is_faculty(self, obj):
        return hasattr(obj, 'facultyprofile')

    def get_profile(self, obj):
        try:
            return UserProfileSerializer(obj.userprofile).data
        except Exception:
            return None

    # 🔥 แก้ไขฟังก์ชัน update ให้รองรับการบันทึก Profile
    def update(self, instance, validated_data):
        # 1. อัปเดตข้อมูล User หลัก (ชื่อ, นามสกุล, อีเมล)
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.email = validated_data.get('email', instance.email)
        instance.save()
        
        # 2. อัปเดตข้อมูล Profile (ดึงจากข้อมูลดิบ initial_data โดยตรง)
        # เหตุผล: เพราะ field 'profile' ข้างบนเป็น Read-only เราเลยต้องมาดึงเองตรงนี้
        profile_raw_data = self.initial_data.get('profile')
        
        # เช็คว่ามีข้อมูล profile ส่งมาไหม และต้องเป็น Dictionary
        if profile_raw_data and isinstance(profile_raw_data, dict):
            # สร้างหรือดึง Profile ของ User นี้มา
            profile, created = UserProfile.objects.get_or_create(user=instance)
            
            # บันทึก Student ID
            if 'student_id' in profile_raw_data:
                profile.student_id = profile_raw_data['student_id']
                
            # บันทึก Major
            if 'major' in profile_raw_data:
                profile.major = profile_raw_data['major']
                
            profile.save()
        
        return instance

#================================#
#   Student-Facing Serializers   #
#================================#

class InstitutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Institution
        fields = ['id', 'name']

class CurriculumSerializer(serializers.ModelSerializer):
    class Meta:
        model = Curriculum
        fields = ['id', 'name']

class SourceCourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = SourceCourse
        fields = ['id', 'course_code', 'course_name_th', 'credits']

class RequestItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RequestItem
        fields = ['original_course', 'grade']

class TransferRequestCreateSerializer(serializers.ModelSerializer):
    # เปลี่ยน items เป็น JSONField เพื่อรับ string จาก FormData ได้
    items = serializers.JSONField(write_only=True) 
    evidence_file = serializers.ImageField(required=False) # รับไฟล์

    class Meta:
        model = TransferRequest
        fields = ['id', 'target_curriculum', 'items', 'evidence_file']

    def create(self, validated_data):
        items_raw = validated_data.pop('items')
        
        # ถ้าส่งมาเป็น String (จาก FormData) ให้แปลงเป็น List
        if isinstance(items_raw, str):
            items_data = json.loads(items_raw)
        else:
            items_data = items_raw

        # สร้างคำร้องพร้อมไฟล์แนบ
        transfer_request = TransferRequest.objects.create(**validated_data)
        
        # สร้างรายการวิชา
        for item_data in items_data:
            RequestItem.objects.create(
                transfer_request=transfer_request,
                original_course_id=item_data['original_course'],
                grade=item_data['grade']
            )
            
        return transfer_request

#================================#
#   Faculty-Facing Serializers   #
#================================#

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True, source='userprofile')
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'profile']

class TargetCourseDetailSerializer(serializers.ModelSerializer):
    curriculum = CurriculumSerializer(read_only=True)
    class Meta:
        model = TargetCourse
        fields = ['id', 'course_code', 'course_name_th', 'credits', 'curriculum','course_description']

class SourceCourseDetailSerializer(serializers.ModelSerializer):
    institution = InstitutionSerializer(read_only=True)
    class Meta:
        model = SourceCourse
        fields = ['id', 'course_code', 'course_name_th', 'credits', 'institution','course_description']

class AIComparisonResultSerializer(serializers.ModelSerializer):
    suggested_course = TargetCourseDetailSerializer(read_only=True)
    class Meta:
        model = AIComparisonResult
        fields = ['suggested_course', 'similarity_score', 'explanation']

class RequestItemDetailSerializer(serializers.ModelSerializer):
    original_course = SourceCourseDetailSerializer(read_only=True)
    aicomparisonresult = AIComparisonResultSerializer(read_only=True)
    class Meta:
        model = RequestItem
        # ลบบรรทัดซ้ำออก เหลืออันที่ครบถ้วนไว้
        fields = ['id', 'original_course', 'grade', 'status', 'aicomparisonresult']

class TransferRequestListSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)
    target_curriculum = CurriculumSerializer(read_only=True)
    items = RequestItemDetailSerializer(many=True, source='requestitem_set', read_only=True)
    class Meta:
        model = TransferRequest
        fields = ['id', 'student', 'status', 'created_at', 'target_curriculum', 'items','evidence_file']

class TransferRequestStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransferRequest
        fields = ['status']

class RequestItemStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RequestItem
        fields = ['status'] # อนุญาตให้อัปเดตแค่ status เท่านั้น

class TargetCourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = TargetCourse
        # ใส่ field ให้ครบตามที่ต้องการแก้ไข
        fields = ['id', 'curriculum', 'course_code', 'course_name_th', 'credits', 'course_description']

class SourceCourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = SourceCourse
        # ต้องเพิ่ม 'institution' และ 'course_description' เข้าไป
        fields = ['id', 'course_code', 'course_name_th', 'credits', 'institution', 'course_description']