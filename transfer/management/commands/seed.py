# transfer/management/commands/seed.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from transfer.models import Institution, Curriculum, SourceCourse, TargetCourse

class Command(BaseCommand):
    help = 'Seeds the database with initial data'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Seeding database...'))

        # --- Clear existing data ---
        User.objects.filter(is_superuser=False).delete()
        Institution.objects.all().delete()
        Curriculum.objects.all().delete()
        SourceCourse.objects.all().delete()
        TargetCourse.objects.all().delete()

        # --- Create Users ---
        User.objects.create_user(username='student1', password='password123')
        User.objects.create_user(username='faculty1', password='password123')

        # --- Create Target Data (Our Institution) ---
        target_curriculum = Curriculum.objects.create(name='วิศวกรรมคอมพิวเตอร์ 2567')
        TargetCourse.objects.create(
            curriculum=target_curriculum,
            course_code='CS211',
            course_name_th='โครงสร้างข้อมูลและอัลกอริทึม',
            credits=3,
            course_description='ศึกษาโครงสร้างข้อมูลพื้นฐาน เช่น ลิงก์ลิสต์ สแต็ก คิว ทรี และกราฟ รวมถึงอัลกอริทึมในการจัดการข้อมูล'
        )
        TargetCourse.objects.create(
            curriculum=target_curriculum,
            course_code='CS213',
            course_name_th='การเขียนโปรแกรมเชิงวัตถุ',
            credits=3,
            course_description='แนวคิดการเขียนโปรแกรมเชิงวัตถุ คลาส อ็อบเจกต์ การสืบทอดคุณสมบัติ การพ้องรูป และการออกแบบเบื้องต้น'
        )

        # --- Create Source Data (External Institutions) ---
        source_institution = Institution.objects.create(name='มหาวิทยาลัยต้นทางวิทยา')
        SourceCourse.objects.create(
            institution=source_institution,
            course_code='COMP101',
            course_name_th='Data Structures',
            credits=3,
            course_description='Basic data structures including linked lists, stacks, queues, trees, and graphs. Introduction to algorithms.'
        )
        SourceCourse.objects.create(
            institution=source_institution,
            course_code='COMP102',
            course_name_th='Object-Oriented Programming',
            credits=3,
            course_description='Fundamental concepts of OOP: classes, objects, inheritance, and polymorphism.'
        )

        self.stdout.write(self.style.SUCCESS('Database seeded successfully!'))