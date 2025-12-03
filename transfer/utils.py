# transfer/utils.py
from django.conf import settings
from django.contrib.staticfiles.finders import find
from django.utils.functional import SimpleLazyObject

def django_url_fetcher(url, *args, **kwargs):
    """
    Custom URL Fetcher for WeasyPrint to load local static files correctly.
    """
    # ถ้า URL ขึ้นต้นด้วย STATIC_URL (เช่น /static/...)
    if url.startswith(settings.STATIC_URL):
        # ตัดส่วน STATIC_URL ออก เพื่อหาชื่อไฟล์จริง
        url = url.replace(settings.STATIC_URL, '', 1)
        
        # ใช้ฟังก์ชัน find ของ Django เพื่อหา path เต็มของไฟล์ในเครื่อง
        file_path = find(url)
        
        if file_path:
            # ส่งคืนเนื้อหาไฟล์และ mimetype
            with open(file_path, 'rb') as f:
                return dict(string=f.read(), mime_type='image/png') # สมมติว่าเป็น png (WeasyPrint ฉลาดพอที่จะเดาชนิดไฟล์ได้)

    # ถ้าไม่ใช่ static file ให้ใช้ default fetcher ของ WeasyPrint
    from weasyprint import default_url_fetcher
    return default_url_fetcher(url, *args, **kwargs)