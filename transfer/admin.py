# transfer/admin.py
from django.contrib import admin
from .models import (
    Curriculum, 
    TargetCourse, 
    Institution, 
    SourceCourse,
    TransferRequest,
    RequestItem,
    AIComparisonResult
)

# --- ตั้งค่าส่วนจัดการหลักสูตรเป้าหมาย ---
class TargetCourseInline(admin.TabularInline):
    model = TargetCourse
    extra = 1

@admin.register(Curriculum)
class CurriculumAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)
    inlines = [TargetCourseInline]

# --- ตั้งค่าส่วนจัดการสถาบันต้นทาง ---
class SourceCourseInline(admin.TabularInline):
    model = SourceCourse
    extra = 1

@admin.register(Institution)
class InstitutionAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)
    inlines = [SourceCourseInline]

# --- ลงทะเบียน Model ที่เหลือ ---
admin.site.register(TransferRequest)
admin.site.register(RequestItem)
admin.site.register(AIComparisonResult)