import psycopg2
import sys

# --- ใช้ข้อมูลเดียวกับใน settings.py เป๊ะๆ ---
DB_NAME = "credit_transfer_db"
DB_USER = "credit_transfer_user"
DB_PASS = "1234"  # <-- ใส่รหัสผ่านที่คุณตั้งไว้
DB_HOST = "localhost"
DB_PORT = "5433"
# -----------------------------------------

try:
    print("กำลังพยายามเชื่อมต่อฐานข้อมูล PostgreSQL...")
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        host=DB_HOST,
        port=DB_PORT
    )
    print("✅✅✅ การเชื่อมต่อสำเร็จ! ✅✅✅")
    conn.close()
except psycopg2.OperationalError as e:
    print("❌❌❌ การเชื่อมต่อล้มเหลว! ❌❌❌")
    print(f"Error: {e}")
    sys.exit(1) # ออกจากโปรแกรมพร้อมแจ้งว่ามี error
except Exception as e:
    print(f"เกิดข้อผิดพลาดที่ไม่คาดคิด: {e}")
    sys.exit(1)

print("\nสคริปต์ทำงานเสร็จสิ้น")