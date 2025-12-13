# transfer/models.py
from django.db import models
from django.contrib.auth.models import User

# --- ส่วนข้อมูลเป้าหมาย (ที่เราจะเทียบโอนเข้า) ---

class Curriculum(models.Model):
    name = models.CharField("ชื่อหลักสูตร", max_length=255)
    
    class Meta:
        verbose_name = "หลักสูตร (เป้าหมาย)"
        verbose_name_plural = "1. หลักสูตร (เป้าหมาย)"
        ordering = ['name']

    def __str__(self):
        return self.name

class TargetCourse(models.Model):
    curriculum = models.ForeignKey(Curriculum, on_delete=models.CASCADE, verbose_name="หลักสูตร")
    course_code = models.CharField("รหัสวิชา", max_length=50)
    course_name_th = models.CharField("ชื่อวิชา (ไทย)", max_length=255)
    credits = models.IntegerField("หน่วยกิต")
    course_description = models.TextField("คำอธิบายรายวิชา")

    class Meta:
        verbose_name = "รายวิชาในหลักสูตร"
        verbose_name_plural = "1.1 รายวิชาในหลักสูตร (เป้าหมาย)"
        ordering = ['curriculum', 'course_code']

    def __str__(self):
        return f"{self.course_code} - {self.course_name_th}"

# --- ส่วนข้อมูลต้นทาง (จากสถาบันเก่า) ---

class Institution(models.Model):
    name = models.CharField("ชื่อสถาบัน", max_length=255)
    # เพิ่ม is_home_institution เพื่อแยกสถาบันเราออกจากสถาบันอื่น
    is_home_institution = models.BooleanField("เป็นสถาบันหลัก (สำหรับหลักสูตรเป้าหมาย)", default=False)

    class Meta:
        verbose_name = "สถาบัน (ต้นทาง)"
        verbose_name_plural = "2. สถาบัน (ต้นทาง)"
        ordering = ['name']

    def __str__(self):
        return self.name

class SourceCourse(models.Model):
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, verbose_name="สถาบัน")
    course_code = models.CharField("รหัสวิชา", max_length=50)
    course_name_th = models.CharField("ชื่อวิชา (ไทย)", max_length=255)
    credits = models.IntegerField("หน่วยกิต")
    course_description = models.TextField("คำอธิบายรายวิชา")

    class Meta:
        verbose_name = "รายวิชาสถาบัน"
        verbose_name_plural = "2.1 รายวิชาสถาบัน (ต้นทาง)"
        ordering = ['institution', 'course_code']

    def __str__(self):
        return f"{self.course_code} - {self.course_name_th}"

# --- ส่วนของคำร้อง ---

class TransferRequest(models.Model):
    STATUS_CHOICES = [('pending', 'รอตรวจสอบ'), ('approved', 'อนุมัติแล้ว'), ('rejected', 'ปฏิเสธ')]
    student = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="นักศึกษา")
    status = models.CharField("สถานะ", max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField("วันที่ยื่นคำร้อง", auto_now_add=True)
    target_curriculum = models.ForeignKey(Curriculum, on_delete=models.SET_NULL, null=True, verbose_name="หลักสูตรเป้าหมาย")
    is_viewed_by_student = models.BooleanField(default=False)

    evidence_file = models.ImageField("หลักฐานประกอบ (รูปภาพ)", upload_to='evidence/', null=True, blank=True)

    class Meta:
        verbose_name = "คำร้องเทียบโอน"
        verbose_name_plural = "3. คำร้องเทียบโอน"
        ordering = ['-created_at']

    def __str__(self):
        if self.target_curriculum:
            return f"คำร้องจาก {self.student.username} (เข้า {self.target_curriculum.name})"
        return f"คำร้องจาก {self.student.username}"

class RequestItem(models.Model):
    STATUS_CHOICES = [('pending', 'รอตรวจสอบ'), ('approved', 'อนุมัติแล้ว'), ('rejected', 'ปฏิเสธ')]
    transfer_request = models.ForeignKey(TransferRequest, on_delete=models.CASCADE)
    original_course = models.ForeignKey(SourceCourse, on_delete=models.CASCADE, verbose_name="รายวิชาเดิม")
    grade = models.CharField("เกรดที่ได้รับ", max_length=5)
    status = models.CharField("สถานะ", max_length=10, choices=STATUS_CHOICES, default='pending')

    class Meta:
        verbose_name = "รายการวิชาในคำร้อง"
        verbose_name_plural = "รายการวิชาในคำร้อง"

    def __str__(self):
        return f"{self.original_course.course_code} for request {self.transfer_request.id}"

    # --- เพิ่มฟังก์ชัน save อัตโนมัติ ---
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        items = self.transfer_request.requestitem_set.all()
        item_statuses = {item.status for item in items}
        
        if 'pending' not in item_statuses:
            if 'rejected' in item_statuses:
                self.transfer_request.status = 'rejected'
            else:
                self.transfer_request.status = 'approved'
            self.transfer_request.save()

class AIComparisonResult(models.Model):
    request_item = models.OneToOneField(RequestItem, on_delete=models.CASCADE)
    suggested_course = models.ForeignKey(TargetCourse, on_delete=models.CASCADE, verbose_name="รายวิชาที่แนะนำ")
    similarity_score = models.FloatField("คะแนนความสอดคล้อง")
    explanation = models.TextField("เหตุผลประกอบ", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "ผลการเปรียบเทียบ AI"
        verbose_name_plural = "4. ผลการเปรียบเทียบ AI"
        ordering = ['-created_at']

    def __str__(self):
        score_percent = round(self.similarity_score * 100, 2)
        return f"Match: '{self.request_item.original_course}' -> '{self.suggested_course}' ({score_percent}%)"

# --- ส่วนของโปรไฟล์ผู้ใช้ ---

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    student_id = models.CharField("รหัสนักศึกษา", max_length=20, unique=True, null=True, blank=True)
    major = models.CharField("สาขาวิชา", max_length=255, null=True, blank=True)

    class Meta:
        verbose_name = "โปรไฟล์ผู้ใช้"
        verbose_name_plural = "5. โปรไฟล์ผู้ใช้"

    def __str__(self):
        return self.user.username